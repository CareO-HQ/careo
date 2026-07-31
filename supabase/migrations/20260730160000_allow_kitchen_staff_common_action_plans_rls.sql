-- Migration: 20260730160000_allow_kitchen_staff_common_action_plans_rls.sql
-- Allow kitchen_staff role to insert into care_home_common_action_plans

DROP POLICY IF EXISTS "Staff can insert care_home_common_action_plans in scope" ON public.care_home_common_action_plans;

CREATE POLICY "Staff can insert care_home_common_action_plans in scope"
  ON public.care_home_common_action_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_access_audit_scope(organization_id, care_home_id, NULL)
    AND care_home_id IS NOT NULL AND BTRIM(care_home_id) <> ''
    AND public.current_user_role() IN ('nurse', 'care_assistant', 'manager', 'owner', 'saas_admin', 'kitchen_staff')
    AND public.is_audit_action_plan_participant(assigned_to, created_by)
  );
