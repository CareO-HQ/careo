-- Migration: 20260715160000_add_title_to_multidisciplinary_notes.sql
-- Add title column to multidisciplinary_notes to support custom note renaming

ALTER TABLE public.multidisciplinary_notes ADD COLUMN IF NOT EXISTS title TEXT;
