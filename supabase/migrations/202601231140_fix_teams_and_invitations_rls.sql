-- ============================================
-- FIX TEAMS AND INVITATIONS RLS POLICIES
-- ============================================
-- This migration renames naming inconsistencies and adds robust RLS policies
-- that don't rely solely on JWT metadata, fixing onboarding and dashboard errors.

-- 1. RENAME unit_staff TO team_staff
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'unit_staff' AND table_schema = 'public') THEN
    ALTER TABLE public.unit_staff RENAME TO team_staff;
  END IF;
END $$;

-- 2. ENABLE RLS (Ensure it's on)
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_staff ENABLE ROW LEVEL SECURITY;

-- 3. INVITATION POLICIES
DROP POLICY IF EXISTS "SaaS admins can manage all invitations" ON public.invitations;
DROP POLICY IF EXISTS "Owners can manage invitations for their organization" ON public.invitations;

CREATE POLICY "SaaS admins manage all invitations"
  ON public.invitations FOR ALL
  TO authenticated
  USING ( public.is_saas_admin() )
  WITH CHECK ( public.is_saas_admin() );

CREATE POLICY "Owners and Managers manage invitations"
  ON public.invitations FOR ALL
  TO authenticated
  USING ( 
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('owner', 'manager')
      AND u.active_organization_id = organization_id
    )
  )
  WITH CHECK ( 
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('owner', 'manager')
      AND u.active_organization_id = organization_id
    )
  );

-- 4. TEAM POLICIES
DROP POLICY IF EXISTS "SaaS admins can manage all teams" ON public.teams;
DROP POLICY IF EXISTS "Users can view teams in their organization" ON public.teams;

CREATE POLICY "SaaS admins manage all teams"
  ON public.teams FOR ALL
  TO authenticated
  USING ( public.is_saas_admin() )
  WITH CHECK ( public.is_saas_admin() );

CREATE POLICY "Users can view teams in their organization"
  ON public.teams FOR SELECT
  TO authenticated
  USING ( 
    public.is_saas_admin()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.active_organization_id = organization_id
    )
  );

CREATE POLICY "Owners and Managers manage teams"
  ON public.teams FOR ALL
  TO authenticated
  USING ( 
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('owner', 'manager')
      AND u.active_organization_id = organization_id
    )
  )
  WITH CHECK ( 
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('owner', 'manager')
      AND u.active_organization_id = organization_id
    )
  );

-- 5. TEAM STAFF POLICIES (Renamed from unit_staff)
DROP POLICY IF EXISTS "Staff can view their assignments" ON public.team_staff;
DROP POLICY IF EXISTS "Owners and managers can manage staff assignments" ON public.team_staff;

CREATE POLICY "Staff can view their assignments"
  ON public.team_staff FOR SELECT
  TO authenticated
  USING ( 
    public.is_saas_admin()
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('owner', 'manager')
      AND u.active_organization_id = (SELECT organization_id FROM public.teams t WHERE t.id = team_id)
    )
  );

CREATE POLICY "Owners and managers manage staff assignments"
  ON public.team_staff FOR ALL
  TO authenticated
  USING ( 
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('owner', 'manager')
      AND u.active_organization_id = (SELECT organization_id FROM public.teams t WHERE t.id = team_id)
    )
  )
  WITH CHECK ( 
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('owner', 'manager')
      AND u.active_organization_id = (SELECT organization_id FROM public.teams t WHERE t.id = team_id)
    )
  );
