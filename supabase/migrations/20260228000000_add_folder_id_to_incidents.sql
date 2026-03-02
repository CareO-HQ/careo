-- Add folder_id column to incidents table to link incidents with incident_folders
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.incident_folders(id) ON DELETE SET NULL;

-- Index for faster lookup of incidents by folder
CREATE INDEX IF NOT EXISTS idx_incidents_folder_id ON public.incidents(folder_id);

-- Comment for clarity
COMMENT ON COLUMN public.incidents.folder_id IS 'Links an incident report to a specific incident folder. Each folder can have one incident report.';
