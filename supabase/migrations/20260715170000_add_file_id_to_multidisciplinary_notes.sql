-- Migration: 20260715170000_add_file_id_to_multidisciplinary_notes.sql
-- Add file_id foreign key column to multidisciplinary_notes to link notes with attached files

ALTER TABLE public.multidisciplinary_notes ADD COLUMN IF NOT EXISTS file_id UUID REFERENCES public.files(id) ON DELETE SET NULL;
