-- Migration: Add missing signature and team_id columns to diet_notifications
-- Date: 2026-03-25
-- Description: Ensures the signature and team_id fields are saved correctly.

ALTER TABLE public.diet_notifications 
  ADD COLUMN IF NOT EXISTS signature TEXT,
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id);

CREATE INDEX IF NOT EXISTS idx_diet_notifications_team ON public.diet_notifications(team_id);
