-- Add phone_number column to profiles if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Enable pgcrypto for password hashing if not already available
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Create an RPC to update barber password securely
-- This function verifies that the caller is the owner of the shop the barber belongs to
CREATE OR REPLACE FUNCTION public.update_barber_password(
    p_barber_id uuid,
    p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Run as a superuser/creator to access auth.users
SET search_path = public
AS $$
DECLARE
    v_is_authorized boolean;
BEGIN
    -- Only allow authenticated users
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Verify the caller is an admin of the shop that this barber belongs to
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles barber
        JOIN public.shops s ON s.id = barber.shop_id
        WHERE barber.id = p_barber_id
          AND barber.role = 'barber'
          AND s.owner_id = auth.uid()
    ) INTO v_is_authorized;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Not authorized to change this password';
    END IF;

    -- Update the password in auth.users
    -- Supabase uses bcrypt for password hashing
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
        updated_at = now()
    WHERE id = p_barber_id;

    RETURN true;
END;
$$;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_barber_password(uuid, text) TO authenticated;
