-- Migration: Add job_role and bedroom_number to Bedrails Risk Assessments
-- Date: March 27, 2026
-- Description: Adds missing columns to public.bedrails_risk_assessments to match frontend dialog expectations and ensure data persistence.

ALTER TABLE public.bedrails_risk_assessments 
  ADD COLUMN IF NOT EXISTS job_role TEXT,
  ADD COLUMN IF NOT EXISTS bedroom_number TEXT;

-- Note: The frontend uses camelCase for form fields but expects snake_case in the DB payload for some top-level fields.
