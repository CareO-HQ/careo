-- Migration: 20260205140000_fix_personal_interests_constraint.sql
-- Description: Adds UNIQUE constraint to resident_id in personal_interests table to support upsert

ALTER TABLE public.personal_interests ADD CONSTRAINT personal_interests_resident_id_key UNIQUE (resident_id);
