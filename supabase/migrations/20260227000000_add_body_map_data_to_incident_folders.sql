-- Add body_map_data JSONB column to incident_folders
-- Each incident folder stores its own single body map (separate from hospital passport body maps)
ALTER TABLE incident_folders
  ADD COLUMN IF NOT EXISTS body_map_data JSONB DEFAULT '{"sessions": []}'::jsonb;

-- Add a comment for clarity
COMMENT ON COLUMN incident_folders.body_map_data IS 'Stores body map session data specific to this incident folder. Separate from resident_body_maps used by hospital passports.';
