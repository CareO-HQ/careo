-- Add wound_number to wound_folders table
-- This number is auto-incremented per resident
ALTER TABLE public.wound_folders
ADD COLUMN IF NOT EXISTS wound_number INTEGER;

-- Create a function to get the next wound number for a resident
CREATE OR REPLACE FUNCTION public.get_next_wound_number(p_resident_id UUID)
RETURNS INTEGER AS $$
DECLARE
  max_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(wound_number), 0) INTO max_number
  FROM public.wound_folders
  WHERE resident_id = p_resident_id;

  RETURN max_number + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically set wound_number on insert
CREATE OR REPLACE FUNCTION public.set_wound_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.wound_number IS NULL THEN
    NEW.wound_number := public.get_next_wound_number(NEW.resident_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_wound_number ON public.wound_folders;
CREATE TRIGGER trigger_set_wound_number
  BEFORE INSERT ON public.wound_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_wound_number();

-- Backfill wound_number for existing wound folders
-- This assigns sequential numbers based on creation date
WITH numbered_wounds AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY resident_id ORDER BY created_at) as row_num
  FROM public.wound_folders
  WHERE wound_number IS NULL
)
UPDATE public.wound_folders
SET wound_number = numbered_wounds.row_num
FROM numbered_wounds
WHERE wound_folders.id = numbered_wounds.id;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_wound_folders_resident_wound_number
ON public.wound_folders(resident_id, wound_number);
