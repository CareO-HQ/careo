-- Add RLS policies for medication_rounds and vitals
-- Migration: 202601291100_add_missing_care_data_rls.sql

-- Enable RLS for medication_rounds
ALTER TABLE public.medication_rounds ENABLE ROW LEVEL SECURITY;

-- Add policy for medication rounds isolation
-- Matches the pattern used for other care data tables
DROP POLICY IF EXISTS "Medication rounds isolation" ON public.medication_rounds;
CREATE POLICY "Medication rounds isolation"
  ON public.medication_rounds FOR ALL
  USING ( public.can_access_organization(organization_id) )
  WITH CHECK ( public.can_access_organization(organization_id) );

-- Enable RLS for vitals
ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;

-- Add policy for vitals isolation
DROP POLICY IF EXISTS "Vitals isolation" ON public.vitals;
CREATE POLICY "Vitals isolation"
  ON public.vitals FOR ALL
  USING ( public.can_access_organization(organization_id) )
  WITH CHECK ( public.can_access_organization(organization_id) );
