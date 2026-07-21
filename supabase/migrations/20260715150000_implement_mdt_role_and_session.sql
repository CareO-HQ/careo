-- Implement MDT role and note profession
-- Migration: 20260715150000_implement_mdt_role_and_session.sql

-- 1. Add 'mdt' to user_role type (using anonymous block to support IF NOT EXISTS behavior or check)
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'mdt';

-- 2. Add 'profession' column to multidisciplinary_notes
ALTER TABLE public.multidisciplinary_notes 
ADD COLUMN IF NOT EXISTS profession TEXT;

-- 3. Backfill existing notes to default their profession
-- Default 'gp-' team members to 'GP', others to 'Other' or mapped Designation if possible
UPDATE public.multidisciplinary_notes n
SET profession = CASE 
  WHEN n.team_member_id IS NULL AND n.team_member_name ILIKE '%GP%' THEN 'GP'
  WHEN n.team_member_id IS NULL AND n.team_member_name ILIKE '%General Practitioner%' THEN 'GP'
  WHEN n.team_member_id IS NULL AND n.team_member_name ILIKE '%Care Manager%' THEN 'Social Worker'
  ELSE COALESCE(
    (SELECT designation FROM public.multidisciplinary_care_team t WHERE t.id = n.team_member_id),
    'Other'
  )
END
WHERE profession IS NULL;
