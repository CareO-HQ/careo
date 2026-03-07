-- Migration: Complete schema fix for choking_risk_assessments
-- Date: 2026-03-09
-- Description: Aligns database schema with frontend form expectations

-- Add missing columns
ALTER TABLE public.choking_risk_assessments
  ADD COLUMN IF NOT EXISTS risk_factors JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS assessment_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_score INTEGER,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'archived', 'active')),
  ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS previous_version_id UUID REFERENCES public.choking_risk_assessments(id),
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Note: Data migration not needed as previous migrations already handled column renames
-- The new columns (risk_factors, assessment_date, total_score, status, version_number)
-- are now available for use by the frontend form
