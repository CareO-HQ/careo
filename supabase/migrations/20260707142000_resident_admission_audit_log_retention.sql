-- Index and one-time purge for resident admission audit log 30-day retention.
-- Ongoing purges are handled by /api/cron/resident-admission-audit-cleanup (Vercel cron).

CREATE INDEX IF NOT EXISTS idx_resident_admission_audit_logs_created_at
  ON public.resident_admission_audit_logs (created_at);

DELETE FROM public.resident_admission_audit_logs
WHERE created_at < NOW() - INTERVAL '30 days';
