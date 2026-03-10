-- Create fall_risk_assessments table
CREATE TABLE IF NOT EXISTS public.fall_risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    assessment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_by TEXT,
    assessment_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_score INTEGER NOT NULL DEFAULT 0,
    risk_level TEXT NOT NULL,
    signature TEXT,
    saved_as_draft BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add interactive search and filter indexes
CREATE INDEX IF NOT EXISTS fall_risk_assessments_resident_id_idx ON public.fall_risk_assessments(resident_id);
CREATE INDEX IF NOT EXISTS fall_risk_assessments_team_id_idx ON public.fall_risk_assessments(team_id);
CREATE INDEX IF NOT EXISTS fall_risk_assessments_organization_id_idx ON public.fall_risk_assessments(organization_id);

-- Enable RLS
ALTER TABLE public.fall_risk_assessments ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies (using system helper functions)
DROP POLICY IF EXISTS "SaaS admins manage fall_risk_assessments" ON public.fall_risk_assessments;
CREATE POLICY "SaaS admins manage fall_risk_assessments" ON public.fall_risk_assessments FOR ALL TO authenticated USING (public.is_saas_admin()) WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view fall_risk_assessments in their organization" ON public.fall_risk_assessments;
CREATE POLICY "Users can view fall_risk_assessments in their organization" ON public.fall_risk_assessments FOR SELECT TO authenticated USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage fall_risk_assessments" ON public.fall_risk_assessments;
CREATE POLICY "Staff can manage fall_risk_assessments" ON public.fall_risk_assessments FOR ALL TO authenticated USING (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')) WITH CHECK (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse'));

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_fall_risk_assessments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_fall_risk_assessments_updated_at
    BEFORE UPDATE ON public.fall_risk_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_fall_risk_assessments_updated_at();
