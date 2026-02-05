-- ============================================
-- ROBUST RLS HELPERS WITH ONBOARDING SUPPORT
-- ============================================

-- 1. Update get_user_role to check public.users as fallback
-- This is safe from recursion because self-lookup (auth.uid() = id) 
-- is the first check in the users policy.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role')::TEXT,
    (SELECT role::TEXT FROM public.users WHERE id = auth.uid())
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Update get_active_organization_id to check public.users as fallback
CREATE OR REPLACE FUNCTION public.get_active_organization_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'active_organization_id')::UUID,
    (SELECT active_organization_id FROM public.users WHERE id = auth.uid())
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Update get_active_care_home_id to check public.users as fallback
CREATE OR REPLACE FUNCTION public.get_active_care_home_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'active_care_home_id')::UUID,
    (SELECT active_care_home_id FROM public.users WHERE id = auth.uid())
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. Redefine is_saas_admin with fallback (though usually JWT is enough for them)
CREATE OR REPLACE FUNCTION public.is_saas_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'is_saas_admin')::BOOLEAN,
    COALESCE((SELECT is_saas_admin FROM public.users WHERE id = auth.uid()), false)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 5. Re-apply teams policy to ensure it uses the robust helpers
-- No changes to policy SQL needed, but redefining helpers updates their behavior.
-- However, we should explicitly check INSERT/UPDATE with "WITH CHECK" 
-- to ensure they work for Managers.

DROP POLICY IF EXISTS "Owners and Managers manage teams" ON public.teams;
CREATE POLICY "Owners and Managers manage teams"
  ON public.teams FOR ALL
  TO authenticated
  USING ( 
    public.get_user_role() IN ('owner', 'manager')
    AND public.get_active_organization_id() = organization_id
  )
  WITH CHECK (
    public.get_user_role() IN ('owner', 'manager')
    AND (
      public.get_active_organization_id() = organization_id
      OR
      -- Allow insertion if the user's fallback org matches
      (SELECT active_organization_id FROM public.users WHERE id = auth.uid()) = organization_id
    )
  );

-- 6. Also ensure care_homes has similar robust policy
DROP POLICY IF EXISTS "Owners and Managers manage care homes" ON public.care_homes;
CREATE POLICY "Owners and Managers manage care homes"
  ON public.care_homes FOR ALL
  TO authenticated
  USING ( 
    public.get_user_role() IN ('owner', 'manager')
    AND public.get_active_organization_id() = organization_id
  )
  WITH CHECK (
    public.get_user_role() IN ('owner', 'manager')
    AND (
      public.get_active_organization_id() = organization_id
      OR
      (SELECT active_organization_id FROM public.users WHERE id = auth.uid()) = organization_id
    )
  );
