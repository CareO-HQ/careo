-- Migration: Add missing columns to choking_risk_assessments
-- Date: 2026-03-09
-- Description: Adds saved_as_draft, signature, team_id, and user_id to match the frontend payload.

ALTER TABLE public.choking_risk_assessments 
  ADD COLUMN IF NOT EXISTS saved_as_draft BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS signature TEXT,
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id),
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Optional: Add index for team_id as it's often used for filtering
CREATE INDEX IF NOT EXISTS idx_choking_risk_team ON public.choking_risk_assessments(team_id);
