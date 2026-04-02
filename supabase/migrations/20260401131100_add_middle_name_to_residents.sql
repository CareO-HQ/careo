-- Migration to add middle_name to residents table
ALTER TABLE public.residents
ADD COLUMN IF NOT EXISTS middle_name text;
