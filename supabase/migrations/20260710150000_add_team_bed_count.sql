-- Add per-unit bed capacity to teams (units within a care home)
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS bed_count INTEGER;

ALTER TABLE public.teams
  DROP CONSTRAINT IF EXISTS teams_bed_count_positive;

ALTER TABLE public.teams
  ADD CONSTRAINT teams_bed_count_positive
  CHECK (bed_count IS NULL OR bed_count > 0);
