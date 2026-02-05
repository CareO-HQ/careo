-- ============================================
-- Add Missing Medication Columns
-- Migration: 202601281700_add_medication_columns.sql
-- Description: Adds columns required by frontend for medications and medication_intakes tables
-- ============================================

-- ============================================
-- 1. MEDICATIONS TABLE - Missing Columns
-- ============================================

-- Add strength_unit column
ALTER TABLE public.medications 
  ADD COLUMN IF NOT EXISTS strength_unit TEXT;

-- Add total_count column
ALTER TABLE public.medications 
  ADD COLUMN IF NOT EXISTS total_count INTEGER;

-- Add team_id column (optional FK to teams)
ALTER TABLE public.medications 
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Add time_quantities column (JSONB for storing quantity per time slot)
ALTER TABLE public.medications 
  ADD COLUMN IF NOT EXISTS time_quantities JSONB DEFAULT '{}';

-- Add controlled drug schedule column
ALTER TABLE public.medications 
  ADD COLUMN IF NOT EXISTS controlled_drug_schedule TEXT;

-- Add PRN safety limits columns
ALTER TABLE public.medications 
  ADD COLUMN IF NOT EXISTS min_interval_hours NUMERIC;

ALTER TABLE public.medications 
  ADD COLUMN IF NOT EXISTS max_daily_dose NUMERIC;

ALTER TABLE public.medications 
  ADD COLUMN IF NOT EXISTS max_daily_dose_unit TEXT;

-- Make created_by nullable to allow inserts without explicit user context
ALTER TABLE public.medications 
  ALTER COLUMN created_by DROP NOT NULL;

-- ============================================
-- 2. MEDICATION_INTAKES TABLE - Missing Columns
-- ============================================

-- Add status column (used by frontend, mapping to state)
ALTER TABLE public.medication_intakes
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled';

-- Add popped out tracking columns
ALTER TABLE public.medication_intakes
  ADD COLUMN IF NOT EXISTS popped_out_at TIMESTAMPTZ;

ALTER TABLE public.medication_intakes
  ADD COLUMN IF NOT EXISTS popped_out_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add witness tracking columns
ALTER TABLE public.medication_intakes
  ADD COLUMN IF NOT EXISTS witness_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.medication_intakes
  ADD COLUMN IF NOT EXISTS witness_at TIMESTAMPTZ;

-- Add administered_by_id column (frontend expects this, not administered_by)
ALTER TABLE public.medication_intakes
  ADD COLUMN IF NOT EXISTS administered_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================
-- 3. INDEXES for New Columns
-- ============================================

CREATE INDEX IF NOT EXISTS idx_medications_team ON public.medications(team_id);
CREATE INDEX IF NOT EXISTS idx_medication_intakes_witness ON public.medication_intakes(witness_id);
CREATE INDEX IF NOT EXISTS idx_medication_intakes_popped_out ON public.medication_intakes(popped_out_by_id);
CREATE INDEX IF NOT EXISTS idx_medication_intakes_status ON public.medication_intakes(status);

-- ============================================
-- 4. UPDATE TRIGGERS (if not already present)
-- ============================================

-- Ensure updated_at trigger exists for medications
DROP TRIGGER IF EXISTS update_medications_updated_at ON public.medications;
CREATE TRIGGER update_medications_updated_at
  BEFORE UPDATE ON public.medications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Ensure updated_at trigger exists for medication_intakes
DROP TRIGGER IF EXISTS update_medication_intakes_updated_at ON public.medication_intakes;
CREATE TRIGGER update_medication_intakes_updated_at
  BEFORE UPDATE ON public.medication_intakes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
