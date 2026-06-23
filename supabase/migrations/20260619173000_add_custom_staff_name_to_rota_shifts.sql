-- Migration to add custom_staff_name to public.rota_shifts
ALTER TABLE public.rota_shifts
ADD COLUMN IF NOT EXISTS custom_staff_name TEXT;
