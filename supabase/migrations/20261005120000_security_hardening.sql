-- Migration: 20261005120000_security_hardening.sql
-- Fixes privilege escalation, cross-tenant leaks and role scoping found by tests/db.
-- Design: existing permissive policies are kept; new rules are added as RESTRICTIVE
-- policies (ANDed with the permissive ones) so they can only narrow access.

-- =====================================================================
-- 1. Shared helpers
-- =====================================================================

-- MDT/RQIA accounts switched off by a nurse/manager lose data access even with a valid session.
CREATE OR REPLACE FUNCTION public.current_user_login_blocked()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND u.is_login_allowed = false
      AND u.role::text IN ('mdt', 'rqia')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_organization(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT NOT public.current_user_login_blocked()
    AND (
      public.is_saas_admin()
      OR EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
          AND u.active_organization_id = org_id
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_care_home(target_care_home_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL OR target_care_home_id IS NULL THEN FALSE
    WHEN public.current_user_login_blocked() THEN FALSE
    WHEN public.is_saas_admin() THEN TRUE
    WHEN public.current_user_role() = 'owner' THEN EXISTS (
      SELECT 1
      FROM public.care_homes ch
      WHERE ch.id = target_care_home_id
        AND ch.organization_id = public.current_active_organization_id()
    )
    ELSE target_care_home_id = public.current_active_care_home_id()
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_resident(target_resident_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT NOT public.current_user_login_blocked()
    AND EXISTS (
      SELECT 1
      FROM public.residents r
      WHERE r.id = target_resident_id
        AND (
          public.is_saas_admin()
          OR (
            public.current_user_role() = 'owner'
            AND r.organization_id = public.current_active_organization_id()
          )
          OR r.care_home_id = public.current_active_care_home_id()
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_care_context(
  target_organization_id uuid,
  target_care_home_id uuid DEFAULT NULL::uuid,
  target_resident_id uuid DEFAULT NULL::uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  IF public.current_user_login_blocked() THEN
    RETURN FALSE;
  END IF;

  IF public.is_saas_admin() THEN
    RETURN TRUE;
  END IF;

  IF target_resident_id IS NOT NULL THEN
    RETURN public.can_access_resident(target_resident_id);
  END IF;

  IF target_care_home_id IS NOT NULL THEN
    RETURN public.can_access_care_home(target_care_home_id);
  END IF;

  RETURN public.current_user_role() = 'owner'
    AND target_organization_id = public.current_active_organization_id();
END;
$$;

-- Safe text -> uuid cast (audit tables store ids as text).
CREATE OR REPLACE FUNCTION public.try_uuid(p_value text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN NULLIF(p_value, '')::uuid;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END;
$$;

-- Team visibility = visibility of the team's care home.
CREATE OR REPLACE FUNCTION public.can_access_team(target_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = target_team_id
      AND public.can_access_care_home(t.care_home_id)
  );
$$;

-- =====================================================================
-- 2. public.users privilege guard
-- =====================================================================

CREATE OR REPLACE FUNCTION public.user_role_rank(p_role text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_role
    WHEN 'saas_admin' THEN 4
    WHEN 'owner' THEN 3
    WHEN 'manager' THEN 2
    ELSE 1
  END;
$$;

CREATE OR REPLACE FUNCTION public.guard_user_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_actor_role text;
  v_meta_role text;
BEGIN
  -- Server-side contexts (service role, auth triggers) and vetted RPCs are trusted.
  IF v_uid IS NULL
     OR COALESCE(current_setting('app.user_guard_bypass', true), '') = 'on'
     OR public.is_saas_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Clients may only create their own row, with no privileges.
    SELECT raw_app_meta_data ->> 'role' INTO v_meta_role FROM auth.users WHERE id = v_uid;
    BEGIN
      NEW.role := COALESCE(v_meta_role, 'care_assistant')::user_role;
    EXCEPTION WHEN OTHERS THEN
      NEW.role := 'care_assistant'::user_role;
    END;
    IF NEW.role::text IN ('saas_admin', 'owner', 'manager') THEN
      NEW.role := 'care_assistant'::user_role;
    END IF;
    NEW.is_saas_admin := false;
    NEW.organization_id := NULL;
    NEW.active_organization_id := NULL;
    NEW.active_care_home_id := NULL;
    NEW.active_team_id := NULL;
    NEW.is_manager_approved_nurse := false;
    RETURN NEW;
  END IF;

  IF NEW.is_saas_admin IS DISTINCT FROM OLD.is_saas_admin THEN
    RAISE EXCEPTION 'Not allowed to change is_saas_admin' USING ERRCODE = '42501';
  END IF;
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id AND NEW.organization_id IS NOT NULL THEN
    RAISE EXCEPTION 'Not allowed to change organization membership' USING ERRCODE = '42501';
  END IF;

  IF NEW.id = v_uid THEN
    -- ---------------- own row ----------------
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.is_manager_approved_nurse IS DISTINCT FROM OLD.is_manager_approved_nurse
       OR NEW.contracted_weekly_hours IS DISTINCT FROM OLD.contracted_weekly_hours
       OR NEW.max_weekly_hours IS DISTINCT FROM OLD.max_weekly_hours
       OR NEW.is_login_allowed IS DISTINCT FROM OLD.is_login_allowed
       OR NEW.annual_leave_balance IS DISTINCT FROM OLD.annual_leave_balance
       OR NEW.sick_leave_days_taken IS DISTINCT FROM OLD.sick_leave_days_taken THEN
      RAISE EXCEPTION 'Not allowed to change your own role or workforce settings' USING ERRCODE = '42501';
    END IF;

    IF NEW.active_organization_id IS DISTINCT FROM OLD.active_organization_id
       AND NEW.active_organization_id IS NOT NULL
       AND NEW.active_organization_id IS DISTINCT FROM NEW.organization_id
       -- Owner onboarding: an organization the owner just created (no members, no homes yet).
       AND NOT (
         OLD.role::text = 'owner'
         AND NOT EXISTS (
           SELECT 1 FROM public.users u
           WHERE u.id <> v_uid
             AND (u.active_organization_id = NEW.active_organization_id
                  OR u.organization_id = NEW.active_organization_id)
         )
         AND NOT EXISTS (
           SELECT 1 FROM public.care_homes ch WHERE ch.organization_id = NEW.active_organization_id
         )
       ) THEN
      RAISE EXCEPTION 'Not allowed to switch to that organization' USING ERRCODE = '42501';
    END IF;

    IF NEW.active_care_home_id IS DISTINCT FROM OLD.active_care_home_id
       AND NEW.active_care_home_id IS NOT NULL
       AND NOT (
         OLD.role::text = 'owner'
         AND EXISTS (
           SELECT 1 FROM public.care_homes ch
           WHERE ch.id = NEW.active_care_home_id
             AND ch.organization_id = NEW.active_organization_id
         )
       ) THEN
      RAISE EXCEPTION 'Not allowed to switch to that care home' USING ERRCODE = '42501';
    END IF;

    IF NEW.active_team_id IS DISTINCT FROM OLD.active_team_id
       AND NEW.active_team_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.teams t
         WHERE t.id = NEW.active_team_id
           AND t.care_home_id = NEW.active_care_home_id
       ) THEN
      RAISE EXCEPTION 'Not allowed to switch to that team' USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
  END IF;

  -- ---------------- someone else's row (owner/manager via RLS) ----------------
  SELECT u.role::text INTO v_actor_role FROM public.users u WHERE u.id = v_uid;

  IF NEW.role IS DISTINCT FROM OLD.role
     AND (
       public.user_role_rank(NEW.role::text) >= public.user_role_rank(v_actor_role)
       OR public.user_role_rank(OLD.role::text) >= public.user_role_rank(v_actor_role)
     ) THEN
    RAISE EXCEPTION 'Not allowed to assign that role' USING ERRCODE = '42501';
  END IF;

  IF NEW.active_organization_id IS DISTINCT FROM OLD.active_organization_id
     AND NEW.active_organization_id IS NOT NULL THEN
    RAISE EXCEPTION 'Not allowed to move staff to another organization' USING ERRCODE = '42501';
  END IF;

  IF NEW.active_care_home_id IS DISTINCT FROM OLD.active_care_home_id
     AND NEW.active_care_home_id IS NOT NULL
     AND NOT public.can_access_care_home(NEW.active_care_home_id) THEN
    RAISE EXCEPTION 'Not allowed to move staff to that care home' USING ERRCODE = '42501';
  END IF;

  IF NEW.active_team_id IS DISTINCT FROM OLD.active_team_id
     AND NEW.active_team_id IS NOT NULL
     AND NOT public.can_access_team(NEW.active_team_id) THEN
    RAISE EXCEPTION 'Not allowed to move staff to that team' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS a_guard_user_privileged_columns ON public.users;
CREATE TRIGGER a_guard_user_privileged_columns
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.guard_user_privileged_columns();

-- =====================================================================
-- 3. Vetted RPCs for flows that legitimately set role / organization
-- =====================================================================

CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_inv public.invitations%ROWTYPE;
  v_role user_role;
BEGIN
  SELECT * INTO v_inv
  FROM public.invitations
  WHERE token = p_token
    AND LOWER(email) = public.current_user_email()
    AND status = 'pending'
    AND expires_at > NOW()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  v_role := CASE WHEN v_inv.role::text = 'saas_admin' THEN 'care_assistant'::user_role ELSE v_inv.role END;

  PERFORM set_config('app.user_guard_bypass', 'on', true);

  UPDATE public.users
  SET role = v_role,
      is_saas_admin = false,
      organization_id = v_inv.organization_id,
      active_organization_id = v_inv.organization_id,
      active_care_home_id = v_inv.care_home_id,
      active_team_id = v_inv.team_id,
      is_onboarding_complete = false,
      updated_at = NOW()
  WHERE id = auth.uid();

  IF v_role::text = 'manager' AND v_inv.care_home_id IS NOT NULL THEN
    INSERT INTO public.care_home_managers (care_home_id, user_id, assigned_at)
    VALUES (v_inv.care_home_id, auth.uid(), NOW())
    ON CONFLICT (care_home_id, user_id) DO NOTHING;
  END IF;

  PERFORM set_config('app.user_guard_bypass', 'off', true);

  UPDATE public.invitations
  SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
  WHERE id = v_inv.id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_agency_onboarding(p_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_req public.agency_requests%ROWTYPE;
  v_staff public.agency_staff%ROWTYPE;
  v_role user_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_req FROM public.agency_requests WHERE activation_token = p_token FOR UPDATE;
  IF NOT FOUND OR v_req.status = 'offboarded' THEN
    RAISE EXCEPTION 'Invalid or expired activation link' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_staff FROM public.agency_staff WHERE id = v_req.agency_staff_id;
  IF NOT FOUND OR LOWER(v_staff.email) <> public.current_user_email() THEN
    RAISE EXCEPTION 'Logged-in email does not match assignment email' USING ERRCODE = '42501';
  END IF;

  v_role := CASE WHEN v_staff.role = 'nurse' THEN 'agency_nurse'::user_role ELSE 'agency_care_assistant'::user_role END;

  PERFORM set_config('app.user_guard_bypass', 'on', true);

  INSERT INTO public.users (
    id, email, name, role, is_saas_admin,
    active_organization_id, active_care_home_id, active_team_id,
    is_onboarding_complete, updated_at
  )
  VALUES (
    auth.uid(), v_staff.email, v_staff.name, v_role, false,
    v_req.organization_id, v_req.care_home_id, v_req.team_id,
    true, NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    role = EXCLUDED.role,
    is_saas_admin = false,
    active_organization_id = EXCLUDED.active_organization_id,
    active_care_home_id = EXCLUDED.active_care_home_id,
    active_team_id = EXCLUDED.active_team_id,
    is_onboarding_complete = true,
    updated_at = NOW();

  PERFORM set_config('app.user_guard_bypass', 'off', true);

  IF v_req.team_id IS NOT NULL THEN
    INSERT INTO public.team_staff (team_id, user_id, role, assigned_at)
    VALUES (v_req.team_id, auth.uid(), v_role, NOW())
    ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;

  UPDATE public.agency_requests
  SET status = 'active', activated_at = NOW(), updated_at = NOW()
  WHERE id = v_req.id;

  UPDATE public.agency_staff
  SET status = 'active', auth_user_id = auth.uid(), updated_at = NOW()
  WHERE id = v_staff.id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_agency_onboarding(uuid) TO authenticated;

-- Agency self-signup may only pick an agency role.
DO $$
DECLARE
  v_def text;
BEGIN
  v_def := pg_get_functiondef('public.setup_new_user_metadata'::regproc);
  v_def := replace(
    v_def,
    $old$IF v_role_text = 'saas_admin' THEN$old$,
    $new$IF v_role_text NOT IN ('agency_nurse', 'agency_care_assistant', 'supervisor') THEN$new$
  );
  EXECUTE v_def;
END;
$$;

-- =====================================================================
-- 4. Rota: scope management and visibility to the caller's organization / care home
-- =====================================================================

CREATE OR REPLACE FUNCTION public.can_manage_rota(target_team_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  caller_role TEXT;
  caller_team_id UUID;
  caller_org_id UUID;
  caller_home_id UUID;
  caller_is_approved_nurse BOOLEAN;
  team_org_id UUID;
  team_home_id UUID;
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'is_saas_admin')::BOOLEAN = true THEN
    RETURN true;
  END IF;

  SELECT role, active_team_id, active_organization_id, active_care_home_id, is_manager_approved_nurse
  INTO caller_role, caller_team_id, caller_org_id, caller_home_id, caller_is_approved_nurse
  FROM public.users
  WHERE id = auth.uid();

  SELECT organization_id, care_home_id INTO team_org_id, team_home_id
  FROM public.teams WHERE id = target_team_id;

  IF caller_role = 'owner' THEN
    RETURN team_org_id IS NOT NULL AND team_org_id = caller_org_id;
  END IF;

  IF caller_role = 'manager' THEN
    RETURN team_home_id IS NOT NULL AND (
      team_home_id = caller_home_id
      OR EXISTS (
        SELECT 1 FROM public.care_home_managers chm
        WHERE chm.user_id = auth.uid() AND chm.care_home_id = team_home_id
      )
    );
  END IF;

  IF caller_role = 'nurse' AND caller_is_approved_nurse = true AND caller_team_id = target_team_id THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

DROP POLICY IF EXISTS "View rotas" ON public.rotas;
CREATE POLICY "View rotas" ON public.rotas FOR SELECT
  USING (public.can_access_team(team_id) OR public.can_manage_rota(team_id));

DROP POLICY IF EXISTS "View rota shifts" ON public.rota_shifts;
CREATE POLICY "View rota shifts" ON public.rota_shifts FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.rotas r
      WHERE r.id = rota_shifts.rota_id
        AND (public.can_access_team(r.team_id) OR public.can_manage_rota(r.team_id))
    )
  );

DROP POLICY IF EXISTS "View shift templates" ON public.shift_templates;
CREATE POLICY "View shift templates" ON public.shift_templates FOR SELECT
  USING (public.can_access_team(team_id) OR public.can_manage_rota(team_id));

DROP POLICY IF EXISTS "View staffing requirements" ON public.shift_staffing_requirements;
CREATE POLICY "View staffing requirements" ON public.shift_staffing_requirements FOR SELECT
  USING (public.can_access_team(team_id) OR public.can_manage_rota(team_id));

DROP POLICY IF EXISTS "View temporary staff" ON public.temporary_staff;
CREATE POLICY "View temporary staff" ON public.temporary_staff FOR SELECT
  USING (public.can_access_team(team_id) OR public.can_manage_rota(team_id));

-- team_staff: users may read their own assignments; writes come from managers or the sync trigger.
DROP POLICY IF EXISTS "Users can manage their own team assignments" ON public.team_staff;
DROP POLICY IF EXISTS "Users can view own team assignments" ON public.team_staff;
CREATE POLICY "Users can view own team assignments" ON public.team_staff FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS zz_scope_team_staff ON public.team_staff;
CREATE POLICY zz_scope_team_staff ON public.team_staff AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_saas_admin() OR auth.uid() = user_id OR public.can_access_team(team_id))
  WITH CHECK (public.is_saas_admin() OR public.can_access_team(team_id));

DROP POLICY IF EXISTS zz_scope_care_home_managers ON public.care_home_managers;
CREATE POLICY zz_scope_care_home_managers ON public.care_home_managers AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_saas_admin() OR auth.uid() = user_id OR public.can_access_care_home(care_home_id))
  WITH CHECK (public.is_saas_admin() OR public.can_access_care_home(care_home_id));

-- =====================================================================
-- 5. External visitor login logs: same organization / care home only
-- =====================================================================

DROP POLICY IF EXISTS "Enable select access for managers, owners, saas admins and self" ON public.rqia_login_logs;
DROP POLICY IF EXISTS "Enable select access for managers, owners, saas admins and self" ON public.mdt_login_logs;
DROP POLICY IF EXISTS "Enable insert access for authenticated users to record rqia ses" ON public.rqia_login_logs;
DROP POLICY IF EXISTS "Enable insert access for authenticated users to record mdt sess" ON public.mdt_login_logs;

CREATE POLICY "Login logs visible to self and same-home managers" ON public.rqia_login_logs FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
      AND public.can_access_care_context(organization_id, care_home_id, NULL)
    )
  );
CREATE POLICY "Login logs visible to self and same-home managers" ON public.mdt_login_logs FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
      AND public.can_access_care_context(organization_id, care_home_id, NULL)
    )
  );
CREATE POLICY "Record own login" ON public.rqia_login_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Record own login" ON public.mdt_login_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- agency_linkages is not used by the app; stop exposing it to every user.
DROP POLICY IF EXISTS "All authenticated users read agency linkages" ON public.agency_linkages;
DROP POLICY IF EXISTS "Admins and agency supervisors read agency linkages" ON public.agency_linkages;
CREATE POLICY "Admins and agency supervisors read agency linkages" ON public.agency_linkages FOR SELECT TO authenticated
  USING (
    public.is_saas_admin()
    OR (
      COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_agency_staff')::boolean, false)
      AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'supervisor'
    )
  );

-- =====================================================================
-- 6. Care-home and role scoping for every tenant data table (RESTRICTIVE)
-- =====================================================================

DO $$
DECLARE
  t record;
  res_col text;
  home_col text;
  team_col text;
  org_col text;
  ctx text;
  read_expr text;
  write_expr text;
  staff_roles constant text :=
    $q$ARRAY['owner','manager','nurse','care_assistant','agency_nurse','agency_care_assistant']$q$;
  -- Tenancy / rota / login-log tables have dedicated policies above or are org-level by design.
  excluded constant text[] := ARRAY[
    'organizations', 'care_homes', 'teams', 'users', 'residents', 'invitations', 'organization_status',
    'agency_requests', 'agency_staff', 'agency_shifts', 'agency_linkages',
    'care_home_managers', 'team_staff', 'rotas', 'rota_shifts', 'shift_templates',
    'shift_staffing_requirements', 'temporary_staff', 'leave_requests', 'shift_swaps', 'rota_audit_logs',
    'rqia_login_logs', 'mdt_login_logs',
    'audit_templates', 'audit_care_file_templates', 'audit_clinical_templates',
    'audit_environment_templates', 'audit_governance_templates', 'audit_resident_templates'
  ];
  -- Kitchen portal: diet, kitchen action plans, notifications.
  kitchen_tables constant text[] := ARRAY[
    'diet_lifestyle', 'diet_information', 'diet_notifications', 'menu_items', 'food_fluid_logs',
    'modified_diet_audit_entries', 'notifications', 'notification_read_status', 'notification_dismissals',
    'manager_audit_state', 'care_home_common_action_plans', 'audit_action_plans',
    'audit_resident_action_plans', 'audit_care_file_action_plans', 'audit_governance_action_plans',
    'audit_clinical_action_plans', 'audit_environment_action_plans', 'audit_manager_action_plans'
  ];
  -- MDT visitors write only their notes, care-team list and attached files.
  mdt_write_tables constant text[] := ARRAY['multidisciplinary_notes', 'multidisciplinary_care_team', 'files', 'folders'];
  -- Per-user read markers anyone may write.
  any_write_tables constant text[] := ARRAY[
    'notification_read_status', 'notification_dismissals', 'alert_dismissals',
    'appointment_read_status', 'wound_alert_reads'
  ];
BEGIN
  FOR t IN
    SELECT c.relname AS name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity
      AND c.relname <> ALL (excluded)
      AND EXISTS (
        SELECT 1 FROM information_schema.columns col
        WHERE col.table_schema = 'public' AND col.table_name = c.relname
          AND col.column_name IN ('organization_id', 'care_home_id', 'resident_id')
      )
  LOOP
    -- Column expressions as uuid (NULL when the column is absent).
    SELECT
      max(CASE WHEN column_name = 'resident_id' THEN CASE WHEN udt_name = 'uuid' THEN 'resident_id' ELSE 'public.try_uuid(resident_id)' END END),
      max(CASE WHEN column_name = 'care_home_id' THEN CASE WHEN udt_name = 'uuid' THEN 'care_home_id' ELSE 'public.try_uuid(care_home_id)' END END),
      max(CASE WHEN column_name = 'team_id' THEN CASE WHEN udt_name = 'uuid' THEN 'team_id' ELSE 'public.try_uuid(team_id)' END END),
      max(CASE WHEN column_name = 'organization_id' THEN CASE WHEN udt_name = 'uuid' THEN 'organization_id' ELSE 'public.try_uuid(organization_id)' END END)
    INTO res_col, home_col, team_col, org_col
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = t.name;

    ctx := 'CASE '
      || CASE WHEN res_col IS NOT NULL THEN format('WHEN %1$s IS NOT NULL THEN public.can_access_resident(%1$s) ', res_col) ELSE '' END
      || CASE WHEN home_col IS NOT NULL THEN format('WHEN %1$s IS NOT NULL THEN public.can_access_care_home(%1$s) ', home_col) ELSE '' END
      || CASE WHEN team_col IS NOT NULL THEN format('WHEN %1$s IS NOT NULL THEN public.can_access_team(%1$s) ', team_col) ELSE '' END
      || 'ELSE ' || CASE WHEN org_col IS NOT NULL THEN format('public.can_access_organization(%s)', org_col) ELSE 'NOT public.current_user_login_blocked()' END
      || ' END';
    -- Organization-only tables: no WHEN branches, so use the fallback directly.
    IF res_col IS NULL AND home_col IS NULL AND team_col IS NULL THEN
      ctx := CASE WHEN org_col IS NOT NULL THEN format('public.can_access_organization(%s)', org_col) ELSE 'NOT public.current_user_login_blocked()' END;
    END IF;

    read_expr := CASE
      WHEN t.name = ANY (kitchen_tables) THEN 'true'
      ELSE $q$public.current_user_role() <> 'kitchen_staff'$q$
    END;

    write_expr := CASE
      WHEN t.name = ANY (any_write_tables) THEN 'true'
      ELSE 'public.current_user_role() = ANY (' || staff_roles || ')'
        || CASE WHEN t.name = ANY (mdt_write_tables) THEN $q$ OR public.current_user_role() = 'mdt'$q$ ELSE '' END
        || CASE WHEN t.name = ANY (kitchen_tables) THEN $q$ OR public.current_user_role() = 'kitchen_staff'$q$ ELSE '' END
    END;

    EXECUTE format('DROP POLICY IF EXISTS zz_scope_care_home ON public.%I', t.name);
    EXECUTE format('DROP POLICY IF EXISTS zz_role_read ON public.%I', t.name);
    EXECUTE format('DROP POLICY IF EXISTS zz_role_insert ON public.%I', t.name);
    EXECUTE format('DROP POLICY IF EXISTS zz_role_update ON public.%I', t.name);
    EXECUTE format('DROP POLICY IF EXISTS zz_role_delete ON public.%I', t.name);

    EXECUTE format(
      'CREATE POLICY zz_scope_care_home ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_saas_admin() OR (%s)) WITH CHECK (public.is_saas_admin() OR (%s))',
      t.name, ctx, ctx
    );
    EXECUTE format(
      'CREATE POLICY zz_role_read ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING (public.is_saas_admin() OR (%s))',
      t.name, read_expr
    );
    EXECUTE format(
      'CREATE POLICY zz_role_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.is_saas_admin() OR (%s))',
      t.name, write_expr
    );
    EXECUTE format(
      'CREATE POLICY zz_role_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.is_saas_admin() OR (%s)) WITH CHECK (public.is_saas_admin() OR (%s))',
      t.name, write_expr, write_expr
    );
    EXECUTE format(
      'CREATE POLICY zz_role_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (public.is_saas_admin() OR (%s))',
      t.name, write_expr
    );
  END LOOP;
END;
$$;

-- =====================================================================
-- 7. Diet change notifications only when diet fields actually change
-- =====================================================================

DROP TRIGGER IF EXISTS trigger_diet_lifestyle_changed_notification ON public.diet_lifestyle;
DROP TRIGGER IF EXISTS trigger_diet_lifestyle_inserted_notification ON public.diet_lifestyle;

CREATE TRIGGER trigger_diet_lifestyle_inserted_notification
AFTER INSERT ON public.diet_lifestyle
FOR EACH ROW
EXECUTE FUNCTION public.handle_diet_lifestyle_changed_notification();

CREATE TRIGGER trigger_diet_lifestyle_changed_notification
AFTER UPDATE ON public.diet_lifestyle
FOR EACH ROW
WHEN (
  ROW(OLD.diet_types, OLD.other_diet_type, OLD.cultural_restrictions, OLD.allergies, OLD.choking_risk,
      OLD.food_consistency, OLD.fluid_consistency, OLD.assistance_required)
  IS DISTINCT FROM
  ROW(NEW.diet_types, NEW.other_diet_type, NEW.cultural_restrictions, NEW.allergies, NEW.choking_risk,
      NEW.food_consistency, NEW.fluid_consistency, NEW.assistance_required)
)
EXECUTE FUNCTION public.handle_diet_lifestyle_changed_notification();

-- =====================================================================
-- 8. Storage: server-side limits (the browser check alone is bypassable)
-- =====================================================================

UPDATE storage.buckets SET file_size_limit = 52428800 WHERE id IN ('resident-files', 'careo-public');
UPDATE storage.buckets
SET file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/*']
WHERE id = 'wound-photos';

-- =====================================================================
-- 9. Removing a member (settings/members page)
-- A direct UPDATE fails: once active_organization_id is NULL the row is no longer
-- visible to the manager, and PostgREST's RETURNING trips the SELECT policy.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.remove_organization_member(p_member_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_actor public.users%ROWTYPE;
  v_member public.users%ROWTYPE;
BEGIN
  SELECT * INTO v_actor FROM public.users WHERE id = auth.uid();
  SELECT * INTO v_member FROM public.users WHERE id = p_member_id FOR UPDATE;

  IF v_actor.id IS NULL OR v_member.id IS NULL OR v_actor.id = v_member.id THEN
    RETURN FALSE;
  END IF;

  IF NOT (
    public.is_saas_admin()
    OR (
      v_actor.role::text IN ('owner', 'manager')
      AND v_member.active_organization_id = v_actor.active_organization_id
      AND public.user_role_rank(v_member.role::text) < public.user_role_rank(v_actor.role::text)
    )
  ) THEN
    RAISE EXCEPTION 'Not allowed to remove this member' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.team_staff WHERE user_id = p_member_id;

  PERFORM set_config('app.user_guard_bypass', 'on', true);
  UPDATE public.users
  SET active_organization_id = NULL,
      active_care_home_id = NULL,
      active_team_id = NULL,
      is_onboarding_complete = false,
      updated_at = NOW()
  WHERE id = p_member_id;
  PERFORM set_config('app.user_guard_bypass', 'off', true);

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_organization_member(uuid) TO authenticated;
