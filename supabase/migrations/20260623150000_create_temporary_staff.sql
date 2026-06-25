-- Migration to create Temporary Staff table
-- Date: June 23, 2026

CREATE TABLE IF NOT EXISTS public.temporary_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('nurse', 'care_assistant')),
  contracted_weekly_hours NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_id, name)
);

-- Enable Row Level Security
ALTER TABLE public.temporary_staff ENABLE ROW LEVEL SECURITY;

-- Select policy: allow viewing temporary staff
DROP POLICY IF EXISTS "View temporary staff" ON public.temporary_staff;
CREATE POLICY "View temporary staff" ON public.temporary_staff FOR SELECT USING (true);

-- Manage policy: allow managers/owners/approved nurses to manage temporary staff
DROP POLICY IF EXISTS "Manage temporary staff" ON public.temporary_staff;
CREATE POLICY "Manage temporary staff" ON public.temporary_staff FOR ALL USING (public.can_manage_rota(team_id));
