-- ============================================================
-- Fix daily ticket reset logic at 5 AM
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION create_ticket(
    p_shop_id    UUID,
    p_name       TEXT,
    p_phone      TEXT,
    p_people     INTEGER,
    p_session_id TEXT
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
    IF EXTRACT(HOUR FROM now()) >= 5 THEN
        v_logical_start := date_trunc('day', now()) + INTERVAL '5 hours';
    ELSE
        v_logical_start := date_trunc('day', now()) - INTERVAL '19 hours';
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
        user_session_id, status
    ) VALUES (
        p_shop_id, p_name,
        p_phone, p_people, v_next_num,
        p_session_id, 'waiting'
    ) RETURNING * INTO v_new_ticket;

    RETURN NEXT v_new_ticket;
END;
$$;
