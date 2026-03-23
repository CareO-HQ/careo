-- Create general_risk_assessments table
CREATE TABLE IF NOT EXISTS public.general_risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed_by TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),

    assessment_data JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Versioning & Archiving
    status TEXT NOT NULL DEFAULT 'active',
    version_number INTEGER NOT NULL DEFAULT 1,
    previous_version_id UUID REFERENCES public.general_risk_assessments(id),
    archived_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.general_risk_assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "SaaS admins manage general_risk_assessments"
    ON public.general_risk_assessments FOR ALL TO authenticated
    USING (public.is_saas_admin()) WITH CHECK (public.is_saas_admin());

CREATE POLICY "Users can view general risk assessments in their organization"
    ON public.general_risk_assessments FOR SELECT
    USING (public.can_access_organization(organization_id));

CREATE POLICY "Users can insert general risk assessments for their organization"
    ON public.general_risk_assessments FOR INSERT
    WITH CHECK (public.can_access_organization(organization_id));

CREATE POLICY "Users can update general risk assessments for their organization"
    ON public.general_risk_assessments FOR UPDATE
    USING (public.can_access_organization(organization_id));

-- Updated at trigger
CREATE TRIGGER set_updated_at_general_risk_assessments
    BEFORE UPDATE ON public.general_risk_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Performance indices
CREATE INDEX IF NOT EXISTS idx_general_risk_resident ON public.general_risk_assessments(resident_id);
CREATE INDEX IF NOT EXISTS idx_general_risk_org ON public.general_risk_assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_general_risk_status ON public.general_risk_assessments(status);
