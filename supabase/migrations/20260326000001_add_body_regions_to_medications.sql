-- Add body_regions column to medications table for topical medications
ALTER TABLE public.medications ADD COLUMN IF NOT EXISTS body_regions TEXT[];

-- Add comment
COMMENT ON COLUMN public.medications.body_regions IS 'Array of body region IDs where topical medication should be applied';
