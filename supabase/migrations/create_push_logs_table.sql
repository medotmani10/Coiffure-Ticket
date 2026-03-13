-- ============================================================
-- PUSH LOGS TABLE FOR DEBUGGING
-- ============================================================

CREATE TABLE IF NOT EXISTS push_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow inserting for authenticated/anon roles
ALTER TABLE push_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'push_logs' AND policyname = 'Anyone can insert logs'
    ) THEN
        CREATE POLICY "Anyone can insert logs" ON push_logs FOR INSERT WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'push_logs' AND policyname = 'Super admin can read logs'
    ) THEN
        CREATE POLICY "Super admin can read logs" ON push_logs FOR SELECT USING (auth.jwt() ->> 'email' = 'med.otmani5@gmail.com');
    END IF;
END
$$;
