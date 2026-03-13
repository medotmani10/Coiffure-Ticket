-- Fix for the Customer Cancel Ticket policy
-- The previous policy omitted WITH CHECK, which defaulted to the USING clause.
-- Since USING required status IN ('waiting', 'serving'), updating to 'canceled' failed the implied WITH CHECK.

DROP POLICY IF EXISTS "Customer can cancel own ticket" ON tickets;

CREATE POLICY "Customer can cancel own ticket" ON tickets
    FOR UPDATE USING (
        status IN ('waiting', 'serving')
    ) WITH CHECK (
        status = 'canceled'
    );
