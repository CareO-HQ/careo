-- Migration: add_archived_at_to_capacity_consents

ALTER TABLE public.capacity_consents
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;
