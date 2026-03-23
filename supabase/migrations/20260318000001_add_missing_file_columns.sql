-- Add missing columns to public.files table
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS original_name TEXT;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS public_url TEXT;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id);

-- Update RLS policies to include team_id check if necessary
-- For now, organization_id check is already sufficient across most policies.
