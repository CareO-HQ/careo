-- Add bowel_size column to continence_entries table
-- Run this in Supabase SQL Editor

ALTER TABLE public.continence_entries
ADD COLUMN IF NOT EXISTS bowel_size TEXT CHECK (bowel_size IS NULL OR bowel_size IN ('s', 'm', 'l', 'xl'));

-- Verify the column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'continence_entries'
AND column_name = 'bowel_size';

SELECT 'SUCCESS: bowel_size column added!' as result;
