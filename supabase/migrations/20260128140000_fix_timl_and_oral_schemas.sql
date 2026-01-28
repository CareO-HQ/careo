-- Migration: Fix TIML and Oral Assessment Schema Specifics
-- Date: January 28, 2026
-- Description: Adds specific missing columns for TIML and ensures status exists for Oral assessments.

-- 1. TIML Assessments
ALTER TABLE public.timl_assessments 
  ADD COLUMN IF NOT EXISTS management_plan TEXT,
  ADD COLUMN IF NOT EXISTS treatment_recommendation TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS completed_by TEXT;

-- 2. Oral Assessments
ALTER TABLE public.oral_assessments 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS assessment_date DATE,
  ADD COLUMN IF NOT EXISTS completed_by TEXT;

-- Ensure status is TEXT on all potential problematic tables (extra safety)
ALTER TABLE public.long_term_falls_risk_assessments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';
ALTER TABLE public.choking_risk_assessments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';
ALTER TABLE public.bladder_bowel_assessments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';
ALTER TABLE public.handling_profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';
