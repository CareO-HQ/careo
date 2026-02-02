-- Create alert_dismissals table to track per-user alert dismissals
-- This allows each user to dismiss alerts independently without affecting other users

CREATE TABLE IF NOT EXISTS public.alert_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(alert_id, user_id)
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_alert_dismissals_alert_id ON public.alert_dismissals(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_dismissals_user_id ON public.alert_dismissals(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_dismissals_composite ON public.alert_dismissals(alert_id, user_id);

-- Enable RLS
ALTER TABLE public.alert_dismissals ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own dismissals
CREATE POLICY "Users can view their own dismissals"
  ON public.alert_dismissals FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own dismissals
CREATE POLICY "Users can create their own dismissals"
  ON public.alert_dismissals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own dismissals (to re-show alerts if needed)
CREATE POLICY "Users can delete their own dismissals"
  ON public.alert_dismissals FOR DELETE
  USING (auth.uid() = user_id);
