-- Add next_review_date to specimen_records table
ALTER TABLE public.specimen_records 
  ADD COLUMN IF NOT EXISTS next_review_date DATE;

-- Add index for performance if needed
CREATE INDEX IF NOT EXISTS idx_specimen_records_next_review_date 
  ON public.specimen_records(next_review_date);

-- Add next_review_date to personal_profiles
ALTER TABLE public.personal_profiles
  ADD COLUMN IF NOT EXISTS next_review_date DATE;

-- Add next_review_date to resident_valuables_assessments
ALTER TABLE public.resident_valuables_assessments
  ADD COLUMN IF NOT EXISTS next_review_date DATE;

-- Add next_review_date to general_risk_assessments
ALTER TABLE public.general_risk_assessments
  ADD COLUMN IF NOT EXISTS next_review_date DATE;

-- Add next_review_date and assessment_data to diet_notifications
ALTER TABLE public.diet_notifications
  ADD COLUMN IF NOT EXISTS next_review_date DATE,
  ADD COLUMN IF NOT EXISTS assessment_data JSONB;

-- Add next_review_date to bladder_bowel_assessments
ALTER TABLE public.bladder_bowel_assessments
  ADD COLUMN IF NOT EXISTS next_review_date DATE;

-- Add next_review_date to smoking_risk_assessments
ALTER TABLE public.smoking_risk_assessments
  ADD COLUMN IF NOT EXISTS next_review_date DATE;
