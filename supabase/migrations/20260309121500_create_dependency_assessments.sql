-- Create dependency_assessments table
CREATE TABLE IF NOT EXISTS public.dependency_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assessment_details JSONB NOT NULL,
    total_score INTEGER NOT NULL,
    dependency_level TEXT NOT NULL,
    assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed_by TEXT NOT NULL,
    signature TEXT,
    saved_as_draft BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_dependency_resident_id ON public.dependency_assessments(resident_id);

-- Enable RLS
ALTER TABLE public.dependency_assessments ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "SaaS admins manage dependency_assessments" ON public.dependency_assessments;
CREATE POLICY "SaaS admins manage dependency_assessments"
    ON public.dependency_assessments FOR ALL
    TO authenticated
    USING ( public.is_saas_admin() )
    WITH CHECK ( public.is_saas_admin() );

DROP POLICY IF EXISTS "Users can view dependency assessments for their organization" ON public.dependency_assessments;
CREATE POLICY "Users can view dependency assessments for their organization"
    ON public.dependency_assessments FOR SELECT
    TO authenticated
    USING ( public.can_access_organization(organization_id) );

DROP POLICY IF EXISTS "Staff can manage dependency assessments for their organization" ON public.dependency_assessments;
CREATE POLICY "Staff can manage dependency assessments for their organization"
    ON public.dependency_assessments FOR ALL
    TO authenticated
    USING ( 
        public.can_access_organization(organization_id) 
        AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'carer')
    )
    WITH CHECK ( 
        public.can_access_organization(organization_id) 
        AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'carer')
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_dependency_assessments_updated_at ON public.dependency_assessments;
CREATE TRIGGER update_dependency_assessments_updated_at
    BEFORE UPDATE ON public.dependency_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
