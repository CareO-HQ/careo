-- Create restraints_consents table
CREATE TABLE IF NOT EXISTS public.restraints_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed_by TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    assessment_data JSONB, -- Full form state
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.restraints_consents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view restraints consents for their organization"
    ON public.restraints_consents FOR SELECT
    USING (public.can_access_organization(organization_id));

CREATE POLICY "Users can insert restraints consents for their organization"
    ON public.restraints_consents FOR INSERT
    WITH CHECK (public.can_access_organization(organization_id));

CREATE POLICY "Users can update restraints consents for their organization"
    ON public.restraints_consents FOR UPDATE
    USING (public.can_access_organization(organization_id));

-- Updated at trigger
CREATE TRIGGER set_updated_at_restraints_consents
    BEFORE UPDATE ON public.restraints_consents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_restraints_consents_resident ON public.restraints_consents(resident_id);
CREATE INDEX IF NOT EXISTS idx_restraints_consents_org ON public.restraints_consents(organization_id);
