-- When a care file audit completion is marked completed, clear Action Plans sidebar
-- noise by marking related action_plan / action_plan_status notifications as read for
-- each notification's target user (assignee / manager recipients). Client-side inserts
-- cannot do this for other users due to RLS on notification_read_status.

CREATE OR REPLACE FUNCTION public.mark_read_care_file_audit_action_plan_notifications(
  p_audit_response_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_read_status (notification_id, user_id, read_at)
  SELECT n.id, n.user_id, now()
  FROM public.notifications n
  INNER JOIN public.audit_care_file_action_plans p
    ON n.metadata IS NOT NULL
    AND n.metadata ? 'actionPlanId'
    AND (n.metadata->>'actionPlanId') IS NOT NULL
    AND (n.metadata->>'actionPlanId')::uuid = p.id
  WHERE p.audit_response_id = p_audit_response_id
    AND n.type IN ('action_plan', 'action_plan_status')
    AND n.user_id IS NOT NULL
  ON CONFLICT (notification_id, user_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_care_file_completion_mark_action_plan_notifs_read()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    IF TG_OP = 'INSERT' OR (OLD IS NOT NULL AND OLD.status IS DISTINCT FROM NEW.status) THEN
      PERFORM public.mark_read_care_file_audit_action_plan_notifications(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_care_file_completion_action_plan_notifs
  ON public.audit_care_file_completions;

CREATE TRIGGER trg_audit_care_file_completion_action_plan_notifs
AFTER INSERT OR UPDATE OF status ON public.audit_care_file_completions
FOR EACH ROW
EXECUTE FUNCTION public.trg_care_file_completion_mark_action_plan_notifs_read();

-- Plans (and notifications) created after the completion row is already completed:
-- mark read as soon as the notification row is inserted.
CREATE OR REPLACE FUNCTION public.trg_notification_care_file_completed_audit_mark_read()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_uuid uuid;
  resp_id uuid;
  comp_status text;
BEGIN
  IF NEW.type NOT IN ('action_plan', 'action_plan_status') THEN
    RETURN NEW;
  END IF;
  IF NEW.metadata IS NULL OR NOT (NEW.metadata ? 'actionPlanId') THEN
    RETURN NEW;
  END IF;

  BEGIN
    plan_uuid := (NEW.metadata->>'actionPlanId')::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RETURN NEW;
  END;

  IF plan_uuid IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.audit_response_id
  INTO resp_id
  FROM public.audit_care_file_action_plans p
  WHERE p.id = plan_uuid
  LIMIT 1;

  IF resp_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT c.status
  INTO comp_status
  FROM public.audit_care_file_completions c
  WHERE c.id = resp_id
  LIMIT 1;

  IF comp_status = 'completed' AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notification_read_status (notification_id, user_id, read_at)
    VALUES (NEW.id, NEW.user_id, now())
    ON CONFLICT (notification_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifications_care_file_audit_completed_read
  ON public.notifications;

CREATE TRIGGER trg_notifications_care_file_audit_completed_read
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.trg_notification_care_file_completed_audit_mark_read();
