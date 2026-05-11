-- Ensure smoking risk assessments have next_review_date.
-- This migration exists because earlier aggregate migrations may already be marked as applied.
ALTER TABLE public.smoking_risk_assessments
  ADD COLUMN IF NOT EXISTS next_review_date DATE;

CREATE INDEX IF NOT EXISTS idx_smoking_risk_assessments_next_review_date
  ON public.smoking_risk_assessments(next_review_date);
