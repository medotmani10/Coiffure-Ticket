-- ─── PUSH SUBSCRIPTIONS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id     UUID        NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    subscription  JSONB       NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    -- Ensure a user doesn't subscribe multiple times for the exact same ticket
    UNIQUE(ticket_id, subscription)
);

-- Index for fast lookup by ticket
CREATE INDEX IF NOT EXISTS idx_push_subs_ticket ON push_subscriptions(ticket_id);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ── Policies ──
-- Shop owners can see subscriptions for tickets in their shop
DROP POLICY IF EXISTS "Owner can read push subscriptions" ON push_subscriptions;
CREATE POLICY "Owner can read push subscriptions" ON push_subscriptions
    FOR SELECT USING (
        ticket_id IN (
            SELECT t.id FROM tickets t
            JOIN shops s ON t.shop_id = s.id
            WHERE s.owner_id = auth.uid()
        )
    );

-- Anon users can insert a subscription if they know the ticket_id
-- (since tickets are secured by session_id, knowing ticket_id + session matches is enough)
DROP POLICY IF EXISTS "Anon can insert push subscription" ON push_subscriptions;
CREATE POLICY "Anon can insert push subscription" ON push_subscriptions
    FOR INSERT WITH CHECK (
        -- Basic check: they must provide a valid ticket_id
        ticket_id IN (SELECT id FROM tickets)
    );

GRANT SELECT, INSERT ON push_subscriptions TO anon, authenticated;
