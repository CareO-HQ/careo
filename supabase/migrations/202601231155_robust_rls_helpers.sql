-- ============================================
-- ROBUST RLS HELPERS AND OWNER VISIBILITY FIX
-- ============================================

-- 1. Update is_saas_admin to check public.users first
CREATE OR REPLACE FUNCTION public.is_saas_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_saas_admin FROM public.users WHERE id = auth.uid()),
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_saas_admin')::BOOLEAN, false)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Update can_access_organization to check public.users first
CREATE OR REPLACE FUNCTION public.can_access_organization(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT 
    public.is_saas_admin()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.active_organization_id = org_id
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Update get_user_role to check public.users first
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT role::TEXT FROM public.users WHERE id = user_uuid),
    COALESCE((auth.users.raw_app_meta_data->>'role')::TEXT, 'member')
  )
  FROM auth.users
  WHERE auth.users.id = user_uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. Re-apply TEAMS policies using robust helpers
DROP POLICY IF EXISTS "SaaS admins manage all teams" ON public.teams;
DROP POLICY IF EXISTS "Users can view teams in their organization" ON public.teams;
DROP POLICY IF EXISTS "Owners and Managers manage teams" ON public.teams;

CREATE POLICY "SaaS admins manage all teams"
  ON public.teams FOR ALL
  TO authenticated
  USING ( public.is_saas_admin() )
  WITH CHECK ( public.is_saas_admin() );

CREATE POLICY "Users can view teams in their organization"
  ON public.teams FOR SELECT
  TO authenticated
  USING ( public.can_access_organization(organization_id) );

CREATE POLICY "Owners and Managers manage teams"
  ON public.teams FOR ALL
  TO authenticated
  USING ( 
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager')
  )
  WITH CHECK ( 
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager')
  );

-- 5. Re-apply CARE HOMES policies using robust helpers
DROP POLICY IF EXISTS "Strict Owner Insert" ON public.care_homes;
DROP POLICY IF EXISTS "Strict Owner Select" ON public.care_homes;
DROP POLICY IF EXISTS "Strict Owner Update" ON public.care_homes;
DROP POLICY IF EXISTS "Strict Owner Delete" ON public.care_homes;
DROP POLICY IF EXISTS "Owners and SaaS admins can create care homes" ON public.care_homes;
DROP POLICY IF EXISTS "Owners and SaaS admins can update care homes" ON public.care_homes;
DROP POLICY IF EXISTS "Owners and SaaS admins can delete care homes" ON public.care_homes;

CREATE POLICY "Users can view care homes in their organization"
  ON public.care_homes FOR SELECT
  TO authenticated
  USING ( public.can_access_organization(organization_id) );

CREATE POLICY "Owners and Managers manage care homes"
  ON public.care_homes FOR ALL
  TO authenticated
  USING ( 
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager')
  )
  WITH CHECK ( 
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager')
  );

-- 6. Re-apply ORGANIZATIONS policies
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;
CREATE POLICY "Users can view their own organization"
  ON public.organizations FOR SELECT
  TO authenticated
  USING ( public.can_access_organization(id) );
