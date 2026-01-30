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

-- Schedule the medication alert check every 5 minutes (for testing)
-- This calls the Edge Function which now includes countdown logic.
SELECT cron.schedule(
  'check-medication-alerts',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'http://host.docker.internal:54321/functions/v1/check-medication-alerts',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz"}'::jsonb
    )
  $$
);
