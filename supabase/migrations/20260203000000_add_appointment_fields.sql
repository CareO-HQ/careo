-- Migration: Add missing fields to appointments table
-- Date: February 3, 2026
-- Description: Adds staff_id, team_id, and updated_by fields to appointments table

-- Add missing columns to appointments table
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_staff_id ON public.appointments(staff_id);
CREATE INDEX IF NOT EXISTS idx_appointments_team_id ON public.appointments(team_id);
CREATE INDEX IF NOT EXISTS idx_appointments_resident_id ON public.appointments(resident_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON public.appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_organization_id ON public.appointments(organization_id);
