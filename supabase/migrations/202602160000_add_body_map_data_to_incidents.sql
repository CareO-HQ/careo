-- Add body_map_data column to incidents table
ALTER TABLE public.incidents
ADD COLUMN IF NOT EXISTS body_map_data JSONB DEFAULT '{"entries": []}'::jsonb;

-- Update status comment
COMMENT ON COLUMN public.incidents.body_map_data IS 'Stored body mapping entries (wounds, rashes, etc.) as JSONB';
