-- Drop the old functions so we can recreate them with the new return type (including ticket_code)
DROP FUNCTION IF EXISTS public.barber_next_ticket(UUID);
DROP FUNCTION IF EXISTS public.barber_call_specific_ticket(UUID, UUID);

-- 1. Update barber_next_ticket to return ticket_code
CREATE OR REPLACE FUNCTION public.barber_next_ticket(
    p_shop_id UUID
)
RETURNS TABLE (
    ticket_id UUID,
    ticket_number INTEGER,
    ticket_code TEXT,
    customer_name TEXT,
    people_count INTEGER,
    barber_name TEXT,
    barber_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_profile public.profiles;
    v_ticket public.tickets;
BEGIN
    SELECT * INTO v_profile
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'barber'
      AND p.is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'not_barber';
    END IF;

    IF v_profile.shop_id <> p_shop_id THEN
        RAISE EXCEPTION 'wrong_shop';
    END IF;

    SELECT * INTO v_ticket
    FROM public.tickets t
    WHERE t.shop_id = p_shop_id
      AND t.status = 'serving'
      AND t.barber_id = v_profile.id
    ORDER BY t.updated_at DESC
    LIMIT 1;

    IF FOUND THEN
        RETURN QUERY SELECT v_ticket.id, v_ticket.ticket_number, v_ticket.ticket_code, v_ticket.customer_name, v_ticket.people_count, v_ticket.barber_name, v_ticket.barber_id;
        RETURN;
    END IF;

    SELECT * INTO v_ticket
    FROM public.tickets t
    WHERE t.shop_id = p_shop_id
      AND t.status = 'waiting'
      AND t.barber_id = v_profile.id
    ORDER BY t.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'no_waiting_ticket';
    END IF;

    UPDATE public.tickets
    SET status = 'serving',
        barber_id = v_profile.id,
        barber_name = COALESCE(v_profile.full_name, public.tickets.barber_name),
        updated_at = NOW()
    WHERE id = v_ticket.id;

    SELECT * INTO v_ticket FROM public.tickets WHERE id = v_ticket.id;

    RETURN QUERY SELECT v_ticket.id, v_ticket.ticket_number, v_ticket.ticket_code, v_ticket.customer_name, v_ticket.people_count, v_ticket.barber_name, v_ticket.barber_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.barber_next_ticket(UUID) TO authenticated;

-- 2. Create barber_call_specific_ticket
CREATE OR REPLACE FUNCTION public.barber_call_specific_ticket(
    p_shop_id UUID,
    p_ticket_id UUID
)
RETURNS TABLE (
    ticket_id UUID,
    ticket_number INTEGER,
    ticket_code TEXT,
    customer_name TEXT,
    people_count INTEGER,
    barber_name TEXT,
    barber_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_profile public.profiles;
    v_ticket public.tickets;
BEGIN
    -- Verify the caller is an active barber
    SELECT * INTO v_profile
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'barber'
      AND p.is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'not_barber';
    END IF;

    IF v_profile.shop_id <> p_shop_id THEN
        RAISE EXCEPTION 'wrong_shop';
    END IF;

    -- Check if they are already serving someone else
    SELECT * INTO v_ticket
    FROM public.tickets t
    WHERE t.shop_id = p_shop_id
      AND t.status = 'serving'
      AND t.barber_id = v_profile.id
    LIMIT 1;

    IF FOUND AND v_ticket.id <> p_ticket_id THEN
         RAISE EXCEPTION 'already_serving';
    END IF;

    -- Lock and get the specific ticket
    SELECT * INTO v_ticket
    FROM public.tickets t
    WHERE t.id = p_ticket_id
      AND t.shop_id = p_shop_id
      AND t.status = 'waiting'
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ticket_not_available';
    END IF;

    -- Bring ticket to serving
    UPDATE public.tickets
    SET status = 'serving',
        barber_id = v_profile.id,
        barber_name = COALESCE(v_profile.full_name, public.tickets.barber_name),
        updated_at = NOW()
    WHERE id = v_ticket.id;

    SELECT * INTO v_ticket FROM public.tickets WHERE id = v_ticket.id;

    RETURN QUERY SELECT v_ticket.id, v_ticket.ticket_number, v_ticket.ticket_code, v_ticket.customer_name, v_ticket.people_count, v_ticket.barber_name, v_ticket.barber_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.barber_call_specific_ticket(UUID, UUID) TO authenticated;
