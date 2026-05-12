-- Align resident/care file/governance/clinical/environment action plan SELECT and UPDATE
-- with audit_manager_action_plans: managers/owners/saas_admin see all in scope; other roles
-- (e.g. nurse) only if participant (assignee or creator per is_audit_action_plan_participant).

DROP POLICY IF EXISTS "Users can view audit_resident_action_plans in scope" ON public.audit_resident_action_plans;

CREATE POLICY "Users can view audit_resident_action_plans in scope"
  ON public.audit_resident_action_plans FOR SELECT
  TO authenticated
  USING (
    public.can_access_audit_scope(organization_id, care_home_id::TEXT, resident_id)
    AND (
      public.current_user_role() IN ('owner', 'manager', 'saas_admin')
      OR public.is_audit_action_plan_participant(assigned_to, created_by)
    )
  );

DROP POLICY IF EXISTS "Users can update audit_resident_action_plans in scope" ON public.audit_resident_action_plans;

CREATE POLICY "Users can update audit_resident_action_plans in scope"
  ON public.audit_resident_action_plans FOR UPDATE
  TO authenticated
  USING (
    public.can_access_audit_scope(organization_id, care_home_id::TEXT, resident_id)
    AND (
      public.current_user_role() IN ('owner', 'manager', 'saas_admin')
      OR public.is_audit_action_plan_participant(assigned_to, created_by)
    )
  )
  WITH CHECK (
    public.can_access_audit_scope(organization_id, care_home_id::TEXT, resident_id)
    AND (
      public.current_user_role() IN ('owner', 'manager', 'saas_admin')
      OR public.is_audit_action_plan_participant(assigned_to, created_by)
    )
  );

DROP POLICY IF EXISTS "Users can view audit_care_file_action_plans in scope" ON public.audit_care_file_action_plans;

CREATE POLICY "Users can view audit_care_file_action_plans in scope"
  ON public.audit_care_file_action_plans FOR SELECT
  TO authenticated
  USING (
    public.can_access_audit_scope(organization_id, care_home_id::TEXT, resident_id)
    AND (
      public.current_user_role() IN ('owner', 'manager', 'saas_admin')
      OR public.is_audit_action_plan_participant(assigned_to, created_by)
    )
  );

DROP POLICY IF EXISTS "Users can update audit_care_file_action_plans in scope" ON public.audit_care_file_action_plans;

CREATE POLICY "Users can update audit_care_file_action_plans in scope"
  ON public.audit_care_file_action_plans FOR UPDATE
  TO authenticated
  USING (
    public.can_access_audit_scope(organization_id, care_home_id::TEXT, resident_id)
    AND (
      public.current_user_role() IN ('owner', 'manager', 'saas_admin')
      OR public.is_audit_action_plan_participant(assigned_to, created_by)
    )
  )
  WITH CHECK (
    public.can_access_audit_scope(organization_id, care_home_id::TEXT, resident_id)
    AND (
      public.current_user_role() IN ('owner', 'manager', 'saas_admin')
      OR public.is_audit_action_plan_participant(assigned_to, created_by)
    )
  );

DO $$
DECLARE
  target_table TEXT;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'audit_governance_action_plans',
    'audit_clinical_action_plans',
    'audit_environment_action_plans'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can view ' || target_table || ' in scope', target_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can update ' || target_table || ' in scope', target_table);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (
        public.can_access_audit_scope(organization_id, care_home_id::TEXT, NULL)
        AND (
          public.current_user_role() IN (''owner'', ''manager'', ''saas_admin'')
          OR public.is_audit_action_plan_participant(assigned_to, created_by)
        )
      )',
      'Users can view ' || target_table || ' in scope',
      target_table
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (
        public.can_access_audit_scope(organization_id, care_home_id::TEXT, NULL)
        AND (
          public.current_user_role() IN (''owner'', ''manager'', ''saas_admin'')
          OR public.is_audit_action_plan_participant(assigned_to, created_by)
        )
      ) WITH CHECK (
        public.can_access_audit_scope(organization_id, care_home_id::TEXT, NULL)
        AND (
          public.current_user_role() IN (''owner'', ''manager'', ''saas_admin'')
          OR public.is_audit_action_plan_participant(assigned_to, created_by)
        )
      )',
      'Users can update ' || target_table || ' in scope',
      target_table
    );
  END LOOP;
END;
$$;
