-- Migration: Add quality_of_life to bladder_bowel_assessments
-- Date: March 26, 2026

ALTER TABLE public.bladder_bowel_assessments 
  ADD COLUMN IF NOT EXISTS quality_of_life TEXT;
