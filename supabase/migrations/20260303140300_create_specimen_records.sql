-- Create specimen_records table
CREATE TABLE IF NOT EXISTS public.specimen_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id UUID,
  
  date_time_obtained TIMESTAMPTZ NOT NULL,
  specimen_type TEXT NOT NULL,
  specimen_requested TEXT NOT NULL,
  staff_obtaining_signature TEXT NOT NULL,
  date_results_received TIMESTAMPTZ,
  results TEXT,
  staff_receiving_signature TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- RLS Policies
ALTER TABLE public.specimen_records ENABLE ROW LEVEL SECURITY;

-- SaaS admin policy
DROP POLICY IF EXISTS "SaaS admins manage specimen_records" ON public.specimen_records;
CREATE POLICY "SaaS admins manage specimen_records" 
  ON public.specimen_records FOR ALL 
  TO authenticated 
  USING (public.is_saas_admin()) 
  WITH CHECK (public.is_saas_admin());

-- Select policy
DROP POLICY IF EXISTS "Users can view specimen records for their organization" ON public.specimen_records;
CREATE POLICY "Users can view specimen records for their organization"
  ON public.specimen_records FOR SELECT
  TO authenticated
  USING (public.can_access_organization(organization_id));

-- Insert policy
DROP POLICY IF EXISTS "Users can insert specimen records for their organization" ON public.specimen_records;
CREATE POLICY "Users can insert specimen records for their organization"
  ON public.specimen_records FOR INSERT
  TO authenticated
  WITH CHECK (public.can_access_organization(organization_id));

-- Update policy
DROP POLICY IF EXISTS "Users can update specimen records for their organization" ON public.specimen_records;
CREATE POLICY "Users can update specimen records for their organization"
  ON public.specimen_records FOR UPDATE
  TO authenticated
  USING (public.can_access_organization(organization_id));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_specimen_records_resident_id ON public.specimen_records(resident_id);
CREATE INDEX IF NOT EXISTS idx_specimen_records_org_id ON public.specimen_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_specimen_records_team_id ON public.specimen_records(team_id);
