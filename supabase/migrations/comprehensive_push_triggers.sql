-- ============================================================
-- COMPREHENSIVE PUSH NOTIFICATIONS TRIGGER
-- Sends push notifications for 3 events:
-- 1. Your turn has arrived (status changes to 'serving')
-- 2. Service finished (status changes to 'completed')
-- 3. Approaching turn (exactly 2 cars ahead in the queue)
-- ============================================================

-- 1. Add tracking column to tickets to prevent duplicate "approaching" notifications
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS notified_approaching BOOLEAN DEFAULT false;

-- 2. Ensure pg_net extension is enabled (required for DB HTTP requests)
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- 3. Insert placeholders for Supabase credentials if they don't exist
INSERT INTO app_settings (key, value) VALUES 
('SUPABASE_URL', 'https://iipidgzicxveqgewcnmq.supabase.co'),
('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpcGlkZ3ppY3h2ZXFnZXdjbm1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDMxNjIsImV4cCI6MjA4ODU3OTE2Mn0.YJtynqQ3jpDZuXz05lLT6-JWhwPVfProAr2oODpEHyc')
ON CONFLICT (key) DO NOTHING;

-- 4. Create or replace the trigger function
CREATE OR REPLACE FUNCTION trigger_send_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_url TEXT;
    v_anon_key TEXT;
    v_payload JSONB;
    v_base_url TEXT;
    v_waiting_record RECORD;
    v_people_ahead INTEGER;
BEGIN
    -- Fetch the Supabase URL and Anon Key from app_settings
    SELECT value INTO v_base_url FROM app_settings WHERE key = 'SUPABASE_URL';
    SELECT value INTO v_anon_key FROM app_settings WHERE key = 'SUPABASE_ANON_KEY';

    -- If credentials are missing or default, exit gracefully
    IF v_base_url IS NULL OR v_anon_key IS NULL OR v_base_url = 'https://your-project-ref.supabase.co' THEN
        RETURN NEW;
    END IF;

    -- Adjust the URL to point to the edge functions
    v_url := v_base_url || '/functions/v1/send-push';

    -- ==========================================
    -- EVENT 1: Ticket becomes 'serving' (Your turn!)
    -- ==========================================
    IF NEW.status = 'serving' AND OLD.status = 'waiting' THEN
        v_payload := jsonb_build_object(
            'ticketId', NEW.id,
            'title', 'دورك الآن! 🚗',
            'body', 'تم إدخال سيارتك للمغسلة (' || NEW.customer_name || '). نتمنى لك خدمة رائعة!',
            'url', '/'
        );
        PERFORM net.http_post(
            url := v_url,
            headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_anon_key),
            body := v_payload
        );
    END IF;

    -- ==========================================
    -- EVENT 2: Ticket becomes 'completed' (Finished)
    -- ==========================================
    IF NEW.status = 'completed' AND OLD.status = 'serving' THEN
        v_payload := jsonb_build_object(
            'ticketId', NEW.id,
            'title', 'اكتمل الغسيل! ✅',
            'body', 'سيارتك جاهزة للاستلام (' || NEW.customer_name || '). شكراً لزيارتك!',
            'url', '/'
        );
        PERFORM net.http_post(
            url := v_url,
            headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_anon_key),
            body := v_payload
        );
    END IF;

    -- ==========================================
    -- EVENT 3: Queue Movement -> Check "2 cars ahead" 
    -- ==========================================
    -- If any ticket leaves 'waiting' state, the queue has shifted.
    IF OLD.status = 'waiting' AND NEW.status != 'waiting' THEN
        -- Loop through all remaining waiting tickets for this specific shop that haven't been notified yet
        FOR v_waiting_record IN 
            SELECT id, created_at, customer_name, ticket_number
            FROM tickets 
            WHERE shop_id = NEW.shop_id AND status = 'waiting' AND notified_approaching = false
        LOOP
            -- Calculate people ahead using the existing function
            SELECT get_people_ahead(NEW.shop_id, v_waiting_record.created_at) INTO v_people_ahead;

            -- If exactly 2 cars (or less, in case multiple jumped at once), send push and mark notified
            IF v_people_ahead <= 2 THEN
                -- Send push
                v_payload := jsonb_build_object(
                    'ticketId', v_waiting_record.id,
                    'title', 'اقترب دورك! ⏳',
                    'body', 'يوجد ' || v_people_ahead || ' سيارة فقط أمامك في الانتظار يا ' || v_waiting_record.customer_name || '. يرجى التوجه لمنطقة الغسيل.',
                    'url', '/'
                );
                
                PERFORM net.http_post(
                    url := v_url,
                    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_anon_key),
                    body := v_payload
                );

                -- Update the flag directly. Since this trigger is `AFTER UPDATE OF status`, 
                -- updating `notified_approaching` will NOT fire this specific trigger again.
                UPDATE tickets SET notified_approaching = true WHERE id = v_waiting_record.id;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;

-- 5. Create the trigger on the tickets table
DROP TRIGGER IF EXISTS on_ticket_status_change_send_push ON tickets;
CREATE TRIGGER on_ticket_status_change_send_push
    AFTER UPDATE OF status ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION trigger_send_push_notification();
