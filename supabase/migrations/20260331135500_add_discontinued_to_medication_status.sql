-- Add 'discontinued' value to medication_status enum
-- Note: In PostgreSQL, we can use ALTER TYPE ... ADD VALUE.
-- However, we wrap it in a DO block to ensure it's idempotent or handle potential issues.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
        WHERE pg_type.typname = 'medication_status' 
        AND pg_enum.enumlabel = 'discontinued'
    ) THEN
        ALTER TYPE medication_status ADD VALUE 'discontinued';
    END IF;
END
$$;
