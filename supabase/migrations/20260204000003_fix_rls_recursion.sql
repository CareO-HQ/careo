-- ============================================
-- FIX RLS INFINITE RECURSION
-- ============================================

-- Redefine is_saas_admin to be safe for RLS by ONLY checking the JWT
-- Querying public.users inside a policy for public.users causes infinite recursion
CREATE OR REPLACE FUNCTION public.is_saas_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'is_saas_admin')::BOOLEAN,
    false
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Also update get_user_role to check JWT primarily if possible or handle recursion
-- But usually roles are synced to JWT, so checking JWT is safer
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role')::TEXT,
    'care_assistant'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Re-apply policies that might have been cached with the old recursive function
-- Especially on the users table
DROP POLICY IF EXISTS "Users can view staff assigned to their active care home" ON public.users;
CREATE POLICY "Users can view staff assigned to their active care home"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    -- User can see themselves
    auth.uid() = id
    OR 
    -- SaaS Admins see all (uses the new safe function)
    public.is_saas_admin()
    OR 
    (
      -- General staff visibility rule
      (
        EXISTS (
          -- Check if target user is assigned to a unit in the current user's active care home
          SELECT 1 FROM public.team_staff ts
          JOIN public.teams t ON ts.team_id = t.id
          WHERE ts.user_id = public.users.id
          AND t.care_home_id = (auth.jwt() -> 'app_metadata' ->> 'active_care_home_id')::UUID
        )
        OR EXISTS (
          -- Check if target user is a manager of the current user's active care home
          SELECT 1 FROM public.care_home_managers chm
          WHERE chm.user_id = public.users.id
          AND chm.care_home_id = (auth.jwt() -> 'app_metadata' ->> 'active_care_home_id')::UUID
        )
        OR (
          -- Owners can see everyone in their organization
          (auth.jwt() -> 'app_metadata' ->> 'role') = 'owner'
          AND active_organization_id = (auth.jwt() -> 'app_metadata' ->> 'active_organization_id')::UUID
        )
      )
      -- Restriction: Nurses and Care Assistants cannot see Owners
      AND (
        (auth.jwt() -> 'app_metadata' ->> 'role') NOT IN ('nurse', 'care_assistant')
        OR role != 'owner'
      )
    )
  );
