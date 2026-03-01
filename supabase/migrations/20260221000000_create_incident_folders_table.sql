-- Create incident_folders table
CREATE TABLE IF NOT EXISTS incident_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_incident_folders_resident_id ON incident_folders(resident_id);

-- Add RLS policies
ALTER TABLE incident_folders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "SaaS admins manage all incident folders" ON incident_folders;
DROP POLICY IF EXISTS "Users can view incident folders for accessible residents" ON incident_folders;
DROP POLICY IF EXISTS "Staff can manage incident folders" ON incident_folders;

-- 1. SaaS Admin can manage all incident folders
CREATE POLICY "SaaS admins manage all incident folders"
  ON incident_folders FOR ALL
  TO authenticated
  USING ( public.is_saas_admin() )
  WITH CHECK ( public.is_saas_admin() );

-- 2. Users can view incident folders for residents in their organization
CREATE POLICY "Users can view incident folders for accessible residents"
  ON incident_folders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM residents r
      WHERE r.id = incident_folders.resident_id
      AND public.can_access_organization(r.organization_id)
    )
  );

-- 3. Staff can manage incident folders for residents in their organization
CREATE POLICY "Staff can manage incident folders"
  ON incident_folders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM residents r
      WHERE r.id = incident_folders.resident_id
      AND public.can_access_organization(r.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM residents r
      WHERE r.id = incident_folders.resident_id
      AND public.can_access_organization(r.organization_id)
    )
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_incident_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER incident_folders_updated_at
  BEFORE UPDATE ON incident_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_incident_folders_updated_at();
