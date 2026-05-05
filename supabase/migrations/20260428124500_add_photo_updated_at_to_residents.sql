ALTER TABLE public.residents
ADD COLUMN IF NOT EXISTS photo_updated_at TIMESTAMPTZ;
