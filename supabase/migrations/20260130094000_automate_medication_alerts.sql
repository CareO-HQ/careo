-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule existing cron job if it exists (idempotent - safe to run multiple times)
-- This ensures the migration can be run multiple times without creating duplicates
DO $$
BEGIN
  -- cron.unschedule throws an error if the job doesn't exist, so we catch and ignore it
  PERFORM cron.unschedule('check-medication-alerts');
EXCEPTION
  WHEN OTHERS THEN
    -- Job doesn't exist, which is fine - we'll create it below
    NULL;
END $$;

-- Add target_roles column to alerts table if it doesn't exist
ALTER TABLE public.alerts 
ADD COLUMN IF NOT EXISTS target_roles TEXT[];

-- Schedule the medication alert check every 2 minutes
-- This calls the Edge Function which sends alerts every 2 minutes with time remaining
-- Note: Uses standard local Supabase anon key for authorization header
-- The edge function itself uses SUPABASE_SERVICE_ROLE_KEY env var for database operations
-- For production, update this to use the actual service role key from environment
SELECT cron.schedule(
  'check-medication-alerts',
  '*/2 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'http://host.docker.internal:54321/functions/v1/check-medication-alerts',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"}'::jsonb
    )
  $$
);

-- Enable RLS on alerts table if not already enabled
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can read relevant alerts" ON public.alerts;

-- Create new RLS policy that restricts medication alerts to owner and nurse roles only
CREATE POLICY "Users can read relevant alerts"
  ON public.alerts FOR SELECT
  USING (
    public.can_access_organization(auth.uid(), organization_id)
    AND (
      -- For medication alerts: only owner and nurse can see
      (type = 'medication' AND public.get_user_role(auth.uid()) IN ('owner', 'nurse'))
      OR
      -- For other alerts: use target_roles if specified, or allow all if NULL
      (type != 'medication' AND (
        target_roles IS NULL
        OR array_length(target_roles, 1) IS NULL
        OR public.get_user_role(auth.uid()) = ANY(target_roles)
        OR public.get_user_role(auth.uid()) IN ('owner', 'manager')
      ))
    )
  );
