-- Create prn_consents table for PRN Care Consent form (Medication > Docs)
-- Mirrors structure used by submitAssessmentWithVersioning and bedrail_consents-style versioning.

CREATE TABLE public.prn_consents (
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
  previous_version_id UUID REFERENCES public.prn_consents(id),
  version_number INTEGER DEFAULT 1,
  archived_at TIMESTAMPTZ
);

CREATE INDEX idx_prn_consents_resident ON public.prn_consents(resident_id);
CREATE INDEX idx_prn_consents_organization ON public.prn_consents(organization_id);

COMMENT ON TABLE public.prn_consents IS 'PRN (as needed) care consent forms from Medication > Docs';

-- RLS
ALTER TABLE public.prn_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS admins manage prn_consents" ON public.prn_consents;
CREATE POLICY "SaaS admins manage prn_consents" ON public.prn_consents
  FOR ALL TO authenticated
  USING (public.is_saas_admin())
  WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view prn_consents in their organization" ON public.prn_consents;
CREATE POLICY "Users can view prn_consents in their organization" ON public.prn_consents
  FOR SELECT TO authenticated
  USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage prn_consents" ON public.prn_consents;
CREATE POLICY "Staff can manage prn_consents" ON public.prn_consents
  FOR ALL TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')
  )
  WITH CHECK (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')
  );
