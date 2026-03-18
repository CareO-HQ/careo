-- Add selected_pathway column to incident_folders table
-- This stores the selected fall pathway (green/amber/red) for fall folders

ALTER TABLE incident_folders
ADD COLUMN selected_pathway TEXT CHECK (selected_pathway IN ('green', 'amber', 'red'));

COMMENT ON COLUMN incident_folders.selected_pathway IS 'Selected fall pathway (green/amber/red) for fall folders';
