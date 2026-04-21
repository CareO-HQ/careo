-- ============================================
-- HARDEN AUDIT RLS AND FUNCTION SEARCH PATHS
-- ============================================

-- --------------------------------------------
-- Audit access helpers
-- --------------------------------------------

CREATE OR REPLACE FUNCTION public.can_access_audit_organization(target_organization_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND target_organization_id IS NOT NULL
    AND (
      public.is_saas_admin()
      OR target_organization_id = public.current_active_organization_id()::TEXT
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_audit_scope(
  target_organization_id TEXT,
  target_care_home_id TEXT DEFAULT NULL,
  target_resident_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  resolved_resident_id UUID := public.leading_uuid(COALESCE(target_resident_id, ''));
  resolved_care_home_id UUID := public.leading_uuid(COALESCE(target_care_home_id, ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  IF public.is_saas_admin() THEN
    RETURN TRUE;
  END IF;

  IF resolved_resident_id IS NOT NULL THEN
    RETURN public.can_access_resident(resolved_resident_id);
  END IF;

  IF resolved_care_home_id IS NOT NULL THEN
    RETURN public.can_access_care_home(resolved_care_home_id);
  END IF;

  RETURN public.can_access_audit_organization(target_organization_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_audit_action_plan_participant(
  assigned_to_value TEXT,
  created_by_value TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      LOWER(COALESCE(assigned_to_value, '')) IN (
        LOWER(auth.uid()::TEXT),
        public.current_user_email()
      )
      OR LOWER(COALESCE(created_by_value, '')) IN (
        LOWER(auth.uid()::TEXT),
        public.current_user_email()
      )
    );
$$;

-- --------------------------------------------
-- Replace permissive audit policies
-- --------------------------------------------

DO $$
DECLARE
  target_table TEXT;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'audit_resident_templates',
    'audit_care_file_templates',
    'audit_governance_templates',
    'audit_clinical_templates',
    'audit_environment_templates'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Authenticated users access', target_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Enable all access for authenticated users with same organization', target_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can view ' || target_table || ' in scope', target_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Staff can manage ' || target_table || ' in scope', target_table);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (
        public.current_user_role() IN (''owner'', ''manager'', ''nurse'', ''saas_admin'')
        AND public.can_access_audit_organization(organization_id)
      )',
      'Users can view ' || target_table || ' in scope',
      target_table
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (
        public.current_user_role() IN (''owner'', ''manager'', ''nurse'', ''saas_admin'')
        AND public.can_access_audit_organization(organization_id)
      ) WITH CHECK (
        public.current_user_role() IN (''owner'', ''manager'', ''nurse'', ''saas_admin'')
        AND public.can_access_audit_organization(organization_id)
      )',
      'Staff can manage ' || target_table || ' in scope',
      target_table
    );
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "Authenticated users access" ON public.audit_resident_completions;
DROP POLICY IF EXISTS "Users can view audit_resident_completions in scope" ON public.audit_resident_completions;
DROP POLICY IF EXISTS "Staff can manage audit_resident_completions in scope" ON public.audit_resident_completions;

CREATE POLICY "Users can view audit_resident_completions in scope"
  ON public.audit_resident_completions FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_audit_scope(organization_id, team_id, NULL)
  );

CREATE POLICY "Staff can manage audit_resident_completions in scope"
  ON public.audit_resident_completions FOR ALL
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_audit_scope(organization_id, team_id, NULL)
  )
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_audit_scope(organization_id, team_id, NULL)
  );

DROP POLICY IF EXISTS "Authenticated users access" ON public.audit_care_file_completions;
DROP POLICY IF EXISTS "Users can view audit_care_file_completions in scope" ON public.audit_care_file_completions;
DROP POLICY IF EXISTS "Staff can manage audit_care_file_completions in scope" ON public.audit_care_file_completions;

CREATE POLICY "Users can view audit_care_file_completions in scope"
  ON public.audit_care_file_completions FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_audit_scope(organization_id, team_id, resident_id)
  );

CREATE POLICY "Staff can manage audit_care_file_completions in scope"
  ON public.audit_care_file_completions FOR ALL
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_audit_scope(organization_id, team_id, resident_id)
  )
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_audit_scope(organization_id, team_id, resident_id)
  );

