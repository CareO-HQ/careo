-- Create braden_risk_assessments table
CREATE TABLE IF NOT EXISTS public.braden_risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    assessment_details JSONB NOT NULL,
    risk_score INTEGER NOT NULL,
    risk_level TEXT NOT NULL,
    assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed_by TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_braden_resident_id ON public.braden_risk_assessments(resident_id);

-- Enable RLS
ALTER TABLE public.braden_risk_assessments ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "SaaS admins manage braden_risk_assessments" ON public.braden_risk_assessments;
CREATE POLICY "SaaS admins manage braden_risk_assessments"
    ON public.braden_risk_assessments FOR ALL
    TO authenticated
    USING ( public.is_saas_admin() )
    WITH CHECK ( public.is_saas_admin() );

DROP POLICY IF EXISTS "Users can view assessments for their organization" ON public.braden_risk_assessments;
CREATE POLICY "Users can view assessments for their organization"
    ON public.braden_risk_assessments FOR SELECT
    TO authenticated
    USING ( public.can_access_organization(organization_id) );

DROP POLICY IF EXISTS "Staff can manage assessments for their organization" ON public.braden_risk_assessments;
CREATE POLICY "Staff can manage assessments for their organization"
    ON public.braden_risk_assessments FOR ALL
    TO authenticated
    USING ( 
        public.can_access_organization(organization_id) 
        AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')
    )
    WITH CHECK ( 
        public.can_access_organization(organization_id) 
        AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_braden_risk_assessments_updated_at ON public.braden_risk_assessments;
CREATE TRIGGER update_braden_risk_assessments_updated_at
    BEFORE UPDATE ON public.braden_risk_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
