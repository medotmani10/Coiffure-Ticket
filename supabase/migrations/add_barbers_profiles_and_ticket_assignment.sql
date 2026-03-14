CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    full_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'barber')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.profiles (id, shop_id, full_name, role, is_active)
SELECT s.owner_id, s.id, NULL, 'admin', true
FROM public.shops s
ON CONFLICT (id) DO UPDATE
SET shop_id = EXCLUDED.shop_id,
    role = 'admin';

ALTER TABLE public.tickets
    ADD COLUMN IF NOT EXISTS barber_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_barber_id ON public.tickets(barber_id);

CREATE OR REPLACE FUNCTION public.enforce_barber_profile_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;

    IF OLD.id = auth.uid() AND OLD.role = 'barber' THEN
        IF NEW.id <> OLD.id OR NEW.role <> OLD.role OR NEW.shop_id <> OLD.shop_id THEN
            RAISE EXCEPTION 'forbidden_profile_update';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_barber_profile_self_update ON public.profiles;
CREATE TRIGGER enforce_barber_profile_self_update
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_barber_profile_self_update();

CREATE OR REPLACE FUNCTION public.enforce_barber_ticket_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_is_barber BOOLEAN;
    v_is_owner BOOLEAN;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'barber'
          AND p.shop_id = OLD.shop_id
    )
    INTO v_is_barber;

    IF NOT v_is_barber THEN
        RETURN NEW;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.shops s
        WHERE s.id = OLD.shop_id
          AND s.owner_id = auth.uid()
    )
    INTO v_is_owner;

    IF v_is_owner THEN
        RETURN NEW;
    END IF;

    IF NEW.id <> OLD.id
        OR NEW.shop_id <> OLD.shop_id
        OR NEW.ticket_number <> OLD.ticket_number
        OR NEW.user_session_id <> OLD.user_session_id
        OR NEW.customer_name <> OLD.customer_name
        OR NEW.phone_number <> OLD.phone_number
        OR NEW.people_count <> OLD.people_count
        OR NEW.created_at <> OLD.created_at THEN
        RAISE EXCEPTION 'forbidden_ticket_update';
    END IF;

    IF OLD.status = 'waiting' AND OLD.barber_id = auth.uid() THEN
        IF NEW.status <> 'serving' OR NEW.barber_id <> auth.uid() THEN
            RAISE EXCEPTION 'forbidden_ticket_transition';
        END IF;
        RETURN NEW;
    END IF;

    IF OLD.status = 'serving' AND OLD.barber_id = auth.uid() THEN
        IF NEW.status NOT IN ('completed', 'canceled') OR NEW.barber_id <> OLD.barber_id THEN
            RAISE EXCEPTION 'forbidden_ticket_transition';
        END IF;
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'forbidden_ticket_transition';
END;
$$;

DROP TRIGGER IF EXISTS enforce_barber_ticket_updates ON public.tickets;
CREATE TRIGGER enforce_barber_ticket_updates
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_barber_ticket_updates();

DROP POLICY IF EXISTS "Admin can manage shop profiles" ON public.profiles;
CREATE POLICY "Admin can manage shop profiles" ON public.profiles
    FOR ALL
    USING (
        shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
    )
    WITH CHECK (
        shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
        AND (
            (id = auth.uid() AND role = 'admin')
            OR
            (id <> auth.uid() AND role = 'barber')
        )
    );

DROP POLICY IF EXISTS "Barber can read own profile" ON public.profiles;
CREATE POLICY "Barber can read own profile" ON public.profiles
    FOR SELECT
    USING (id = auth.uid());

DROP POLICY IF EXISTS "Barber can update own profile" ON public.profiles;
CREATE POLICY "Barber can update own profile" ON public.profiles
    FOR UPDATE
    USING (id = auth.uid() AND role = 'barber')
    WITH CHECK (id = auth.uid() AND role = 'barber');

DROP POLICY IF EXISTS "Public can read active barbers" ON public.profiles;
CREATE POLICY "Public can read active barbers" ON public.profiles
    FOR SELECT
    USING (
        role = 'barber'
        AND is_active = true
    );

DROP POLICY IF EXISTS "Public can read active barbers" ON public.profiles;
CREATE POLICY "Public can read active barbers" ON public.profiles
    FOR SELECT
    USING (
        role = 'barber'
        AND is_active = true
    );

DROP POLICY IF EXISTS "Barber can read active tickets" ON public.tickets;
CREATE POLICY "Barber can read active tickets" ON public.tickets
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'barber'
              AND p.shop_id = public.tickets.shop_id
              AND p.is_active = true
        )
        AND public.tickets.status IN ('waiting', 'serving')
        AND public.tickets.barber_id = auth.uid()
    );

DROP POLICY IF EXISTS "Barber can claim or update assigned tickets" ON public.tickets;
CREATE POLICY "Barber can claim or update assigned tickets" ON public.tickets
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'barber'
              AND p.shop_id = public.tickets.shop_id
              AND p.is_active = true
        )
        AND public.tickets.barber_id = auth.uid()
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'barber'
              AND p.shop_id = public.tickets.shop_id
              AND p.is_active = true
        )
        AND public.tickets.barber_id = auth.uid()
    );

CREATE OR REPLACE FUNCTION public.barber_next_ticket(
    p_shop_id UUID
)
RETURNS TABLE (
    ticket_id UUID,
    ticket_number INTEGER,
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
        RETURN QUERY SELECT v_ticket.id, v_ticket.ticket_number, v_ticket.customer_name, v_ticket.people_count, v_ticket.barber_name, v_ticket.barber_id;
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

    RETURN QUERY SELECT v_ticket.id, v_ticket.ticket_number, v_ticket.customer_name, v_ticket.people_count, v_ticket.barber_name, v_ticket.barber_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.barber_next_ticket(UUID) TO authenticated;