DO $$
DECLARE
  target_table TEXT;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'audit_governance_completions',
    'audit_clinical_completions',
    'audit_environment_completions'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Authenticated users access', target_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can view ' || target_table || ' in scope', target_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Staff can manage ' || target_table || ' in scope', target_table);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (
        public.current_user_role() IN (''owner'', ''manager'', ''nurse'', ''saas_admin'')
        AND public.can_access_audit_organization(organization_id)
      )',
      'Users can view ' || target_table || ' in scope',
      target_table
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (
        public.current_user_role() IN (''owner'', ''manager'', ''nurse'', ''saas_admin'')
        AND public.can_access_audit_organization(organization_id)
      ) WITH CHECK (
        public.current_user_role() IN (''owner'', ''manager'', ''nurse'', ''saas_admin'')
        AND public.can_access_audit_organization(organization_id)
      )',
      'Staff can manage ' || target_table || ' in scope',
      target_table
    );
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "Authenticated users access" ON public.audit_resident_action_plans;
DROP POLICY IF EXISTS "Users can view audit_resident_action_plans in scope" ON public.audit_resident_action_plans;
DROP POLICY IF EXISTS "Staff can create audit_resident_action_plans in scope" ON public.audit_resident_action_plans;
DROP POLICY IF EXISTS "Users can update audit_resident_action_plans in scope" ON public.audit_resident_action_plans;
DROP POLICY IF EXISTS "Staff can delete audit_resident_action_plans in scope" ON public.audit_resident_action_plans;

CREATE POLICY "Users can view audit_resident_action_plans in scope"
  ON public.audit_resident_action_plans FOR SELECT
  TO authenticated
  USING (
    public.can_access_audit_scope(organization_id, care_home_id::TEXT, resident_id)
    AND (
      public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
      OR public.is_audit_action_plan_participant(assigned_to, created_by)
    )
  );

CREATE POLICY "Staff can create audit_resident_action_plans in scope"
  ON public.audit_resident_action_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_audit_scope(organization_id, care_home_id::TEXT, resident_id)
  );

CREATE POLICY "Users can update audit_resident_action_plans in scope"
  ON public.audit_resident_action_plans FOR UPDATE
  TO authenticated
  USING (
    public.can_access_audit_scope(organization_id, care_home_id::TEXT, resident_id)
    AND (
      public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
      OR public.is_audit_action_plan_participant(assigned_to, created_by)
    )
  )
  WITH CHECK (
    public.can_access_audit_scope(organization_id, care_home_id::TEXT, resident_id)
    AND (
      public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
      OR public.is_audit_action_plan_participant(assigned_to, created_by)
    )
  );

CREATE POLICY "Staff can delete audit_resident_action_plans in scope"
  ON public.audit_resident_action_plans FOR DELETE
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_audit_scope(organization_id, care_home_id::TEXT, resident_id)
  );

DROP POLICY IF EXISTS "Authenticated users access" ON public.audit_care_file_action_plans;
DROP POLICY IF EXISTS "Users can view audit_care_file_action_plans in scope" ON public.audit_care_file_action_plans;
DROP POLICY IF EXISTS "Staff can create audit_care_file_action_plans in scope" ON public.audit_care_file_action_plans;
DROP POLICY IF EXISTS "Users can update audit_care_file_action_plans in scope" ON public.audit_care_file_action_plans;
DROP POLICY IF EXISTS "Staff can delete audit_care_file_action_plans in scope" ON public.audit_care_file_action_plans;

CREATE POLICY "Users can view audit_care_file_action_plans in scope"
  ON public.audit_care_file_action_plans FOR SELECT
  TO authenticated
  USING (
    public.can_access_audit_scope(organization_id, care_home_id::TEXT, resident_id)
    AND (
      public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
      OR public.is_audit_action_plan_participant(assigned_to, created_by)
    )
  );

CREATE POLICY "Staff can create audit_care_file_action_plans in scope"
  ON public.audit_care_file_action_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_audit_scope(organization_id, care_home_id::TEXT, resident_id)
  );

