-- Migration to add preferred_shift_id to public.users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS preferred_shift_id UUID REFERENCES public.shift_templates(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.users.preferred_shift_id IS 'Preferred shift template for auto-scheduling priority';
