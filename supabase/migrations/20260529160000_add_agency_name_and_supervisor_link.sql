-- Migration: Add agency_name and supervisor_id to agency_staff
-- Date: May 29, 2026

ALTER TABLE public.agency_staff
ADD COLUMN IF NOT EXISTS agency_name TEXT,
ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES public.agency_staff(id) ON DELETE SET NULL;
