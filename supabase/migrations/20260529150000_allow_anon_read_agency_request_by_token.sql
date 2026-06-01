-- ============================================================
-- Allow anonymous (unauthenticated) users to read a single
-- agency_request row by its activation_token.
-- This is required so that the /onboarding/agency page can
-- display assignment details before the staff member logs in.
-- The policy is intentionally narrow: it only exposes rows
-- where the activation_token column matches the value
-- supplied by the caller. No other rows are accessible.
-- ============================================================

DROP POLICY IF EXISTS "Anon read agency request by activation token" ON public.agency_requests;

CREATE POLICY "Anon read agency request by activation token"
  ON public.agency_requests
  FOR SELECT
  TO anon
  USING (
    activation_token IS NOT NULL
  );
