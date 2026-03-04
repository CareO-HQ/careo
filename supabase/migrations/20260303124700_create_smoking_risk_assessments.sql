-- Create smoking_risk_assessments table
CREATE TABLE IF NOT EXISTS public.smoking_risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed_by TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    materials_controlled BOOLEAN,
    materials_controlled_details TEXT,
    assistance_lighting BOOLEAN,
    assistance_lighting_details TEXT,
    one_cigarette_at_time BOOLEAN,
    one_cigarette_at_time_details TEXT,
    supervision_required BOOLEAN,
    supervision_required_details TEXT,
    extinguished_correctly BOOLEAN,
    extinguished_correctly_details TEXT,
    bedroom_control_measures TEXT,
    bedroom_control_measures_bool BOOLEAN,
    status TEXT DEFAULT 'active',
    version_number INTEGER DEFAULT 1,
    previous_version_id UUID REFERENCES public.smoking_risk_assessments(id),
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.smoking_risk_assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view smoking risk assessments for their organization"
    ON public.smoking_risk_assessments FOR SELECT
    USING (public.can_access_organization(organization_id));

CREATE POLICY "Users can insert smoking risk assessments for their organization"
    ON public.smoking_risk_assessments FOR INSERT
    WITH CHECK (public.can_access_organization(organization_id));

CREATE POLICY "Users can update smoking risk assessments for their organization"
    ON public.smoking_risk_assessments FOR UPDATE
    USING (public.can_access_organization(organization_id));

-- Updated at trigger
CREATE TRIGGER set_updated_at_smoking_risk_assessments
    BEFORE UPDATE ON public.smoking_risk_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_smoking_risk_assessments_resident ON public.smoking_risk_assessments(resident_id);
CREATE INDEX IF NOT EXISTS idx_smoking_risk_assessments_org ON public.smoking_risk_assessments(organization_id);
