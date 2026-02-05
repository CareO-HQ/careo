-- Add version tracking to care_plan_assessments
-- This enables creating archived versions when care plans are updated

-- Add column to track previous care plan version
ALTER TABLE public.care_plan_assessments 
ADD COLUMN IF NOT EXISTS previous_care_plan_id UUID REFERENCES public.care_plan_assessments(id) ON DELETE SET NULL;

-- Add column to track when a care plan was archived
ALTER TABLE public.care_plan_assessments 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Create index on previous_care_plan_id for query optimization
CREATE INDEX IF NOT EXISTS idx_care_plan_assessments_previous_id 
ON public.care_plan_assessments(previous_care_plan_id);

-- Create index on status and resident_id for filtering
CREATE INDEX IF NOT EXISTS idx_care_plan_assessments_status_resident 
ON public.care_plan_assessments(status, resident_id);

-- Update archived_at timestamp when status is archived
UPDATE public.care_plan_assessments 
SET archived_at = updated_at 
WHERE status = 'archived' AND archived_at IS NULL;
