-- Migration: add_versioning_to_capacity_consents

ALTER TABLE public.capacity_consents
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active'::text,
ADD COLUMN IF NOT EXISTS version_number integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS previous_version_id uuid REFERENCES public.capacity_consents(id),
ADD COLUMN IF NOT EXISTS completed_by text;
