-- Create weight_records table for tracking resident weights over time
CREATE TABLE IF NOT EXISTS public.weight_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  care_home_id UUID REFERENCES public.care_homes(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,

  -- Weight data
  weight_kg NUMERIC(5, 2) NOT NULL,
  weight_lb NUMERIC(5, 2),
  unit TEXT NOT NULL DEFAULT 'kg' CHECK (unit IN ('kg', 'lb', 'st')),

  -- Measurement context
  measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  measurement_time TIME,
  measured_by TEXT,
  measured_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_weight_records_resident_id ON public.weight_records(resident_id);
CREATE INDEX IF NOT EXISTS idx_weight_records_organization_id ON public.weight_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_weight_records_care_home_id ON public.weight_records(care_home_id);
CREATE INDEX IF NOT EXISTS idx_weight_records_measurement_date ON public.weight_records(measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_weight_records_resident_date ON public.weight_records(resident_id, measurement_date DESC);

-- Enable RLS
ALTER TABLE public.weight_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "SaaS admins manage weight_records" ON public.weight_records;
CREATE POLICY "SaaS admins manage weight_records"
    ON public.weight_records FOR ALL TO authenticated
    USING (public.is_saas_admin()) WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view weight records in their organization" ON public.weight_records;
CREATE POLICY "Users can view weight records in their organization"
    ON public.weight_records FOR SELECT
    USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Users can insert weight records in their organization" ON public.weight_records;
CREATE POLICY "Users can insert weight records in their organization"
    ON public.weight_records FOR INSERT
    WITH CHECK (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Users can update weight records in their organization" ON public.weight_records;
CREATE POLICY "Users can update weight records in their organization"
    ON public.weight_records FOR UPDATE
    USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Users can delete weight records in their organization" ON public.weight_records;
CREATE POLICY "Users can delete weight records in their organization"
    ON public.weight_records FOR DELETE
    USING (public.can_access_organization(organization_id));

-- Updated at trigger
DROP TRIGGER IF EXISTS set_updated_at_weight_records ON public.weight_records;
CREATE TRIGGER set_updated_at_weight_records
    BEFORE UPDATE ON public.weight_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
