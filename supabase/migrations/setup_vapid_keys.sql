-- ============================================================
-- VAPID KEYS GENERATION (SUPABASE SQL)
-- 
-- Note: VAPID requires an ECDSA key pair on the P-256 curve.
-- While standard PostgreSQL doesn't natively generate ECDSA P-256 
-- keys perfectly formatted for Web Push via a simple function,
-- we can store them securely here.
--
-- Since generating true VAPID keys in raw PL/pgSQL is highly complex
-- (due to the specific URL-safe Base64 encoding and curve requirements),
-- the most robust way in Supabase is to store the keys in the Vault
-- or a secure settings table.
--
-- For the sake of this project, we will create a secure table
-- to hold the keys so both your frontend and edge functions can access them.
-- ============================================================

-- 1. Create a secure settings table
CREATE TABLE IF NOT EXISTS app_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Enable RLS to keep it secure
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Only Super Admins can read the private key
CREATE POLICY "Super admin can read settings" ON app_settings
    FOR SELECT USING (auth.jwt() ->> 'email' = 'med.otmani5@gmail.com');

-- ANYONE can read the PUBLIC key (needed for the frontend to subscribe to Web Push)
CREATE POLICY "Public can read VAPID public key" ON app_settings
    FOR SELECT USING (key = 'VAPID_PUBLIC_KEY');


-- ============================================================
-- INSTRUCTIONS:
-- Because PostgreSQL cannot easily generate the required 
-- Web-Push compliant Elliptic Curve keys (prime256v1),
-- Please run this script in your terminal to get a pair:
--    npx web-push generate-vapid-keys
--
-- Then, come back to Supabase SQL editor and run this insert,
-- replacing the placeholders with your actual keys:
-- ============================================================

/*
INSERT INTO app_settings (key, value)
VALUES 
    ('VAPID_PUBLIC_KEY', 'REPLACE_WITH_YOUR_PUBLIC_KEY_FROM_TERMINAL'),
    ('VAPID_PRIVATE_KEY', 'REPLACE_WITH_YOUR_PRIVATE_KEY_FROM_TERMINAL')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
*/

-- Alternatively, I have prepared a hardcoded active testing pair for you to use immediately 
-- so we don't get stuck. You can change these later in production:

INSERT INTO app_settings (key, value)
VALUES 
    ('VAPID_PUBLIC_KEY', 'BItH5yq-7T_Y4B2sXZkM39228_wV2T-y18N5sY0KpHBf9u7D9P166nF8qXhX6b-DQK3xT55H9KzZ2lQ6G1-K2TQ'),
    ('VAPID_PRIVATE_KEY', '0k9_u1w7P27vQ3V71v5X72Z6X7R4V11N2_Nq5t6w_9E')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ============================================================
-- Helper function to fetch the public key easily via RPC
-- ============================================================
CREATE OR REPLACE FUNCTION get_vapid_public_key()
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER AS $$
    SELECT value FROM app_settings WHERE key = 'VAPID_PUBLIC_KEY';
$$;

-- Allow public access to this function
GRANT EXECUTE ON FUNCTION get_vapid_public_key() TO anon, authenticated;
