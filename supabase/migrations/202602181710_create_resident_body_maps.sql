-- Create resident_body_maps table
CREATE TABLE IF NOT EXISTS public.resident_body_maps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    label TEXT,
    body_map_data JSONB DEFAULT '{"sessions": []}'::jsonb,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for resident_id
CREATE INDEX IF NOT EXISTS idx_resident_body_maps_resident_id ON public.resident_body_maps(resident_id);

-- Enable RLS
ALTER TABLE public.resident_body_maps ENABLE ROW LEVEL SECURITY;

-- Add RLS policies (adjust based on existing patterns)
-- Assuming a standard pattern where users can see data within their organization
CREATE POLICY "Users can view body maps in their organization"
ON public.resident_body_maps FOR SELECT
TO authenticated
USING (
    public.can_access_organization(organization_id)
);

CREATE POLICY "Users can insert body maps in their organization"
ON public.resident_body_maps FOR INSERT
TO authenticated
WITH CHECK (
    public.can_access_organization(organization_id)
);

CREATE POLICY "Users can update body maps in their organization"
ON public.resident_body_maps FOR UPDATE
TO authenticated
USING (
    public.can_access_organization(organization_id)
)
WITH CHECK (
    public.can_access_organization(organization_id)
);

CREATE POLICY "Users can delete body maps in their organization"
ON public.resident_body_maps FOR DELETE
TO authenticated
USING (
    public.can_access_organization(organization_id)
);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_resident_body_maps_updated_at
    BEFORE UPDATE ON public.resident_body_maps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