CREATE POLICY "Users can update audit_care_file_action_plans in scope"
  ON public.audit_care_file_action_plans FOR UPDATE
  TO authenticated
  USING (
    public.can_access_audit_scope(organization_id, care_home_id::TEXT, resident_id)
    AND (
      public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
      OR public.is_audit_action_plan_participant(assigned_to, created_by)
    )
  )
  WITH CHECK (
    public.can_access_audit_scope(organization_id, care_home_id::TEXT, resident_id)
    AND (
      public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
      OR public.is_audit_action_plan_participant(assigned_to, created_by)
    )
  );

CREATE POLICY "Staff can delete audit_care_file_action_plans in scope"
  ON public.audit_care_file_action_plans FOR DELETE
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_audit_scope(organization_id, care_home_id::TEXT, resident_id)
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
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Authenticated users access', target_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can view ' || target_table || ' in scope', target_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Staff can create ' || target_table || ' in scope', target_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can update ' || target_table || ' in scope', target_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Staff can delete ' || target_table || ' in scope', target_table);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (
        public.can_access_audit_scope(organization_id, care_home_id::TEXT, NULL)
        AND (
          public.current_user_role() IN (''owner'', ''manager'', ''nurse'', ''saas_admin'')
          OR public.is_audit_action_plan_participant(assigned_to, created_by)
        )
      )',
      'Users can view ' || target_table || ' in scope',
      target_table
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (
        public.current_user_role() IN (''owner'', ''manager'', ''nurse'', ''saas_admin'')
        AND public.can_access_audit_scope(organization_id, care_home_id::TEXT, NULL)
      )',
      'Staff can create ' || target_table || ' in scope',
      target_table
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (
        public.can_access_audit_scope(organization_id, care_home_id::TEXT, NULL)
        AND (
          public.current_user_role() IN (''owner'', ''manager'', ''nurse'', ''saas_admin'')
          OR public.is_audit_action_plan_participant(assigned_to, created_by)
        )
      ) WITH CHECK (
        public.can_access_audit_scope(organization_id, care_home_id::TEXT, NULL)
        AND (
          public.current_user_role() IN (''owner'', ''manager'', ''nurse'', ''saas_admin'')
          OR public.is_audit_action_plan_participant(assigned_to, created_by)
        )
      )',
      'Users can update ' || target_table || ' in scope',
      target_table
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (
        public.current_user_role() IN (''owner'', ''manager'', ''nurse'', ''saas_admin'')
        AND public.can_access_audit_scope(organization_id, care_home_id::TEXT, NULL)
      )',
      'Staff can delete ' || target_table || ' in scope',
      target_table
    );
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "Authenticated users access" ON public.audit_manager_reviews;
DROP POLICY IF EXISTS "Users can view audit_manager_reviews in scope" ON public.audit_manager_reviews;
DROP POLICY IF EXISTS "Managers can manage audit_manager_reviews in scope" ON public.audit_manager_reviews;

CREATE POLICY "Users can view audit_manager_reviews in scope"
  ON public.audit_manager_reviews FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'saas_admin')
    AND public.can_access_audit_scope(organization_id, team_id, resident_id)
  );

CREATE POLICY "Managers can manage audit_manager_reviews in scope"
  ON public.audit_manager_reviews FOR ALL
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'saas_admin')
    AND public.can_access_audit_scope(organization_id, team_id, resident_id)
  )
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'saas_admin')
    AND public.can_access_audit_scope(organization_id, team_id, resident_id)
  );

DROP POLICY IF EXISTS "authenticated_upsert_manager_ap" ON public.audit_manager_action_plans;
DROP POLICY IF EXISTS "Users can view audit_manager_action_plans in scope" ON public.audit_manager_action_plans;
DROP POLICY IF EXISTS "Managers can create audit_manager_action_plans in scope" ON public.audit_manager_action_plans;
DROP POLICY IF EXISTS "Users can update audit_manager_action_plans in scope" ON public.audit_manager_action_plans;
DROP POLICY IF EXISTS "Managers can delete audit_manager_action_plans in scope" ON public.audit_manager_action_plans;

