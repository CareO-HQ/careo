-- Care-home–scoped common action plans (participant visibility only).
CREATE TABLE IF NOT EXISTS public.care_home_common_action_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  care_home_id TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_to TEXT NOT NULL,
  assigned_to_email TEXT,
  created_by TEXT,
  created_by_name TEXT,
  latest_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT care_home_common_action_plans_status_check
    CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue'))
);

CREATE INDEX IF NOT EXISTS idx_care_home_common_action_plans_organization_id
  ON public.care_home_common_action_plans (organization_id);
CREATE INDEX IF NOT EXISTS idx_care_home_common_action_plans_care_home_id
  ON public.care_home_common_action_plans (care_home_id);
CREATE INDEX IF NOT EXISTS idx_care_home_common_action_plans_assigned_to
  ON public.care_home_common_action_plans (assigned_to);

DROP TRIGGER IF EXISTS set_care_home_common_action_plans_updated_at ON public.care_home_common_action_plans;
CREATE TRIGGER set_care_home_common_action_plans_updated_at
  BEFORE UPDATE ON public.care_home_common_action_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.care_home_common_action_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view care_home_common_action_plans as participant"
  ON public.care_home_common_action_plans
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_audit_scope(organization_id, care_home_id, NULL)
    AND public.is_audit_action_plan_participant(assigned_to, created_by)
  );

CREATE POLICY "Staff can insert care_home_common_action_plans in scope"
  ON public.care_home_common_action_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_access_audit_scope(organization_id, care_home_id, NULL)
    AND care_home_id IS NOT NULL AND BTRIM(care_home_id) <> ''
    AND public.current_user_role() IN ('nurse', 'care_assistant', 'manager', 'owner', 'saas_admin')
    AND public.is_audit_action_plan_participant(assigned_to, created_by)
  );

CREATE POLICY "Users can update care_home_common_action_plans as participant"
  ON public.care_home_common_action_plans
  FOR UPDATE
  TO authenticated
  USING (
    public.can_access_audit_scope(organization_id, care_home_id, NULL)
    AND public.is_audit_action_plan_participant(assigned_to, created_by)
  )
  WITH CHECK (
    public.can_access_audit_scope(organization_id, care_home_id, NULL)
    AND public.is_audit_action_plan_participant(assigned_to, created_by)
  );

CREATE POLICY "Users can delete care_home_common_action_plans as participant"
  ON public.care_home_common_action_plans
  FOR DELETE
  TO authenticated
  USING (
    public.can_access_audit_scope(organization_id, care_home_id, NULL)
    AND public.is_audit_action_plan_participant(assigned_to, created_by)
  );
