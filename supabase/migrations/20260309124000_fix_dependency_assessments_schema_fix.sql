-- Add missing columns to dependency_assessments table
ALTER TABLE public.dependency_assessments 
ADD COLUMN IF NOT EXISTS assessment_details JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS total_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS signature TEXT,
ADD COLUMN IF NOT EXISTS saved_as_draft BOOLEAN DEFAULT FALSE;

-- Ensure assessment_date can hold time if needed (matching newer patterns)
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dependency_assessments' 
        AND column_name = 'assessment_date' 
        AND data_type = 'date'
    ) THEN
        ALTER TABLE public.dependency_assessments ALTER COLUMN assessment_date TYPE TIMESTAMPTZ USING assessment_date::TIMESTAMPTZ;
    END IF;
END $$;

-- Enable RLS (just in case)
ALTER TABLE public.dependency_assessments ENABLE ROW LEVEL SECURITY;

-- Refresh policies to ensure they work with potential new columns or just for safety
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
