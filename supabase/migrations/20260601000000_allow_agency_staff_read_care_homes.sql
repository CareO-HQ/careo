-- Migration: Allow agency staff to read care homes
-- Date: June 1, 2026

CREATE POLICY "Agency staff read care homes"
  ON public.care_homes FOR SELECT
  TO authenticated
  USING (
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_agency_staff')::BOOLEAN, false)
  );
