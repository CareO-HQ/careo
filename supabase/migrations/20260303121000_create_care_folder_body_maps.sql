-- Create care_folder_body_maps table to store a single body map
-- per resident + care-file-v2 folder (e.g. v2-medication, v2-hygiene).

CREATE TABLE IF NOT EXISTS public.care_folder_body_maps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    folder_key TEXT NOT NULL,
    body_map_data JSONB DEFAULT '{"sessions": []}'::jsonb,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_resident_folder_body_map UNIQUE (resident_id, folder_key)
);

CREATE INDEX IF NOT EXISTS idx_care_folder_body_maps_resident_folder
    ON public.care_folder_body_maps(resident_id, folder_key);

ALTER TABLE public.care_folder_body_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view care folder body maps in their organization"
ON public.care_folder_body_maps FOR SELECT
TO authenticated
USING (
    public.can_access_organization(organization_id)
);

CREATE POLICY "Users can insert care folder body maps in their organization"
ON public.care_folder_body_maps FOR INSERT
TO authenticated
WITH CHECK (
    public.can_access_organization(organization_id)
);

CREATE POLICY "Users can update care folder body maps in their organization"
ON public.care_folder_body_maps FOR UPDATE
TO authenticated
USING (
    public.can_access_organization(organization_id)
)
WITH CHECK (
    public.can_access_organization(organization_id)
);

CREATE POLICY "Users can delete care folder body maps in their organization"
ON public.care_folder_body_maps FOR DELETE
TO authenticated
USING (
    public.can_access_organization(organization_id)
);

CREATE TRIGGER update_care_folder_body_maps_updated_at
    BEFORE UPDATE ON public.care_folder_body_maps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

