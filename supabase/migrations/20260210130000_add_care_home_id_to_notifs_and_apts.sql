-- Migration: Add care_home_id to notifications and appointments
-- Date: 2026-02-10
-- Description: Adds care_home_id to notifications and appointments tables to improve multi-tenant isolation.

-- 1. Update notifications table
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS care_home_id UUID REFERENCES public.care_homes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_care_home_id ON public.notifications(care_home_id);

-- 2. Update appointments table
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS care_home_id UUID REFERENCES public.care_homes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_care_home_id ON public.appointments(care_home_id);

-- 3. Backfill care_home_id for appointments from residents table
UPDATE public.appointments a
SET care_home_id = r.care_home_id
FROM public.residents r
WHERE a.resident_id = r.id
AND a.care_home_id IS NULL;

-- 4. Backfill care_home_id for notifications from metadata if it's an appointment/resident related notification
-- This is heuristic but better than nothing
UPDATE public.notifications n
SET care_home_id = (n.metadata->>'careHomeId')::UUID
WHERE n.care_home_id IS NULL 
AND n.metadata->>'careHomeId' IS NOT NULL;

-- 5. Update RLS for notifications to be more restrictive if care_home_id is present
-- We'll keep the existing organization-based policy but add care_home_id context eventually if needed.
-- For now, the sidebar will handle the filtering.
