-- 1. Drop existing function to recreate it clean
DROP FUNCTION IF EXISTS process_next_customer(UUID);

-- 2. Recreate without the "Complete currently-serving ticket" block
CREATE OR REPLACE FUNCTION process_next_customer(
    p_shop_id   UUID
)
RETURNS TABLE (
    ticket_id     UUID,
    ticket_number INTEGER,
    customer_name TEXT,
    people_count  INTEGER
)
LANGUAGE plpgsql AS $$
DECLARE
    v_ticket_id      UUID;
    v_ticket_number  INTEGER;
    v_customer_name  TEXT;
    v_people_count   INTEGER;
BEGIN
    -- We no longer automatically finish the "serving" ticket.
    -- The user will manually finish them from the UI.

    -- Lock the first waiting ticket
    SELECT tickets.id, tickets.ticket_number, tickets.customer_name, tickets.people_count
    INTO v_ticket_id, v_ticket_number, v_customer_name, v_people_count
    FROM tickets
    WHERE shop_id = p_shop_id AND status = 'waiting'
    ORDER BY created_at ASC FOR UPDATE SKIP LOCKED LIMIT 1;

    IF v_ticket_id IS NOT NULL THEN
        UPDATE tickets SET status = 'serving', updated_at = NOW()
        WHERE id = v_ticket_id;
        RETURN QUERY SELECT v_ticket_id, v_ticket_number, v_customer_name, v_people_count;
    ELSE
        RAISE EXCEPTION 'no customers waiting';
    END IF;
END;
$$;
