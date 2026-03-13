-- Create prn_protocols table for PRN Protocol form (Medication > Docs)
-- Mirrors structure used by submitAssessmentWithVersioning and standard assessment versioning.

CREATE TABLE public.prn_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  assessment_data JSONB,
  assessment_date DATE,
  completed_by TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  previous_version_id UUID REFERENCES public.prn_protocols(id),
  version_number INTEGER DEFAULT 1,
  archived_at TIMESTAMPTZ
);

CREATE INDEX idx_prn_protocols_resident ON public.prn_protocols(resident_id);
CREATE INDEX idx_prn_protocols_organization ON public.prn_protocols(organization_id);

COMMENT ON TABLE public.prn_protocols IS 'PRN protocol forms from Medication > Docs';

-- RLS
ALTER TABLE public.prn_protocols ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS admins manage prn_protocols" ON public.prn_protocols;
CREATE POLICY "SaaS admins manage prn_protocols" ON public.prn_protocols
  FOR ALL TO authenticated
  USING (public.is_saas_admin())
  WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view prn_protocols in their organization" ON public.prn_protocols;
CREATE POLICY "Users can view prn_protocols in their organization" ON public.prn_protocols
  FOR SELECT TO authenticated
  USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage prn_protocols" ON public.prn_protocols;
CREATE POLICY "Staff can manage prn_protocols" ON public.prn_protocols
  FOR ALL TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')
  )
  WITH CHECK (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')
  );
