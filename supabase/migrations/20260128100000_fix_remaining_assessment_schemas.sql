-- Migration: Fix Remaining Assessment Schema Mismatches
-- Date: January 28, 2026
-- Description: Adds missing columns to match frontend dialog expectations

-- ============================================
-- 1. Diet Notifications
-- Frontend: DietNotificationDialog.tsx expects:
--   choking_risk, preferred_meal_size, dietary_preferences (JSONB),
--   food_consistency (JSONB), fluid_consistency (JSONB), kitchen_review (JSONB),
--   completed_by, print_name, job_role
-- ============================================
ALTER TABLE public.diet_notifications 
  ADD COLUMN IF NOT EXISTS choking_risk TEXT,
  ADD COLUMN IF NOT EXISTS preferred_meal_size TEXT,
  ADD COLUMN IF NOT EXISTS dietary_preferences JSONB,
  ADD COLUMN IF NOT EXISTS food_consistency JSONB,
  ADD COLUMN IF NOT EXISTS fluid_consistency JSONB,
  ADD COLUMN IF NOT EXISTS kitchen_review JSONB,
  ADD COLUMN IF NOT EXISTS completed_by TEXT,
  ADD COLUMN IF NOT EXISTS print_name TEXT,
  ADD COLUMN IF NOT EXISTS job_role TEXT;

-- ============================================
-- 2. Handling Profiles
-- Frontend: ResidentHandlingProfileDialog.tsx expects:
--   activities (JSONB), assessment_date, completed_by, job_role, weight, weight_bearing
-- ============================================
ALTER TABLE public.handling_profiles 
  ADD COLUMN IF NOT EXISTS activities JSONB,
  ADD COLUMN IF NOT EXISTS assessment_date DATE,
  ADD COLUMN IF NOT EXISTS completed_by TEXT,
  ADD COLUMN IF NOT EXISTS job_role TEXT,
  ADD COLUMN IF NOT EXISTS weight NUMERIC,
  ADD COLUMN IF NOT EXISTS weight_bearing TEXT;

-- In case handling_profiles doesn't exist yet, also check resident_handling_profiles
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resident_handling_profiles') THEN
    ALTER TABLE public.resident_handling_profiles 
      ADD COLUMN IF NOT EXISTS activities JSONB,
      ADD COLUMN IF NOT EXISTS assessment_date DATE,
      ADD COLUMN IF NOT EXISTS completed_by TEXT,
      ADD COLUMN IF NOT EXISTS job_role TEXT,
      ADD COLUMN IF NOT EXISTS weight NUMERIC,
      ADD COLUMN IF NOT EXISTS weight_bearing TEXT;
  END IF;
END $$;

-- ============================================
-- 3. Oral Assessments
-- Frontend: OralAssessmentDialog.tsx expects:
--   oral_hygiene_routine, dental_info (JSONB), exam_findings (JSONB),
--   symptoms (JSONB), care_recommendations (JSONB), assessment_details (JSONB),
--   assessment_date, completed_by
-- ============================================
ALTER TABLE public.oral_assessments 
  ADD COLUMN IF NOT EXISTS oral_hygiene_routine TEXT,
  ADD COLUMN IF NOT EXISTS dental_info JSONB,
  ADD COLUMN IF NOT EXISTS exam_findings JSONB,
  ADD COLUMN IF NOT EXISTS symptoms JSONB,
  ADD COLUMN IF NOT EXISTS care_recommendations JSONB,
  ADD COLUMN IF NOT EXISTS assessment_details JSONB,
  ADD COLUMN IF NOT EXISTS assessment_date DATE;
-- completed_by already added in previous migration

-- ============================================
-- 4. Choking Risk Assessments
-- Frontend: ChokingRiskAssessmentDialog.tsx expects:
--   risk_factors (JSONB), total_score, risk_level, assessment_date, completed_by
-- ============================================
ALTER TABLE public.choking_risk_assessments 
  ADD COLUMN IF NOT EXISTS risk_factors JSONB,
  ADD COLUMN IF NOT EXISTS total_score INTEGER,
  ADD COLUMN IF NOT EXISTS assessment_date DATE;
-- risk_level and completed_by already exist

-- ============================================
-- 5. Bladder Bowel Assessments
-- Frontend: ContinenceDialog.tsx expects:
--   lifestyle_factors (JSONB), bladder_pattern (JSONB), bowel_pattern (JSONB),
--   symptoms (JSONB), plan_commenced BOOLEAN, next_review_date DATE,
--   assessment_date, completed_by
-- ============================================
ALTER TABLE public.bladder_bowel_assessments 
  ADD COLUMN IF NOT EXISTS lifestyle_factors JSONB,
  ADD COLUMN IF NOT EXISTS bladder_pattern JSONB,
  ADD COLUMN IF NOT EXISTS bowel_pattern JSONB,
  ADD COLUMN IF NOT EXISTS symptoms JSONB,
  ADD COLUMN IF NOT EXISTS plan_commenced BOOLEAN,
  ADD COLUMN IF NOT EXISTS next_review_date DATE;
-- assessment_date and completed_by already added in previous migration

-- ============================================
-- 6. Long Term Falls Risk Assessments
-- Frontend: LongTermFallRiskDialog.tsx expects:
--   assessment_fields (JSONB), total_score, risk_level, assessment_date, completed_by
-- ============================================
ALTER TABLE public.long_term_falls_risk_assessments 
  ADD COLUMN IF NOT EXISTS assessment_fields JSONB,
  ADD COLUMN IF NOT EXISTS total_score INTEGER,
  ADD COLUMN IF NOT EXISTS risk_level TEXT;
-- assessment_date and completed_by already handled

-- ============================================
-- 7. Photography Consents - ensure all expected columns exist
-- Frontend: PhotographyConsentDialog.tsx expects JSONB data storage
-- ============================================
-- assessment_data, assessment_date, completed_by already added in previous migrations

-- ============================================
-- 8. Resident Valuables Assessments
-- Frontend expects: assessment_data (JSONB), assessment_date, completed_by
-- ============================================
ALTER TABLE public.resident_valuables_assessments
  ADD COLUMN IF NOT EXISTS assessment_date DATE,
  ADD COLUMN IF NOT EXISTS completed_by TEXT;
-- assessment_data already added in previous migration
