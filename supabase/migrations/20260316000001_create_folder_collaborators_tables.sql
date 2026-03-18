-- Create incident_folder_collaborators table
CREATE TABLE IF NOT EXISTS incident_folder_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES incident_folders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(folder_id, user_id)
);

-- Create wound_folder_collaborators table
CREATE TABLE IF NOT EXISTS wound_folder_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wound_folder_id UUID NOT NULL REFERENCES wound_folders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(wound_folder_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_incident_folder_collaborators_folder_id
  ON incident_folder_collaborators(folder_id);

CREATE INDEX IF NOT EXISTS idx_incident_folder_collaborators_user_id
  ON incident_folder_collaborators(user_id);

CREATE INDEX IF NOT EXISTS idx_wound_folder_collaborators_wound_folder_id
  ON wound_folder_collaborators(wound_folder_id);

CREATE INDEX IF NOT EXISTS idx_wound_folder_collaborators_user_id
  ON wound_folder_collaborators(user_id);

-- Add comments
COMMENT ON TABLE incident_folder_collaborators IS 'Tracks users who have access to incident folders';
COMMENT ON TABLE wound_folder_collaborators IS 'Tracks users who have access to wound folders';

-- Enable RLS
ALTER TABLE incident_folder_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE wound_folder_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for incident_folder_collaborators
CREATE POLICY "Users can view collaborators for folders they have access to"
  ON incident_folder_collaborators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM incident_folders
      WHERE incident_folders.id = incident_folder_collaborators.folder_id
    )
  );

CREATE POLICY "Users can add collaborators to folders they have access to"
  ON incident_folder_collaborators FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM incident_folders
      WHERE incident_folders.id = incident_folder_collaborators.folder_id
    )
  );

CREATE POLICY "Users can remove collaborators from folders they have access to"
  ON incident_folder_collaborators FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM incident_folders
      WHERE incident_folders.id = incident_folder_collaborators.folder_id
    )
  );

-- RLS Policies for wound_folder_collaborators
CREATE POLICY "Users can view collaborators for wound folders they have access to"
  ON wound_folder_collaborators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wound_folders
      WHERE wound_folders.id = wound_folder_collaborators.wound_folder_id
    )
  );

CREATE POLICY "Users can add collaborators to wound folders they have access to"
  ON wound_folder_collaborators FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wound_folders
      WHERE wound_folders.id = wound_folder_collaborators.wound_folder_id
    )
  );

CREATE POLICY "Users can remove collaborators from wound folders they have access to"
  ON wound_folder_collaborators FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM wound_folders
      WHERE wound_folders.id = wound_folder_collaborators.wound_folder_id
    )
  );
