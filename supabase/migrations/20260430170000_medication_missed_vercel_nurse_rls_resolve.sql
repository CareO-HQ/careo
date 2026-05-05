-- Medication alerts: Vercel Cron replaces pg_cron edge invocation; nurse-only RLS; fix auto-resolve trigger.

-- 1. Unschedule Supabase pg_cron job (generation runs via Vercel → /api/cron/medication-missed-alerts)
DO $$
BEGIN
  PERFORM cron.unschedule('check-medication-alerts');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 2. Column referenced by medication intake resolve trigger
ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS auto_resolved BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS resolution_note TEXT;

-- 3. RLS: medication alerts visible only to nurses (not owners)
DROP POLICY IF EXISTS "Users can read relevant alerts" ON public.alerts;

CREATE POLICY "Users can read relevant alerts"
  ON public.alerts FOR SELECT
  USING (
    public.can_access_organization(auth.uid(), organization_id)
    AND (
      (type = 'medication' AND public.get_user_role(auth.uid()) = 'nurse')
      OR
      (type != 'medication' AND (
        target_roles IS NULL
        OR array_length(target_roles, 1) IS NULL
        OR public.get_user_role(auth.uid()) = ANY(target_roles)
        OR public.get_user_role(auth.uid()) IN ('owner', 'manager')
      ))
    )
  );

-- 4. Auto-resolve medication alerts when intake leaves scheduled (status and/or legacy state)
CREATE OR REPLACE FUNCTION public.handle_medication_intake_resolve_alerts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_note text;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.status = 'scheduled' AND NEW.status IS DISTINCT FROM 'scheduled')
    OR (
      OLD.state IS NOT DISTINCT FROM 'scheduled'::public.intake_state
      AND NEW.state IS DISTINCT FROM 'scheduled'::public.intake_state
    )
  ) THEN
    RETURN NEW;
  END IF;

  v_note := 'Auto-resolved as medication intake updated (status '
    || COALESCE(NEW.status, 'null')
    || ', state '
    || COALESCE(NEW.state::text, 'null')
    || ')';

  UPDATE public.alerts
  SET
    is_resolved = true,
    resolved_at = NOW(),
    auto_resolved = true,
    resolution_note = v_note
  WHERE
    resident_id = NEW.resident_id
    AND type = 'medication'::public.alert_type
    AND is_resolved = false
    AND (metadata->>'intake_id')::uuid = NEW.id;

  RETURN NEW;
END;
$$;
