-- Make team_id nullable in specimen_records
ALTER TABLE public.specimen_records ALTER COLUMN team_id DROP NOT NULL;
