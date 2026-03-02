-- Add reviewed_by_name column to store staff name at insert time
ALTER TABLE public.care_plan_evaluations
ADD COLUMN IF NOT EXISTS reviewed_by_name TEXT;
