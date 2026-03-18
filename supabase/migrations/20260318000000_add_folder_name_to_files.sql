-- Add folder_name column to public.files table
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS folder_name TEXT;

-- Update existing records if possible (optional, but good for consistency)
-- If we had a way to map folder_id to folder_name, we could do it here, 
-- but since these are "virtual" folders from the config, we'll just leave them null for now.