CREATE POLICY "Users can view audit_manager_action_plans in scope"
  ON public.audit_manager_action_plans FOR SELECT
  TO authenticated
  USING (
    public.can_access_audit_scope(organization_id, care_home_id, resident_id)
    AND (
      public.current_user_role() IN ('owner', 'manager', 'saas_admin')
      OR public.is_audit_action_plan_participant(assigned_to, created_by)
    )
  );

CREATE POLICY "Managers can create audit_manager_action_plans in scope"
  ON public.audit_manager_action_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'saas_admin')
    AND public.can_access_audit_scope(organization_id, care_home_id, resident_id)
  );

CREATE POLICY "Users can update audit_manager_action_plans in scope"
  ON public.audit_manager_action_plans FOR UPDATE
  TO authenticated
  USING (
    public.can_access_audit_scope(organization_id, care_home_id, resident_id)
    AND (
      public.current_user_role() IN ('owner', 'manager', 'saas_admin')
      OR public.is_audit_action_plan_participant(assigned_to, created_by)
    )
  )
  WITH CHECK (
    public.can_access_audit_scope(organization_id, care_home_id, resident_id)
    AND (
      public.current_user_role() IN ('owner', 'manager', 'saas_admin')
      OR public.is_audit_action_plan_participant(assigned_to, created_by)
    )
  );

CREATE POLICY "Managers can delete audit_manager_action_plans in scope"
  ON public.audit_manager_action_plans FOR DELETE
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'saas_admin')
    AND public.can_access_audit_scope(organization_id, care_home_id, resident_id)
  );

-- --------------------------------------------
-- search_path hardening for flagged functions
-- --------------------------------------------

DO $$
DECLARE
  function_config RECORD;
BEGIN
  FOR function_config IN
    SELECT *
    FROM (
      VALUES
        ('public.is_saas_admin()', 'public, auth'),
        ('public.is_saas_admin(uuid)', 'public, auth'),
        ('public.get_user_role()', 'public, auth'),
        ('public.get_user_role(uuid)', 'public, auth'),
        ('public.get_active_organization_id()', 'public, auth'),
        ('public.get_active_organization_id(uuid)', 'public, auth'),
        ('public.get_active_care_home_id()', 'public, auth'),
        ('public.can_access_organization(uuid)', 'public, auth'),
        ('public.leading_uuid(text)', 'public'),
        ('public.build_storage_proxy_url(text, text)', 'public'),
        ('public.extract_storage_object_path(text, text)', 'public'),
        ('public.archive_previous_month_emar_sheets()', 'public, auth'),
        ('public.get_or_create_emar_sheet(uuid, public.emar_sheet_type, uuid, uuid)', 'public, auth'),
        ('public.receive_medication_stock(uuid, uuid, integer, text, date, text, text, uuid, text, uuid, uuid)', 'public, auth'),
        ('public.adjust_medication_stock(uuid, uuid, text, integer, text, text, uuid, uuid, uuid)', 'public, auth'),
        ('public.backfill_emar_from_medication_intakes()', 'public, auth'),
        ('public.sync_medication_intake_to_emar()', 'public, auth'),
        ('public.sync_user_metadata_to_auth()', 'public, auth'),
        ('public.setup_new_user_metadata()', 'public, auth'),
        ('public.handle_medication_stock_management()', 'public, auth'),
        ('public.handle_medication_intake_resolve_alerts()', 'public, auth'),
        ('public.get_next_wound_number(uuid)', 'public, auth'),
        ('public.set_wound_number()', 'public, auth'),
        ('public.update_updated_at_column()', 'public'),
        ('public.handle_updated_at()', 'public'),
        ('public.update_fall_risk_assessments_updated_at()', 'public'),
        ('public.update_incident_folders_updated_at()', 'public'),
        ('public.update_medication_stock_receipts_updated_at()', 'public'),
        ('public.update_medication_stock_adjustments_updated_at()', 'public')
    ) AS configs(signature, search_path_value)
  LOOP
    IF to_regprocedure(function_config.signature) IS NOT NULL THEN
      EXECUTE format(
        'ALTER FUNCTION %s SET search_path = %s',
        function_config.signature,
        function_config.search_path_value
      );
    END IF;
  END LOOP;
END;
$$;
