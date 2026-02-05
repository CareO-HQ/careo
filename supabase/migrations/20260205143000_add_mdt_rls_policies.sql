-- Add RLS policies for multidisciplinary care team and notes
-- Migration: 20260205143000_add_mdt_rls_policies.sql

-- Enable RLS (already globally enabled by batch script, but just in case)
ALTER TABLE public.multidisciplinary_care_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multidisciplinary_notes ENABLE ROW LEVEL SECURITY;

-- Add policies for multidisciplinary_care_team
DROP POLICY IF EXISTS "Care team members isolation" ON public.multidisciplinary_care_team;
CREATE POLICY "Care team members isolation"
  ON public.multidisciplinary_care_team FOR ALL
  USING ( public.can_access_organization(organization_id) )
  WITH CHECK ( public.can_access_organization(organization_id) );

-- Add policies for multidisciplinary_notes
DROP POLICY IF EXISTS "Multidisciplinary notes isolation" ON public.multidisciplinary_notes;
CREATE POLICY "Multidisciplinary notes isolation"
  ON public.multidisciplinary_notes FOR ALL
  USING ( public.can_access_organization(organization_id) )
  WITH CHECK ( public.can_access_organization(organization_id) );
