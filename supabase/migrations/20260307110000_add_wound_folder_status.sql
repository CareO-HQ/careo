-- Add status and next_review_date to wound_folders table
ALTER TABLE public.wound_folders
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'healing', 'healed', 'under_review')),
ADD COLUMN IF NOT EXISTS next_review_date DATE,
ADD COLUMN IF NOT EXISTS body_map_data JSONB;
