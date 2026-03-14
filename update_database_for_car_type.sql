ALTER TABLE public.tickets
    DROP COLUMN IF EXISTS car_type;

DROP FUNCTION IF EXISTS public.create_ticket(UUID, TEXT, TEXT, INTEGER, TEXT, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.create_ticket(UUID, TEXT, TEXT, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_ticket(UUID, TEXT, TEXT, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION public.create_ticket(
    p_shop_id    UUID,
    p_name       TEXT,
    p_phone      TEXT,
    p_people     INTEGER,
    p_session_id TEXT,
    p_barber_id  UUID DEFAULT NULL,
    p_barber_name TEXT DEFAULT NULL
)
RETURNS SETOF public.tickets
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
    v_next_num   INTEGER;
    v_last_reset TIMESTAMPTZ;
    v_logical_start TIMESTAMPTZ;
    v_new_ticket public.tickets;
    v_barber_name TEXT;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext(p_shop_id::text));

    IF NOT EXISTS (SELECT 1 FROM public.shops WHERE id = p_shop_id AND is_open = true) THEN
        RAISE EXCEPTION 'shop_closed';
    END IF;

    IF NOT (p_session_id LIKE 'manual_%') AND EXISTS (
        SELECT 1 FROM public.tickets
        WHERE shop_id = p_shop_id
          AND user_session_id = p_session_id
          AND status IN ('waiting', 'serving')
    ) THEN
        RAISE EXCEPTION 'duplicate_active_ticket';
    END IF;

    IF EXTRACT(HOUR FROM now() AT TIME ZONE 'UTC') >= 5 THEN
        v_logical_start := date_trunc('day', now() AT TIME ZONE 'UTC') + INTERVAL '5 hours';
    ELSE
        v_logical_start := date_trunc('day', now() AT TIME ZONE 'UTC') - INTERVAL '19 hours';
    END IF;

    SELECT COALESCE(last_reset_at, '1970-01-01'::TIMESTAMPTZ)
    INTO v_last_reset FROM public.shops WHERE id = p_shop_id;

    IF v_last_reset < v_logical_start THEN
        v_last_reset := v_logical_start;
    END IF;

    SELECT COALESCE(MAX(ticket_number), 0) + 1
    INTO v_next_num FROM public.tickets
    WHERE shop_id   = p_shop_id
      AND created_at >= v_last_reset;

    v_barber_name := NULLIF(BTRIM(p_barber_name), '');

    IF p_barber_id IS NOT NULL THEN
        SELECT NULLIF(BTRIM(p.full_name), '')
        INTO v_barber_name
        FROM public.profiles p
        WHERE p.id = p_barber_id
          AND p.role = 'barber'
          AND p.shop_id = p_shop_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'invalid_barber';
        END IF;
    END IF;

    INSERT INTO public.tickets (
        shop_id, customer_name,
        phone_number, people_count, ticket_number,
        user_session_id, status,
        barber_id, barber_name
    ) VALUES (
        p_shop_id, p_name,
        p_phone, p_people, v_next_num,
        p_session_id, 'waiting',
        p_barber_id, v_barber_name
    ) RETURNING * INTO v_new_ticket;

    RETURN NEXT v_new_ticket;
END;
$;

GRANT EXECUTE ON FUNCTION public.create_ticket(UUID, TEXT, TEXT, INTEGER, TEXT, UUID, TEXT) TO anon, authenticated;
