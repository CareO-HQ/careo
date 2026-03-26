-- Create personal_profiles table
CREATE TABLE IF NOT EXISTS public.personal_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    assessment_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'draft',
    assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed_by TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    version INTEGER NOT NULL DEFAULT 1,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.personal_profiles ENABLE ROW LEVEL SECURITY;

-- Policy for select
CREATE POLICY "Users can view personal profiles for their organization" ON public.personal_profiles
    FOR SELECT
    USING (public.can_access_organization(organization_id));

-- Policy for insert
CREATE POLICY "Users can insert personal profiles for their organization" ON public.personal_profiles
    FOR INSERT
    WITH CHECK (public.can_access_organization(organization_id));

-- Policy for update
CREATE POLICY "Users can update personal profiles for their organization" ON public.personal_profiles
    FOR UPDATE
    USING (public.can_access_organization(organization_id));

-- Add trigger for updated_at
CREATE TRIGGER update_personal_profiles_updated_at
    BEFORE UPDATE ON public.personal_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add index for resident_id
CREATE INDEX IF NOT EXISTS idx_personal_profiles_resident_id ON public.personal_profiles(resident_id);
