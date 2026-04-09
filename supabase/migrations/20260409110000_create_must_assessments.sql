-- Create MUST assessments table
CREATE TABLE IF NOT EXISTS public.must_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id UUID,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  resident_name TEXT NOT NULL,
  bedroom_number TEXT,
  date_of_birth TEXT,

  assessment_date DATE NOT NULL,
  weight_kg NUMERIC(6,2) NOT NULL CHECK (weight_kg > 0),
  height_cm NUMERIC(6,2) NOT NULL CHECK (height_cm > 0),
  bmi_value NUMERIC(5,2) NOT NULL CHECK (bmi_value > 0),
  step1_score INTEGER NOT NULL CHECK (step1_score IN (0, 1, 2)),
  step2_score INTEGER NOT NULL CHECK (step2_score IN (0, 1, 2)),
  step3_score INTEGER NOT NULL CHECK (step3_score IN (0, 2)),
  total_must_score INTEGER NOT NULL CHECK (total_must_score BETWEEN 0 AND 6),
  signature TEXT NOT NULL,
  job_role TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'active',
  version_number INTEGER NOT NULL DEFAULT 1,
  previous_version_id UUID REFERENCES public.must_assessments(id),
  archived_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.must_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS admins manage must_assessments" ON public.must_assessments;
CREATE POLICY "SaaS admins manage must_assessments"
  ON public.must_assessments FOR ALL
  TO authenticated
  USING (public.is_saas_admin())
  WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view must_assessments in their organization" ON public.must_assessments;
CREATE POLICY "Users can view must_assessments in their organization"
  ON public.must_assessments FOR SELECT
  TO authenticated
  USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage must_assessments" ON public.must_assessments;
CREATE POLICY "Staff can manage must_assessments"
  ON public.must_assessments FOR ALL
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')
  )
  WITH CHECK (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')
  );

CREATE INDEX IF NOT EXISTS idx_must_assessments_resident_id ON public.must_assessments(resident_id);
CREATE INDEX IF NOT EXISTS idx_must_assessments_organization_id ON public.must_assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_must_assessments_assessment_date ON public.must_assessments(assessment_date DESC);
