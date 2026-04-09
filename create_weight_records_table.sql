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
DROP POLICY IF EXISTS "Users can view weight records in their scope" ON public.weight_records;
CREATE POLICY "Users can view weight records in their scope"
  ON public.weight_records FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert weight records in their organization" ON public.weight_records;
CREATE POLICY "Users can insert weight records in their organization"
  ON public.weight_records FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own weight records" ON public.weight_records;
CREATE POLICY "Users can update their own weight records"
  ON public.weight_records FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own weight records" ON public.weight_records;
CREATE POLICY "Users can delete their own weight records"
  ON public.weight_records FOR DELETE
  USING (created_by = auth.uid());

-- Trigger function
CREATE OR REPLACE FUNCTION update_weight_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS weight_records_updated_at ON public.weight_records;
CREATE TRIGGER weight_records_updated_at
  BEFORE UPDATE ON public.weight_records
  FOR EACH ROW
  EXECUTE FUNCTION update_weight_records_updated_at();
