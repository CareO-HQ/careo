-- Fix schema mismatches for assessment forms

-- 1. Photography Consents
ALTER TABLE photography_consents ADD COLUMN IF NOT EXISTS assessment_data JSONB;

-- 2. Dependency Assessments
-- The UI code uses 'assessment_date' (DATE) and 'completed_by' (TEXT).
-- Existing schema has 'completion_date' (DATE).
ALTER TABLE dependency_assessments ADD COLUMN IF NOT EXISTS assessment_date DATE;

-- 3. Best Interest Decisions
ALTER TABLE best_interest_decisions ADD COLUMN IF NOT EXISTS assessment_data JSONB;

-- 4. Resident Valuables Assessments
ALTER TABLE resident_valuables_assessments ADD COLUMN IF NOT EXISTS assessment_data JSONB;

-- 5. Handling Profiles
-- The code expects 'handling_profiles', but the consolidated schema created it as 'resident_handling_profiles'.
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resident_handling_profiles') THEN
    ALTER TABLE resident_handling_profiles RENAME TO handling_profiles;
  END IF;
END $$;
