-- ============================================
-- UPDATE WOUND ASSESSMENTS TABLE
-- Migration: 20260402000001
-- Purpose: Convert tissue types from percentages to yes/no checkboxes
--          and restructure exudate, peri-wound skin, infection signs, and treatment objectives
-- ============================================

-- Step 1: Drop the view that depends on the columns we're changing
DROP VIEW IF EXISTS public.wound_healing_progress;

-- Step 2: Rename/drop old percentage columns and add new boolean columns for tissue types
ALTER TABLE public.wound_assessments
  DROP COLUMN IF EXISTS necrotic_percentage,
  DROP COLUMN IF EXISTS sloughy_percentage,
  DROP COLUMN IF EXISTS granulating_percentage,
  DROP COLUMN IF EXISTS epithelialising_percentage,
  DROP COLUMN IF EXISTS hypergranulating_percentage,
  DROP COLUMN IF EXISTS haematoma_percentage,
  DROP COLUMN IF EXISTS bone_tendon_percentage;

-- Add new boolean tissue type columns
ALTER TABLE public.wound_assessments
  ADD COLUMN necrotic BOOLEAN DEFAULT false,
  ADD COLUMN sloughy BOOLEAN DEFAULT false,
  ADD COLUMN granulating BOOLEAN DEFAULT false,
  ADD COLUMN epithelialising BOOLEAN DEFAULT false,
  ADD COLUMN hypergranulating BOOLEAN DEFAULT false,
  ADD COLUMN haematoma BOOLEAN DEFAULT false,
  ADD COLUMN bone_tendon BOOLEAN DEFAULT false;

-- Step 3: Drop old exudate columns and add individual boolean columns
ALTER TABLE public.wound_assessments
  DROP COLUMN IF EXISTS exudate_level,
  DROP COLUMN IF EXISTS exudate_type;

-- Add new boolean exudate columns
ALTER TABLE public.wound_assessments
  ADD COLUMN exudate_low BOOLEAN DEFAULT false,
  ADD COLUMN exudate_moderate BOOLEAN DEFAULT false,
  ADD COLUMN exudate_high BOOLEAN DEFAULT false,
  ADD COLUMN exudate_serous BOOLEAN DEFAULT false,
  ADD COLUMN exudate_haemoserous BOOLEAN DEFAULT false,
  ADD COLUMN exudate_purulent BOOLEAN DEFAULT false;

-- Step 4: Drop old array columns and add individual boolean columns
ALTER TABLE public.wound_assessments
  DROP COLUMN IF EXISTS periwound_skin,
  DROP COLUMN IF EXISTS signs_of_infection,
  DROP COLUMN IF EXISTS treatment_objectives;

-- Add individual peri-wound skin boolean columns
ALTER TABLE public.wound_assessments
  ADD COLUMN macerated BOOLEAN DEFAULT false,
  ADD COLUMN oedematous BOOLEAN DEFAULT false,
  ADD COLUMN erythema BOOLEAN DEFAULT false,
  ADD COLUMN excoriated BOOLEAN DEFAULT false,
  ADD COLUMN fragile BOOLEAN DEFAULT false,
  ADD COLUMN dry_scaly BOOLEAN DEFAULT false,
  ADD COLUMN healthy_intact BOOLEAN DEFAULT false;

-- Add individual signs of infection boolean columns
ALTER TABLE public.wound_assessments
  ADD COLUMN heat BOOLEAN DEFAULT false,
  ADD COLUMN new_slough_necrosis BOOLEAN DEFAULT false,
  ADD COLUMN increasing_pain BOOLEAN DEFAULT false,
  ADD COLUMN increasing_exudate BOOLEAN DEFAULT false,
  ADD COLUMN increasing_odour BOOLEAN DEFAULT false,
  ADD COLUMN friable_granulation BOOLEAN DEFAULT false;

-- Add individual treatment objective boolean columns
ALTER TABLE public.wound_assessments
  ADD COLUMN debridement BOOLEAN DEFAULT false,
  ADD COLUMN absorption BOOLEAN DEFAULT false,
  ADD COLUMN hydration BOOLEAN DEFAULT false,
  ADD COLUMN protection BOOLEAN DEFAULT false,
  ADD COLUMN palliative_conservative BOOLEAN DEFAULT false;

