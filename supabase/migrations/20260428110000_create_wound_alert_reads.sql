-- ============================================
-- Wound alert read tracking (per-user)
-- ============================================

CREATE TABLE IF NOT EXISTS public.wound_alert_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  wound_id uuid NOT NULL REFERENCES public.wounds(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wound_alert_reads_user_wound_unique UNIQUE (user_id, wound_id)
);

CREATE INDEX IF NOT EXISTS idx_wound_alert_reads_user_id
  ON public.wound_alert_reads (user_id);

CREATE INDEX IF NOT EXISTS idx_wound_alert_reads_wound_id
  ON public.wound_alert_reads (wound_id);

CREATE INDEX IF NOT EXISTS idx_wound_alert_reads_read_at
  ON public.wound_alert_reads (read_at DESC);

ALTER TABLE public.wound_alert_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own wound alert reads" ON public.wound_alert_reads;
CREATE POLICY "Users can view their own wound alert reads"
  ON public.wound_alert_reads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own wound alert reads" ON public.wound_alert_reads;
CREATE POLICY "Users can insert their own wound alert reads"
  ON public.wound_alert_reads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own wound alert reads" ON public.wound_alert_reads;
CREATE POLICY "Users can update their own wound alert reads"
  ON public.wound_alert_reads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own wound alert reads" ON public.wound_alert_reads;
CREATE POLICY "Users can delete their own wound alert reads"
  ON public.wound_alert_reads FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_wound_alert_reads_updated_at ON public.wound_alert_reads;
CREATE TRIGGER update_wound_alert_reads_updated_at
  BEFORE UPDATE ON public.wound_alert_reads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

GRANT ALL ON TABLE public.wound_alert_reads TO authenticated, service_role;
