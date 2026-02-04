-- ============================================
-- FIX STAFF VISIBILITY AND CONTEXT SCOPING
-- ============================================
-- 1. Ensure RLS is enabled
ALTER TABLE public.care_home_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_staff ENABLE ROW LEVEL SECURITY;

-- 2. CARE HOME MANAGERS POLICIES
DROP POLICY IF EXISTS "Users can view care home managers in their organization" ON public.care_home_managers;
CREATE POLICY "Users can view care home managers in their care home"
  ON public.care_home_managers FOR SELECT
  TO authenticated
  USING (
    public.is_saas_admin()
    OR 
    (auth.jwt() -> 'app_metadata' ->> 'active_care_home_id')::UUID = care_home_id
  );

-- 3. TEAM STAFF POLICIES (formerly unit_staff)
-- Update to allow staff in the same care home to see assignments
DROP POLICY IF EXISTS "Staff can view their assignments" ON public.team_staff;
CREATE POLICY "Staff can view assignments in their care home"
  ON public.team_staff FOR SELECT
  TO authenticated
  USING (
    public.is_saas_admin()
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_id
      AND t.care_home_id = (auth.jwt() -> 'app_metadata' ->> 'active_care_home_id')::UUID
    )
  );

-- 4. USERS POLICIES
-- Drop the old overly-broad organization view policy
DROP POLICY IF EXISTS "Users can view users in their organization" ON public.users;

-- New fine-grained visibility policy
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
  );
