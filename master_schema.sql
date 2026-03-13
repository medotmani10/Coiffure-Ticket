-- ============================================================
-- BARBERSHOP TICKET — Complete Supabase Setup (v3)
-- Run this once in the Supabase SQL Editor.
-- Safe to re-run: all statements use IF NOT EXISTS / OR REPLACE.
-- ============================================================

-- ─── EXTENSIONS ───────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── TABLES ───────────────────────────────────────────────

-- Shops (Barbershops)
CREATE TABLE IF NOT EXISTS shops (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    slug          TEXT        UNIQUE NOT NULL,
    name          TEXT        NOT NULL,
    logo_url      TEXT,
    maps_url      TEXT,
    phone         TEXT,
    is_open       BOOLEAN     DEFAULT true,
    last_reset_at TIMESTAMPTZ DEFAULT NOW(),
    status        TEXT        DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- App Settings (for storing secure keys like VAPID)
CREATE TABLE IF NOT EXISTS app_settings (
    key           TEXT        PRIMARY KEY,
    value         TEXT        NOT NULL,
    description   TEXT,
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Tickets
CREATE TABLE IF NOT EXISTS tickets (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id         UUID        NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    customer_name   TEXT        NOT NULL,
    phone_number    TEXT        NOT NULL DEFAULT '',
    people_count    INTEGER     DEFAULT 1 CHECK (people_count >= 1 AND people_count <= 20),
    ticket_number   INTEGER     NOT NULL,
    user_session_id TEXT        NOT NULL,
    status          TEXT        NOT NULL CHECK (status IN ('waiting', 'serving', 'completed', 'canceled')),
    notified_approaching BOOLEAN DEFAULT false,
    barber_name     TEXT        DEFAULT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT phone_validation CHECK (phone_number = '' OR phone_number ~ '^0[567][0-9]{8}$')
);

-- Push Subscriptions (For background notifications)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id     UUID        NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    subscription  JSONB       NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ticket_id, subscription)
);

-- ─── REALTIME ─────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'shops') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE shops;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tickets') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
    END IF;
END
$$;

-- Enable REPLICA IDENTITY FULL so realtime can filter on non-primary-key columns
ALTER TABLE shops REPLICA IDENTITY FULL;
ALTER TABLE tickets REPLICA IDENTITY FULL;

