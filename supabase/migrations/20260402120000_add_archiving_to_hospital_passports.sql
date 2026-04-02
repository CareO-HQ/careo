-- Add archiving columns to hospital_passports
ALTER TABLE public.hospital_passports 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Index for filtering active/archived passports
CREATE INDEX IF NOT EXISTS idx_hospital_passports_is_archived ON public.hospital_passports(is_archived);
