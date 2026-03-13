-- Create blood monitoring records table
CREATE TABLE blood_monitoring_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  bm_level TEXT NOT NULL,
  site_used TEXT NOT NULL,
  signature TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_blood_monitoring_resident_id ON blood_monitoring_records(resident_id);
CREATE INDEX idx_blood_monitoring_org_id ON blood_monitoring_records(organization_id);
CREATE INDEX idx_blood_monitoring_date ON blood_monitoring_records(date);

-- Enable RLS
ALTER TABLE blood_monitoring_records ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view blood monitoring records for their organizations"
  ON blood_monitoring_records FOR SELECT
  USING (
    organization_id IN (
      SELECT get_active_organization_id()
    )
  );

CREATE POLICY "Users can insert blood monitoring records for their organizations"
  ON blood_monitoring_records FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT get_active_organization_id()
    )
  );

CREATE POLICY "Users can update blood monitoring records for their organizations"
  ON blood_monitoring_records FOR UPDATE
  USING (
    organization_id IN (
      SELECT get_active_organization_id()
    )
  );

CREATE POLICY "Users can delete blood monitoring records for their organizations"
  ON blood_monitoring_records FOR DELETE
  USING (
    organization_id IN (
      SELECT get_active_organization_id()
    )
  );
