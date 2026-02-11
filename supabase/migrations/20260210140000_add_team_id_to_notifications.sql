-- Migration: Add team_id to notifications
-- Date: 2026-02-10
-- Description: Adds team_id to notifications table to allow team-specific notification filtering.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_team_id ON public.notifications(team_id);

-- Backfill team_id for existing incident notifications from metadata if available
UPDATE public.notifications n
SET team_id = (n.metadata->>'teamId')::UUID
WHERE n.team_id IS NULL 
AND n.type = 'incident'
AND n.metadata->>'teamId' IS NOT NULL;
