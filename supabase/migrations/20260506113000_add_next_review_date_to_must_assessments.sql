-- Add next review date to MUST assessments
ALTER TABLE public.must_assessments
ADD COLUMN IF NOT EXISTS next_review_date DATE;

CREATE INDEX IF NOT EXISTS idx_must_assessments_next_review_date
ON public.must_assessments(next_review_date);
