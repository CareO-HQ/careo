-- ============================================
-- BREAK RLS INFINITE RECURSION CHAIN
-- ============================================

-- 1. ENHANCE HELPERS TO USE JWT ONLY (Recursion Safe)
CREATE OR REPLACE FUNCTION public.get_active_organization_id()
RETURNS UUID AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'active_organization_id')::UUID;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_active_care_home_id()
RETURNS UUID AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'active_care_home_id')::UUID;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. REFACTOR INVITATIONS POLICIES
DROP POLICY IF EXISTS "SaaS admins manage all invitations" ON public.invitations;
DROP POLICY IF EXISTS "Owners and Managers manage invitations" ON public.invitations;

CREATE POLICY "SaaS admins manage all invitations"
  ON public.invitations FOR ALL
  TO authenticated
  USING ( public.is_saas_admin() );

CREATE POLICY "Owners and Managers manage invitations"
  ON public.invitations FOR ALL
  TO authenticated
  USING ( 
    public.get_user_role() IN ('owner', 'manager')
    AND public.get_active_organization_id() = organization_id
  );

-- 3. REFACTOR TEAM POLICIES
DROP POLICY IF EXISTS "SaaS admins manage all teams" ON public.teams;
DROP POLICY IF EXISTS "Users can view teams in their organization" ON public.teams;
DROP POLICY IF EXISTS "Owners and Managers manage teams" ON public.teams;

CREATE POLICY "SaaS admins manage all teams"
  ON public.teams FOR ALL
  TO authenticated
  USING ( public.is_saas_admin() );

CREATE POLICY "Users can view teams in their organization"
  ON public.teams FOR SELECT
  TO authenticated
  USING ( 
    public.is_saas_admin()
    OR public.get_active_organization_id() = organization_id
  );

CREATE POLICY "Owners and Managers manage teams"
  ON public.teams FOR ALL
  TO authenticated
  USING ( 
    public.get_user_role() IN ('owner', 'manager')
    AND public.get_active_organization_id() = organization_id
  );

-- 4. REFACTOR TEAM STAFF POLICIES (formerly unit_staff)
DROP POLICY IF EXISTS "Staff can view their assignments" ON public.team_staff;
DROP POLICY IF EXISTS "Staff can view assignments in their care home" ON public.team_staff;
DROP POLICY IF EXISTS "Owners and managers manage staff assignments" ON public.team_staff;

CREATE POLICY "Staff can view assignments in their care home"
  ON public.team_staff FOR SELECT
  TO authenticated
  USING (
    public.is_saas_admin()
    OR auth.uid() = user_id
    OR EXISTS (
      -- Queries teams, but teams policy no longer queries users (safe)
      SELECT 1 FROM public.teams t
      WHERE t.id = team_id
      AND t.care_home_id = public.get_active_care_home_id()
    )
  );

CREATE POLICY "Owners and managers manage staff assignments"
  ON public.team_staff FOR ALL
  TO authenticated
  USING ( 
    public.get_user_role() IN ('owner', 'manager')
    AND public.get_active_organization_id() = (SELECT organization_id FROM public.teams t WHERE t.id = team_id)
  );

-- 5. RE-APPLY CLEAN USERS POLICY
DROP POLICY IF EXISTS "Users can view staff assigned to their active care home" ON public.users;
CREATE POLICY "Users can view staff assigned to their active care home"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    -- User can see themselves
    auth.uid() = id
    OR 
    -- SaaS Admins see all
    public.is_saas_admin()
    OR 
    (
      -- General staff visibility rule
      (
        EXISTS (
          -- Check if target user is assigned to a unit in the current user's active care home
          -- team_staff policy is now recursion-safe
          SELECT 1 FROM public.team_staff ts
          JOIN public.teams t ON ts.team_id = t.id
          WHERE ts.user_id = public.users.id
          AND t.care_home_id = public.get_active_care_home_id()
        )
        OR EXISTS (
          -- Check if target user is a manager of the current user's active care home
          -- care_home_managers policy is already recursion-safe
          SELECT 1 FROM public.care_home_managers chm
          WHERE chm.user_id = public.users.id
          AND chm.care_home_id = public.get_active_care_home_id()
        )
        OR (
          -- Owners can see everyone in their organization
          public.get_user_role() = 'owner'
          AND active_organization_id = public.get_active_organization_id()
        )
      )
      -- Restriction: Nurses and Care Assistants cannot see Owners
      AND (
        public.get_user_role() NOT IN ('nurse', 'care_assistant')
        OR role != 'owner'
      )
    )
  );
