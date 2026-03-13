-- ============================================================
-- PUSH NOTIFICATION DATABASE TRIGGER
-- This automatically calls our Edge Function whenever a ticket 
-- status changes to 'serving'. It uses the `pg_net` extension 
-- available in Supabase.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pg_net";

CREATE OR REPLACE FUNCTION trigger_send_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_url TEXT;
    v_anon_key TEXT;
    v_payload JSONB;
    v_request_id BIGINT;
    v_base_url TEXT;
BEGIN
    -- Only trigger when status changes TO 'serving'
    IF NEW.status = 'serving' AND OLD.status != 'serving' THEN
        -- Get the current database API URL (or project ref)
        -- Assuming a standard Supabase setup, we can fetch environment vars or pass them.
        -- We will construct the default edge function URL format if possible,
        -- but since PL/pgSQL doesn't intuitively know the project URL, we'll store it in app_settings.
        
        SELECT value INTO v_base_url FROM app_settings WHERE key = 'SUPABASE_EDGE_FUNCTIONS_URL';
        SELECT value INTO v_anon_key FROM app_settings WHERE key = 'SUPABASE_ANON_KEY';

        -- If not set, we cannot trigger the function automatically from DB
        IF v_base_url IS NOT NULL AND v_anon_key IS NOT NULL THEN
            v_url := v_base_url || '/send-push';
            
            v_payload := jsonb_build_object(
                'ticketId', NEW.id,
                'title', 'دورك الآن! 🚗',
                'body', 'تم إدخال سيارتك للمغسلة (' || NEW.customer_name || ').',
                'url', '/' -- we can refine this to open the ticket specifically
            );

            SELECT net.http_post(
                url := v_url,
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || v_anon_key
                ),
                body := v_payload
            ) INTO v_request_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_ticket_serving_send_push ON tickets;
CREATE TRIGGER on_ticket_serving_send_push
    AFTER UPDATE OF status ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION trigger_send_push_notification();
