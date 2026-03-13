-- ============================================================
-- Update daily ticket reset from midnight to 5 AM
-- Run this in Supabase SQL Editor
-- ============================================================

-- Update the create_ticket function to use 5 AM reset
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

    -- Get last reset (for daily numbering at 5 AM)
    SELECT COALESCE(last_reset_at, 
        CASE 
            WHEN EXTRACT(HOUR FROM now()) >= 5 THEN date_trunc('day', now()) + INTERVAL '5 hours'
            ELSE date_trunc('day', now()) - INTERVAL '19 hours'
        END
    )
    INTO v_last_reset FROM shops WHERE id = p_shop_id;

    -- Check if we need to reset to today's 5 AM
    IF v_last_reset < (date_trunc('day', now()) + INTERVAL '5 hours') THEN
        v_last_reset := date_trunc('day', now()) + INTERVAL '5 hours';
    END IF;

    -- Compute next sequential ticket number from today's tickets (since 5 AM)
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

-- Optional: Update existing shops' last_reset_at to use 5 AM logic
UPDATE shops 
SET last_reset_at = 
    CASE 
        WHEN EXTRACT(HOUR FROM now()) >= 5 THEN date_trunc('day', now()) + INTERVAL '5 hours'
        ELSE date_trunc('day', now()) - INTERVAL '19 hours'
    END
WHERE last_reset_at IS NULL;