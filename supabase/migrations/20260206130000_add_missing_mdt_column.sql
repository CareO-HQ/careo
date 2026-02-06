-- Add missing column to multidisciplinary_notes
-- Migration: 20260206130000_add_missing_mdt_column.sql

ALTER TABLE public.multidisciplinary_notes 
ADD COLUMN IF NOT EXISTS relative_informed_details TEXT;

-- Update RLS policies to ensure they still apply (though they should automatically)
-- No changes needed to policies themselves.
