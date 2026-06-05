-- Migration: Allow agency staff to read teams
-- Date: June 1, 2026

CREATE POLICY "Agency staff read teams"
  ON public.teams FOR SELECT
  TO authenticated
  USING (
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_agency_staff')::BOOLEAN, false)
  );
