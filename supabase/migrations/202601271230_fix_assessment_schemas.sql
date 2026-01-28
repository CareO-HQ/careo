-- Migration: Fix Assessment Schema Mismatches
-- Date: January 27, 2026
-- Description: Aligns assessment tables with frontend dialog requirements.

-- 1. Pain Assessments
ALTER TABLE public.pain_assessments 
  RENAME COLUMN completion_date TO assessment_date;
ALTER TABLE public.pain_assessments 
  ADD COLUMN IF NOT EXISTS assessment_entries JSONB DEFAULT '[]'::jsonb;

-- 2. Cornell Depression Scales
ALTER TABLE public.cornell_depression_scales 
  RENAME COLUMN completion_date TO assessment_date;
ALTER TABLE public.cornell_depression_scales 
  ADD COLUMN IF NOT EXISTS scale_items JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS severity_level TEXT,
  ADD COLUMN IF NOT EXISTS completed_by TEXT;

-- 3. Nutritional Assessments
ALTER TABLE public.nutritional_assessments 
  RENAME COLUMN completion_date TO assessment_date;
ALTER TABLE public.nutritional_assessments 
  ADD COLUMN IF NOT EXISTS assessment_details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS food_consistency JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS fluid_consistency JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.nutritional_assessments 
  ADD COLUMN IF NOT EXISTS must_score TEXT;

-- 4. Oral Assessments
ALTER TABLE public.oral_assessments 
  RENAME COLUMN completion_date TO assessment_date;
ALTER TABLE public.oral_assessments 
  ADD COLUMN IF NOT EXISTS oral_hygiene_routine TEXT,
  ADD COLUMN IF NOT EXISTS dental_info JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS exam_findings JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS symptoms JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS care_recommendations JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS assessment_details JSONB DEFAULT '{}'::jsonb;

-- 5. Choking Risk Assessments
ALTER TABLE public.choking_risk_assessments 
  RENAME COLUMN completion_date TO assessment_date;
ALTER TABLE public.choking_risk_assessments 
  RENAME COLUMN risk_score TO total_score;
ALTER TABLE public.choking_risk_assessments 
  ADD COLUMN IF NOT EXISTS risk_factors JSONB DEFAULT '{}'::jsonb;

-- 6. Bedrails Risk Assessments
ALTER TABLE public.bedrails_risk_assessments 
  ALTER COLUMN decision TYPE JSONB USING decision::JSONB;
