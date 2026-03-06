-- Run this to check if the table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'continence_entries'
) as table_exists;

-- If true, show the columns
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'continence_entries'
ORDER BY ordinal_position;
