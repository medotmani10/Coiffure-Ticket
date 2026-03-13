-- 1. Add car_type column to tickets table
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS car_type text;

-- 2. Drop the existing function so we can recreate it with a new signature
DROP FUNCTION IF EXISTS public.create_ticket(uuid, text, text, integer, text);

-- 3. Recreate the create_ticket function with the new p_car_type parameter
CREATE OR REPLACE FUNCTION public.create_ticket(
    p_shop_id uuid,
    p_name text,
    p_phone text,
    p_people integer,
    p_session_id text,
    p_car_type text DEFAULT NULL
)
RETURNS SETOF public.tickets
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_shop_is_open boolean;
    v_next_number integer;
    v_active_ticket_exists boolean;
BEGIN
    -- Check if shop is open
    SELECT is_open INTO v_shop_is_open
    FROM public.shops
    WHERE id = p_shop_id;

    IF NOT v_shop_is_open THEN
        RAISE EXCEPTION 'shop_closed';
    END IF;

    -- Check if user already has an active ticket for this shop using session id
    -- (We ignore this check if session id starts with 'manual_')
    IF p_session_id NOT LIKE 'manual_%' THEN
        SELECT EXISTS (
            SELECT 1
            FROM public.tickets
            WHERE shop_id = p_shop_id
              AND user_session_id = p_session_id
              AND status IN ('waiting', 'serving')
        ) INTO v_active_ticket_exists;

        IF v_active_ticket_exists THEN
            RAISE EXCEPTION 'duplicate_active_ticket';
        END IF;
    END IF;

    -- Get next ticket number for this shop
    v_next_number := public.get_next_ticket_number(p_shop_id);

    -- Insert new ticket and return it
    RETURN QUERY
    INSERT INTO public.tickets (
        shop_id,
        customer_name,
        phone_number,
        people_count,
        ticket_number,
        user_session_id,
        car_type
    )
    VALUES (
        p_shop_id,
        p_name,
        p_phone,
        p_people,
        v_next_number,
        p_session_id,
        p_car_type
    )
    RETURNING *;
END;
$$;
