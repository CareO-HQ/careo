-- Align audit_manager_action_plans with other audit_*_action_plans (updateActionPlanStatus writes latest_comment).
ALTER TABLE public.audit_manager_action_plans
  ADD COLUMN IF NOT EXISTS latest_comment TEXT;
