-- Migration to add outcome and position columns to care_plan_evaluations table
ALTER TABLE public.care_plan_evaluations 
ADD COLUMN IF NOT EXISTS outcome TEXT,
ADD COLUMN IF NOT EXISTS position TEXT;