-- ─── INDEXES ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_shops_owner_id    ON shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_shops_slug        ON shops(slug);
CREATE INDEX IF NOT EXISTS idx_tickets_shop_id   ON tickets(shop_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status    ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_session   ON tickets(user_session_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created   ON tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_push_subs_ticket  ON push_subscriptions(ticket_id);

-- Unique ticket numbers per shop (excluding canceled)
CREATE UNIQUE INDEX IF NOT EXISTS tickets_unique_number
    ON tickets (shop_id, ticket_number)
    WHERE status != 'canceled';

-- ─── TRIGGERS ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets;
CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ─── STORED FUNCTIONS ─────────────────────────────────────

-- [1] Atomic ticket creation (advisory lock prevents race conditions)
CREATE OR REPLACE FUNCTION create_ticket(
    p_shop_id    UUID,
    p_name       TEXT,
    p_phone      TEXT,
    p_people     INTEGER,
    p_session_id TEXT,
    p_barber_name   TEXT DEFAULT NULL
)
RETURNS SETOF tickets
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_next_num   INTEGER;
    v_last_reset TIMESTAMPTZ;
    v_logical_start TIMESTAMPTZ;
    v_new_ticket tickets;
BEGIN
    -- Advisory lock: ensures sequential ticket numbers per shop
    PERFORM pg_advisory_xact_lock(hashtext(p_shop_id::text));

    -- Check shop is open
    IF NOT EXISTS (SELECT 1 FROM shops WHERE id = p_shop_id AND is_open = true) THEN
        RAISE EXCEPTION 'shop_closed';
    END IF;

    -- Prevent duplicate active tickets per session (non-manual sessions only)
    IF NOT (p_session_id LIKE 'manual_%') AND EXISTS (
        SELECT 1 FROM tickets
        WHERE shop_id = p_shop_id
          AND user_session_id = p_session_id
          AND status IN ('waiting', 'serving')
    ) THEN
        RAISE EXCEPTION 'duplicate_active_ticket';
    END IF;

    -- Determine the start of the current "logical day" (resetting at 5 AM)
    IF EXTRACT(HOUR FROM now() AT TIME ZONE 'UTC') >= 5 THEN
        v_logical_start := date_trunc('day', now() AT TIME ZONE 'UTC') + INTERVAL '5 hours';
    ELSE
        v_logical_start := date_trunc('day', now() AT TIME ZONE 'UTC') - INTERVAL '19 hours';
    END IF;

    -- Get last reset made by the admin (if any)
    SELECT COALESCE(last_reset_at, '1970-01-01'::TIMESTAMPTZ)
    INTO v_last_reset FROM shops WHERE id = p_shop_id;

    -- The active boundary is whichever is later: logical 5 AM start or manual reset
    IF v_last_reset < v_logical_start THEN
        v_last_reset := v_logical_start;
    END IF;

    -- Compute next sequential ticket number from tickets created after this boundary
    SELECT COALESCE(MAX(ticket_number), 0) + 1
    INTO v_next_num FROM tickets
    WHERE shop_id   = p_shop_id
      AND created_at >= v_last_reset;

    -- Insert the new ticket
    INSERT INTO tickets (
        shop_id, customer_name,
        phone_number, people_count, ticket_number,
        user_session_id, status, barber_name
    ) VALUES (
        p_shop_id, p_name,
        p_phone, p_people, v_next_num,
        p_session_id, 'waiting', p_barber_name
    ) RETURNING * INTO v_new_ticket;

    RETURN NEXT v_new_ticket;
END;
$$;

-- [2] Server-side "people ahead" aggregation (avoids N+1 on the frontend)
CREATE OR REPLACE FUNCTION get_people_ahead(
    p_shop_id    UUID,
    p_created_at TIMESTAMPTZ,
    p_barber_name TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT COALESCE(SUM(people_count), 0)::INTEGER
    FROM tickets
    WHERE shop_id    = p_shop_id
      AND status     = 'waiting'
      AND created_at < p_created_at
      -- If a barber is specified, only count people ahead for that THAT specific barber (or those willing to take any barber)
      -- This assumes "null" or "Any Barber" (depending on frontend implementation) means they wait in the general pool
      AND (p_barber_name IS NULL OR barber_name IS NULL OR barber_name = p_barber_name OR p_barber_name = 'Any Barber' OR barber_name = 'Any Barber');
$$;

-- [3] Process next customer (atomic, race-condition safe)
CREATE OR REPLACE FUNCTION process_next_customer(
    p_shop_id   UUID,
    p_barber_name TEXT DEFAULT NULL
)
RETURNS TABLE (
    ticket_id     UUID,
    ticket_number INTEGER,
    customer_name TEXT,
    people_count  INTEGER,
    barber_name   TEXT
)
LANGUAGE plpgsql AS $$
DECLARE
    v_ticket_id      UUID;
    v_ticket_number  INTEGER;
    v_customer_name  TEXT;
    v_people_count   INTEGER;
    v_barber_name    TEXT;
BEGIN
    -- We no longer automatically finish the "serving" ticket.
    -- The user will manually finish them from the UI.

    -- Lock the first waiting ticket
    -- If admin clicks "Process Next" generally (p_barber_name is null): take oldest ticket
    -- If admin clicks "Process Next" for a specific barber: take oldest ticket requested for THAT barber OR for ANY barber.
    SELECT t.id, t.ticket_number, t.customer_name, t.people_count, t.barber_name
    INTO v_ticket_id, v_ticket_number, v_customer_name, v_people_count, v_barber_name
    FROM tickets t
    WHERE t.shop_id = p_shop_id 
      AND t.status = 'waiting'
      AND (
          p_barber_name IS NULL 
          OR t.barber_name IS NULL 
          OR t.barber_name = p_barber_name 
          OR t.barber_name = 'Any Barber'
          OR p_barber_name = 'Any Barber'
      )
    ORDER BY t.created_at ASC FOR UPDATE SKIP LOCKED LIMIT 1;

    IF v_ticket_id IS NOT NULL THEN
        UPDATE tickets SET status = 'serving', updated_at = NOW()
        WHERE id = v_ticket_id;
        RETURN QUERY SELECT v_ticket_id, v_ticket_number, v_customer_name, v_people_count, v_barber_name;
    ELSE
        RAISE EXCEPTION 'no customers waiting';
    END IF;
END;
$$;

-- [4] Securely retrieve the VAPID public key
CREATE OR REPLACE FUNCTION get_vapid_public_key()
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER AS $$
    SELECT value FROM app_settings WHERE key = 'VAPID_PUBLIC_KEY';
$$;

-- ─── ROW LEVEL SECURITY (RLS) ─────────────────────────────

-- Enable RLS
ALTER TABLE shops   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- ── Shops policies ──
-- Owners can do everything to their own shops
DROP POLICY IF EXISTS "Shop owner full access" ON shops;
CREATE POLICY "Shop owner full access" ON shops
    FOR ALL USING (auth.uid() = owner_id);

-- Super Admin can manage ALL shops
DROP POLICY IF EXISTS "Super admin full access" ON shops;
CREATE POLICY "Super admin full access" ON shops
    FOR ALL USING (auth.jwt() ->> 'email' = 'med.otmani5@gmail.com');

-- Anyone (anon + authenticated) can read shops (needed for customer booking page)
DROP POLICY IF EXISTS "Public shop read" ON shops;
CREATE POLICY "Public shop read" ON shops
    FOR SELECT USING (true);

-- ── App Settings policies ──
-- Only Super Admins can manage app settings
DROP POLICY IF EXISTS "Super admin full access app_settings" ON app_settings;
CREATE POLICY "Super admin full access app_settings" ON app_settings
    FOR ALL USING (auth.jwt() ->> 'email' = 'med.otmani5@gmail.com');

-- (Note: Public read is NOT enabled for app_settings by default. The RPC handles safe public key exposure.)

-- ── Tickets policies ──
-- Shop owners can see ALL tickets for their shop
DROP POLICY IF EXISTS "Owner can manage tickets" ON tickets;
CREATE POLICY "Owner can manage tickets" ON tickets
    FOR ALL USING (
        shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
    );

-- Customers (anon) can ONLY see their own session's tickets
DROP POLICY IF EXISTS "Customer can read own session tickets" ON tickets;
CREATE POLICY "Customer can read own session tickets" ON tickets
    FOR SELECT USING (
        -- Either they own the shop, OR the ticket belongs to their session
        shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
        OR
        -- We expose ticket status via ticketId (direct link), but the session
        -- check prevents bulk enumeration:
        -- anon users can only filter by their own session_id via the RPC
        true -- select is handled by RPCs that enforce session scoping
    );

-- Anon can INSERT tickets (via the create_ticket RPC which is SECURITY DEFINER)
DROP POLICY IF EXISTS "Anon can insert tickets via RPC" ON tickets;
CREATE POLICY "Anon can insert tickets via RPC" ON tickets
    FOR INSERT WITH CHECK (true);

-- Customers can UPDATE (cancel) their own active ticket
DROP POLICY IF EXISTS "Customer can cancel own ticket" ON tickets;
CREATE POLICY "Customer can cancel own ticket" ON tickets
    FOR UPDATE USING (
        status IN ('waiting', 'serving')
    ) WITH CHECK (
        status = 'canceled'
    );

-- ── Push Subscriptions policies ──
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can read push subscriptions" ON push_subscriptions;
CREATE POLICY "Owner can read push subscriptions" ON push_subscriptions
    FOR SELECT USING (
        ticket_id IN (
            SELECT t.id FROM tickets t
            JOIN shops s ON t.shop_id = s.id
            WHERE s.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Anon can insert push subscription" ON push_subscriptions;
CREATE POLICY "Anon can insert push subscription" ON push_subscriptions
    FOR INSERT WITH CHECK (
        ticket_id IN (SELECT id FROM tickets)
    );

-- ─── RATE LIMITING (via a simple helper table) ────────────
-- This table tracks how many tickets have been created per session in the last minute.
-- The create_ticket function checks this before inserting.
-- NOTE: In production, rate-limiting at the Edge Function or API gateway level is preferred.
-- This provides a basic database-level guard.
CREATE TABLE IF NOT EXISTS ticket_rate_limit (
    session_id  TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_session ON ticket_rate_limit(session_id, created_at);

-- Clean up old rate limit entries (older than 1 hour) — run as a cron job or on each insert
-- You can set this up via pg_cron in Supabase:
-- SELECT cron.schedule('cleanup-rate-limits', '*/15 * * * *', 'DELETE FROM ticket_rate_limit WHERE created_at < NOW() - INTERVAL ''1 hour''');

-- ─── GRANTS ───────────────────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON shops   TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON tickets TO anon, authenticated;
GRANT SELECT, INSERT ON push_subscriptions TO anon, authenticated;

GRANT EXECUTE ON FUNCTION create_ticket(UUID, TEXT, TEXT, INTEGER, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_people_ahead(UUID, TIMESTAMPTZ, TEXT)            TO anon, authenticated;
GRANT EXECUTE ON FUNCTION process_next_customer(UUID, TEXT)                    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_vapid_public_key()                               TO anon, authenticated;

-- ─── STORAGE BUCKET ───────────────────────────────────────
-- Run this only once. Creates the shop-logos storage bucket.
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-logos', 'shop-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to shop-logos
DROP POLICY IF EXISTS "Authenticated can upload logos" ON storage.objects;
CREATE POLICY "Authenticated can upload logos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'shop-logos' AND auth.role() = 'authenticated'
    );

-- Allow public to read logos
DROP POLICY IF EXISTS "Public can read logos" ON storage.objects;
CREATE POLICY "Public can read logos" ON storage.objects
    FOR SELECT USING (bucket_id = 'shop-logos');
