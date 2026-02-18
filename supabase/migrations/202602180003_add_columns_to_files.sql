-- Migration: Add missing columns to files table
-- Date: 2026-02-18

ALTER TABLE public.files
  ADD COLUMN IF NOT EXISTS folder_name TEXT,
  ADD COLUMN IF NOT EXISTS original_name TEXT,
  ADD COLUMN IF NOT EXISTS public_url TEXT;
