-- ============================================
-- Schedule Daily Medication Intake Generation via pg_cron
-- Migration: 202602122300_schedule_intake_generation.sql
-- Description: Uses pg_cron + pg_net to invoke the 
--              generate-daily-medication-intakes edge function at 00:01 UK time daily.
-- ============================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Schedule the cron job
-- Runs at 00:01 UTC daily. During BST, this is 01:01 UK time, which is acceptable.
-- The edge function itself handles UK timezone logic.
SELECT cron.schedule(
  'generate-daily-medication-intakes',
  '1 0 * * *', -- At 00:01 UTC every day
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/generate-daily-medication-intakes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
