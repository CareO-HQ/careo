-- Add columns to track alert notifications in medication_intakes
ALTER TABLE public.medication_intakes
ADD COLUMN IF NOT EXISTS pre_alert_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS overdue_alert_sent_at TIMESTAMPTZ;

-- Create index for efficient querying of pending alerts
CREATE INDEX IF NOT EXISTS idx_medication_intakes_alert_tracking 
ON public.medication_intakes(scheduled_time, status, pre_alert_sent_at, overdue_alert_sent_at);
