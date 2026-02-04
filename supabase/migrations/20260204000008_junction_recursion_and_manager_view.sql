-- ============================================
-- FIX RLS RECURSION IN JUNCTION TABLES & EXPAND MANAGER VISIBILITY
-- ============================================

-- 1. FIX TEAM STAFF POLICIES (formerly unit_staff)
-- Avoid querying public.users to prevent recursion
DROP POLICY IF EXISTS "Staff can view assignments in their care home" ON public.team_staff;
DROP POLICY IF EXISTS "Staff can view their assignments" ON public.team_staff;
DROP POLICY IF EXISTS "Owners and managers manage staff assignments" ON public.team_staff;

CREATE POLICY "Users can view team assignments"
  ON public.team_staff FOR SELECT
  TO authenticated
  USING (
    public.is_saas_admin()
    OR auth.uid() = user_id
    OR public.get_user_role() IN ('owner', 'manager')
  );

CREATE POLICY "Owners and managers manage staff assignments"
  ON public.team_staff FOR ALL
  TO authenticated
  USING (
    public.is_saas_admin()
    OR public.get_user_role() IN ('owner', 'manager')
  );

-- 2. FIX CARE HOME MANAGERS POLICIES
DROP POLICY IF EXISTS "Users can view care home managers in their care home" ON public.care_home_managers;
CREATE POLICY "Users can view care home managers"
  ON public.care_home_managers FOR SELECT
  TO authenticated
  USING (
    public.is_saas_admin()
    OR auth.uid() = user_id
    OR public.get_user_role() IN ('owner', 'manager')
  );

DROP POLICY IF EXISTS "Owners manage care home managers" ON public.care_home_managers;
CREATE POLICY "Owners manage care home managers"
  ON public.care_home_managers FOR ALL
  TO authenticated
  USING (
    public.is_saas_admin()
    OR public.get_user_role() = 'owner'
  );

-- 3. FIX INVITATIONS POLICIES
DROP POLICY IF EXISTS "SaaS admins manage all invitations" ON public.invitations;
DROP POLICY IF EXISTS "Owners and Managers manage invitations" ON public.invitations;

CREATE POLICY "Users view invitations"
  ON public.invitations FOR SELECT
  TO authenticated
  USING (
    public.is_saas_admin()
    OR public.get_active_organization_id() = organization_id
  );

CREATE POLICY "Owners and Managers manage invitations"
  ON public.invitations FOR ALL
  TO authenticated
  USING (
    public.is_saas_admin()
    OR (
      public.get_user_role() IN ('owner', 'manager')
      AND public.get_active_organization_id() = organization_id
    )
  );

-- 4. UPDATE USERS visibility policy to be more inclusive for Managers
-- and resolve any remaining ambiguity.
DROP POLICY IF EXISTS "Users can view staff assigned to their active care home" ON public.users;

CREATE POLICY "Users visibility policy"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    -- Rule 1: Self
    auth.uid() = id
    OR 
    -- Rule 2: SaaS Admin
    public.is_saas_admin()
    OR 
    -- Rule 3: Owners and Managers see everyone in the organization
    (
      public.get_user_role() IN ('owner', 'manager')
      AND active_organization_id = public.get_active_organization_id()
    )
    OR
    -- Rule 4: Staff see people in their Care Home
    (
      public.get_user_role() IN ('nurse', 'care_assistant')
      AND (
        -- Directly assigned to the same care home
        (active_care_home_id = public.get_active_care_home_id())
        OR
        -- Assigned to a team in the same care home
        EXISTS (
          SELECT 1 FROM public.team_staff ts
          JOIN public.teams t ON ts.team_id = t.id
          WHERE ts.user_id = public.users.id
          AND t.care_home_id = public.get_active_care_home_id()
        )
      )
      -- Staff don't see owners
      AND role != 'owner'
    )
  );
