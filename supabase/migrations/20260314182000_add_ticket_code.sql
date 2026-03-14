-- Step 1: Add ticket_code column to tickets
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS ticket_code TEXT;

-- Step 2: Drop and recreate create_ticket to generate alphabetical per-barber codes
DROP FUNCTION IF EXISTS public.create_ticket(UUID, TEXT, TEXT, INTEGER, TEXT, UUID, TEXT);
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
AS $$
DECLARE
    v_next_num       INTEGER;
    v_last_reset     TIMESTAMPTZ;
    v_logical_start  TIMESTAMPTZ;
    v_new_ticket     public.tickets;
    v_barber_name    TEXT;
    v_barber_letter  TEXT;
    v_barber_seq     INTEGER;
    v_ticket_code    TEXT;
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

    -- Determine current logical day start (resets at 05:00 UTC)
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

    -- Global ticket number (for ordering, keep as before)
    SELECT COALESCE(MAX(ticket_number), 0) + 1
    INTO v_next_num FROM public.tickets
    WHERE shop_id  = p_shop_id
      AND created_at >= v_last_reset;

    -- Resolve barber name
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

        -- Determine barber's alphabetical letter (A=1st created, B=2nd, ...)
        SELECT chr(64 + rn)
        INTO v_barber_letter
        FROM (
            SELECT id, row_number() OVER (ORDER BY created_at ASC) AS rn
            FROM public.profiles
            WHERE shop_id = p_shop_id
              AND role = 'barber'
        ) ranked
        WHERE id = p_barber_id;

        -- Count this barber's tickets today (before insert) → +1 for new ticket
        SELECT COALESCE(COUNT(*), 0) + 1
        INTO v_barber_seq
        FROM public.tickets
        WHERE barber_id = p_barber_id
          AND created_at >= v_last_reset;

        v_ticket_code := COALESCE(v_barber_letter, 'X') || v_barber_seq::TEXT;
    ELSE
        -- No barber assigned → fall back to plain number
        v_ticket_code := v_next_num::TEXT;
    END IF;

    INSERT INTO public.tickets (
        shop_id, customer_name,
        phone_number, people_count, ticket_number, ticket_code,
        user_session_id, status,
        barber_id, barber_name
    ) VALUES (
        p_shop_id, p_name,
        p_phone, p_people, v_next_num, v_ticket_code,
        p_session_id, 'waiting',
        p_barber_id, v_barber_name
    ) RETURNING * INTO v_new_ticket;

    RETURN NEXT v_new_ticket;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_ticket(UUID, TEXT, TEXT, INTEGER, TEXT, UUID, TEXT) TO anon, authenticated;
