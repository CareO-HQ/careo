-- Create night_observation_consents table
CREATE TABLE IF NOT EXISTS public.night_observation_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    assessment_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    status TEXT DEFAULT 'completed',
    saved_as_draft BOOLEAN DEFAULT false,
    
    -- Versioning & Archiving
    version INTEGER DEFAULT 1,
    is_archived BOOLEAN DEFAULT false,
    archived_at TIMESTAMPTZ,
    archived_by UUID REFERENCES auth.users(id),
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_night_obs_resident_id ON public.night_observation_consents(resident_id);
CREATE INDEX IF NOT EXISTS idx_night_obs_org_id ON public.night_observation_consents(organization_id);

-- RLS
ALTER TABLE public.night_observation_consents ENABLE ROW LEVEL SECURITY;

-- Policies (matching existing patterns)
CREATE POLICY "SaaS admins manage night_observation_consents" ON public.night_observation_consents FOR ALL TO authenticated USING (public.is_saas_admin()) WITH CHECK (public.is_saas_admin());

CREATE POLICY "Users can view night observations in their organization"
    ON public.night_observation_consents
    FOR SELECT
    TO authenticated
    USING (public.can_access_organization(organization_id));

CREATE POLICY "Staff can manage night observations in their organization"
    ON public.night_observation_consents
    FOR ALL
    TO authenticated
    USING (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'carer'))
    WITH CHECK (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'carer'));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_night_obs_updated_at
    BEFORE UPDATE ON public.night_observation_consents
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
