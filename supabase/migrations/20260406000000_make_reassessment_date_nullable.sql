-- Make reassessment_date nullable in wound_assessments table
-- This allows saving assessments without requiring a future reassessment date

ALTER TABLE public.wound_assessments
  ALTER COLUMN reassessment_date DROP NOT NULL;

-- Add a comment to document this change
COMMENT ON COLUMN public.wound_assessments.reassessment_date IS 'Optional date for next wound reassessment';
