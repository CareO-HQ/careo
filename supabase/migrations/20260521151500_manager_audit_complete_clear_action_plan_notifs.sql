-- When a manager audit completion is saved, clear Action Plans sidebar
-- noise by marking related action_plan / action_plan_status notifications as read for
-- each notification's target user (assignee / manager recipients).
-- Additionally, remove the action plans from the live audit_manager_action_plans table
-- since they are already saved historically in the manager_audit_history row's data.

CREATE OR REPLACE FUNCTION public.trg_manager_audit_completion_mark_action_plan_notifs_read()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_ids uuid[];
BEGIN
  -- Extract plan IDs from the JSON data.
  -- Depending on the type of audit, they are stored in data.actionPlans (generic manager audits)
  -- or data.actionPlansSnapshot (resident-based care file manager audits).
  IF NEW.data IS NOT NULL THEN
    IF NEW.audit_type_id LIKE 'resident-0-%' AND jsonb_typeof(NEW.data->'actionPlansSnapshot') = 'array' THEN
      SELECT array_agg((plan->>'id')::uuid)
      INTO v_plan_ids
      FROM jsonb_array_elements(NEW.data->'actionPlansSnapshot') plan
      WHERE plan->>'id' IS NOT NULL;
    ELSIF jsonb_typeof(NEW.data->'actionPlans') = 'array' THEN
      SELECT array_agg((plan->>'id')::uuid)
      INTO v_plan_ids
      FROM jsonb_array_elements(NEW.data->'actionPlans') plan
      WHERE plan->>'id' IS NOT NULL;
    END IF;
  END IF;

  -- If we found plan IDs, perform cleanup.
  IF v_plan_ids IS NOT NULL AND array_length(v_plan_ids, 1) > 0 THEN
    -- 1. Mark related notifications as read.
    INSERT INTO public.notification_read_status (notification_id, user_id, read_at)
    SELECT n.id, n.user_id, now()
    FROM public.notifications n
    WHERE n.metadata IS NOT NULL
      AND n.metadata ? 'actionPlanId'
      AND (n.metadata->>'actionPlanId')::uuid = ANY(v_plan_ids)
      AND n.type IN ('action_plan', 'action_plan_status')
      AND n.user_id IS NOT NULL
    ON CONFLICT (notification_id, user_id) DO NOTHING;

    -- 2. Delete from live audit_manager_action_plans table.
    DELETE FROM public.audit_manager_action_plans
    WHERE id = ANY(v_plan_ids);
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Prevent trigger errors from blocking manager audit submission
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_manager_audit_history_completion_action_plan_notifs
  ON public.manager_audit_history;

CREATE TRIGGER trg_manager_audit_history_completion_action_plan_notifs
AFTER INSERT ON public.manager_audit_history
FOR EACH ROW
EXECUTE FUNCTION public.trg_manager_audit_completion_mark_action_plan_notifs_read();
