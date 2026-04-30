-- Cleanup fallback for stale medication overdue alerts.
-- Deletes unresolved "Medication Overdue" alerts once they are at least:
--   1 hour overdue trigger + 6 hour retention = 7 hours after scheduled_time.
DELETE FROM public.alerts
WHERE type = 'medication'::public.alert_type
  AND title = 'Medication Overdue'
  AND is_resolved = false
  AND metadata ? 'intake_id'
  AND metadata ? 'scheduled_time'
  AND (
    CASE
      WHEN (metadata->>'scheduled_time') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
      THEN (metadata->>'scheduled_time')::timestamptz
      ELSE NULL
    END
  ) <= NOW() - INTERVAL '7 hours';
