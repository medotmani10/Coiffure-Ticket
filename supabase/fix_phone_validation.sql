-- 1. Clean up existing data: Set invalid numbers to empty string 
-- so they don't block the constraint. 
-- This fixes the "23514: check constraint violated" error.

UPDATE tickets 
SET phone_number = '' 
WHERE phone_number != '' 
  AND phone_number !~ '^0[567][0-9]{8}$';

-- 2. Now add the constraint safely
ALTER TABLE tickets 
DROP CONSTRAINT IF EXISTS phone_validation;

ALTER TABLE tickets 
ADD CONSTRAINT phone_validation 
CHECK (phone_number = '' OR phone_number ~ '^0[567][0-9]{8}$');
