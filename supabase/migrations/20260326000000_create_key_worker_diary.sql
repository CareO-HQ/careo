-- Create key_worker_diary table
CREATE TABLE IF NOT EXISTS key_worker_diary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  care_home_id UUID REFERENCES care_homes(id) ON DELETE SET NULL,

  -- Entry details
  date DATE NOT NULL,
  time TEXT NOT NULL, -- HH:mm format
  comments TEXT NOT NULL,

  -- Author information
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_key_worker_diary_resident_id ON key_worker_diary(resident_id);
CREATE INDEX IF NOT EXISTS idx_key_worker_diary_organization_id ON key_worker_diary(organization_id);
CREATE INDEX IF NOT EXISTS idx_key_worker_diary_date ON key_worker_diary(date DESC);
CREATE INDEX IF NOT EXISTS idx_key_worker_diary_created_at ON key_worker_diary(created_at DESC);

-- Enable Row Level Security
ALTER TABLE key_worker_diary ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view key worker diary entries in their organization" ON key_worker_diary;
DROP POLICY IF EXISTS "Users can create key worker diary entries in their organization" ON key_worker_diary;
DROP POLICY IF EXISTS "Users can update key worker diary entries in their organization" ON key_worker_diary;
DROP POLICY IF EXISTS "Users can delete key worker diary entries in their organization" ON key_worker_diary;

-- RLS Policies
CREATE POLICY "Users can view key worker diary entries in their organization"
  ON key_worker_diary
  FOR SELECT
  USING (can_access_organization(organization_id));

CREATE POLICY "Users can create key worker diary entries in their organization"
  ON key_worker_diary
  FOR INSERT
  WITH CHECK (can_access_organization(organization_id));

CREATE POLICY "Users can update key worker diary entries in their organization"
  ON key_worker_diary
  FOR UPDATE
  USING (can_access_organization(organization_id));

CREATE POLICY "Users can delete key worker diary entries in their organization"
  ON key_worker_diary
  FOR DELETE
  USING (can_access_organization(organization_id));

-- Add comment
COMMENT ON TABLE key_worker_diary IS 'Key Worker Diary entries for residents - minimum one entry per month';
