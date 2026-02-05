-- Add RLS policies for medication_intakes
-- Migration: 202601291000_add_medication_intakes_rls.sql

-- Enable RLS just in case (should be already enabled)
ALTER TABLE public.medication_intakes ENABLE ROW LEVEL SECURITY;

-- Add policy for medication intakes isolation
-- Matches the pattern used for 'medications' table in consolidated schema
CREATE POLICY "Medication intakes isolation"
  ON public.medication_intakes FOR ALL
  USING ( public.can_access_organization(organization_id) )
  WITH CHECK ( public.can_access_organization(organization_id) );
