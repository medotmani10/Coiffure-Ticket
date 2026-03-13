-- ============================================================
-- Fix: recreate create_ticket RPC to include p_car_type AND 5 AM reset logic
-- Run this in Supabase SQL Editor to fix the 404 Not Found error
-- ============================================================

-- Drop the old functions to avoid signature conflicts
DROP FUNCTION IF EXISTS public.create_ticket(uuid, text, text, integer, text);
DROP FUNCTION IF EXISTS public.create_ticket(uuid, text, text, integer, text, text);

CREATE OR REPLACE FUNCTION public.create_ticket(
    p_shop_id    UUID,
    p_name       TEXT,
    p_phone      TEXT,
    p_people     INTEGER,
    p_session_id TEXT,
    p_car_type   TEXT DEFAULT NULL
)
RETURNS SETOF public.tickets
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_next_num   INTEGER;
    v_last_reset TIMESTAMPTZ;
    v_logical_start TIMESTAMPTZ;
    v_new_ticket public.tickets;
BEGIN
    -- Advisory lock: ensures sequential ticket numbers per shop
    PERFORM pg_advisory_xact_lock(hashtext(p_shop_id::text));

    -- Check shop is open
    IF NOT EXISTS (SELECT 1 FROM public.shops WHERE id = p_shop_id AND is_open = true) THEN
        RAISE EXCEPTION 'shop_closed';
    END IF;

    -- Prevent duplicate active tickets per session (non-manual sessions only)
    IF NOT (p_session_id LIKE 'manual_%') AND EXISTS (
        SELECT 1 FROM public.tickets
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
    INTO v_last_reset FROM public.shops WHERE id = p_shop_id;

    -- The active boundary is whichever is later: logical 5 AM start or manual reset
    IF v_last_reset < v_logical_start THEN
        v_last_reset := v_logical_start;
    END IF;

    -- Compute next sequential ticket number from tickets created after this boundary
    SELECT COALESCE(MAX(ticket_number), 0) + 1
    INTO v_next_num FROM public.tickets
    WHERE shop_id   = p_shop_id
      AND created_at >= v_last_reset;

    -- Insert the new ticket with p_car_type
    INSERT INTO public.tickets (
        shop_id, customer_name,
        phone_number, people_count, ticket_number,
        user_session_id, status, car_type
    ) VALUES (
        p_shop_id, p_name,
        p_phone, p_people, v_next_num,
        p_session_id, 'waiting', p_car_type
    ) RETURNING * INTO v_new_ticket;

    RETURN NEXT v_new_ticket;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.create_ticket(UUID, TEXT, TEXT, INTEGER, TEXT, TEXT) TO anon, authenticated;

-- Notify PostgREST to reload the schema cache so the 404 disappears immediately
NOTIFY pgrst, 'reload schema';
