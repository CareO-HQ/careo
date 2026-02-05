CREATE TABLE IF NOT EXISTS public.diet_information (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    allergies TEXT,
    dietary_requirements TEXT,
    texture_grade TEXT,
    fluid_consistency TEXT,
    likes TEXT,
    dislikes TEXT,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(resident_id)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_diet_information_updated_at ON public.diet_information;
CREATE TRIGGER update_diet_information_updated_at
BEFORE UPDATE ON public.diet_information
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.diet_information ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view diet_information for their organization"
ON public.diet_information FOR SELECT
USING (
  organization_id = (auth.jwt() -> 'app_metadata' ->> 'active_organization_id')::UUID
  OR
  (auth.jwt() -> 'app_metadata' ->> 'is_saas_admin')::boolean = true
);

CREATE POLICY "Users can insert diet_information for their organization"
ON public.diet_information FOR INSERT
WITH CHECK (
  organization_id = (auth.jwt() -> 'app_metadata' ->> 'active_organization_id')::UUID
);

CREATE POLICY "Users can update diet_information for their organization"
ON public.diet_information FOR UPDATE
USING (
  organization_id = (auth.jwt() -> 'app_metadata' ->> 'active_organization_id')::UUID
  OR
  (auth.jwt() -> 'app_metadata' ->> 'is_saas_admin')::boolean = true
);