-- Step 5: Drop old GIN indexes (no longer needed for arrays)
DROP INDEX IF EXISTS idx_wound_assessments_signs_of_infection;
DROP INDEX IF EXISTS idx_wound_assessments_periwound_skin;
DROP INDEX IF EXISTS idx_wound_assessments_treatment_objectives;

-- Step 6: Recreate the wound healing progress view with updated columns
CREATE OR REPLACE VIEW public.wound_healing_progress AS
SELECT
  wa.resident_id,
  wa.wound_number,
  wa.assessment_date,
  wa.length_cm,
  wa.width_cm,
  wa.depth_cm,
  (wa.length_cm * wa.width_cm) AS wound_area_cm2,
  wa.granulating,
  wa.epithelialising,
  -- Calculate infection sign count from boolean columns
  (
    CASE WHEN wa.heat THEN 1 ELSE 0 END +
    CASE WHEN wa.new_slough_necrosis THEN 1 ELSE 0 END +
    CASE WHEN wa.increasing_pain THEN 1 ELSE 0 END +
    CASE WHEN wa.increasing_exudate THEN 1 ELSE 0 END +
    CASE WHEN wa.increasing_odour THEN 1 ELSE 0 END +
    CASE WHEN wa.friable_granulation THEN 1 ELSE 0 END
  ) AS infection_sign_count,
  CASE
    WHEN (wa.heat OR wa.new_slough_necrosis OR wa.increasing_pain OR wa.increasing_exudate OR wa.increasing_odour OR wa.friable_granulation) THEN 'infection_suspected'
    WHEN (wa.granulating AND wa.epithelialising) THEN 'healing_well'
    WHEN (wa.necrotic OR wa.sloughy) THEN 'deteriorating'
    ELSE 'stable'
  END AS healing_status,
  wa.reassessment_date,
  r.first_name || ' ' || r.last_name AS resident_name,
  u.name AS assessor_name,
  wa.created_at
FROM public.wound_assessments wa
LEFT JOIN public.residents r ON wa.resident_id = r.id
LEFT JOIN public.users u ON wa.recorded_by = u.id
ORDER BY wa.resident_id, wa.wound_number, wa.assessment_date DESC;

-- Grant access to the view
GRANT SELECT ON public.wound_healing_progress TO authenticated;

-- Add RLS to the view (inherits from base table policies)
ALTER VIEW public.wound_healing_progress SET (security_invoker = true);

-- Add comments for documentation
COMMENT ON COLUMN public.wound_assessments.necrotic IS 'Tissue type: Necrotic (Black) - Yes/No';
COMMENT ON COLUMN public.wound_assessments.sloughy IS 'Tissue type: Sloughy (Yellow/Green) - Yes/No';
COMMENT ON COLUMN public.wound_assessments.granulating IS 'Tissue type: Granulating (Red) - Yes/No';
COMMENT ON COLUMN public.wound_assessments.epithelialising IS 'Tissue type: Epithelialising (Pink) - Yes/No';
COMMENT ON COLUMN public.wound_assessments.hypergranulating IS 'Tissue type: Hypergranulating (Red) - Yes/No';
COMMENT ON COLUMN public.wound_assessments.haematoma IS 'Tissue type: Haematoma - Yes/No';
COMMENT ON COLUMN public.wound_assessments.bone_tendon IS 'Tissue type: Bone/tendon visible - Yes/No';

-- Verify the migration was successful
SELECT
  'SUCCESS! Wound assessments table updated to use checkboxes' as status,
  COUNT(*) as row_count
FROM public.wound_assessments;

-- Show updated table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'wound_assessments'
AND column_name IN ('necrotic', 'sloughy', 'granulating', 'epithelialising', 'hypergranulating', 'haematoma', 'bone_tendon', 'exudate_low', 'macerated', 'heat', 'debridement')
ORDER BY ordinal_position;
