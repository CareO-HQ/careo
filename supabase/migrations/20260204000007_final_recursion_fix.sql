-- ============================================
-- BREAK RLS RECURSION VIA AUTH SCHEMA LOOKUP
-- ============================================

-- To break the recursion Users -> Teams -> Users, we must NOT query
-- public.users inside any helper function used by policies on tables 
-- that public.users policy itself queries.

-- Instead, we leverage auth.users which is synced via triggers but
-- does NOT have RLS policies that loop back.

-- 1. Redefine get_user_role to be recursion-safe
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  BEGIN
    -- Fast path: JWT
    IF (auth.jwt() -> 'app_metadata' ->> 'role') IS NOT NULL THEN
      RETURN (auth.jwt() -> 'app_metadata' ->> 'role')::TEXT;
    END IF;

    -- Fallback: Look up from auth.users (NOT public.users)
    -- This is safe because auth schema tables don't have RLS looping back
    RETURN (
      SELECT COALESCE(raw_app_meta_data ->> 'role', 'care_assistant')
      FROM auth.users
      WHERE id = auth.uid()
    );
  END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Redefine get_active_organization_id to be recursion-safe
CREATE OR REPLACE FUNCTION public.get_active_organization_id()
RETURNS UUID AS $$
  BEGIN
    -- Fast path: JWT
    IF (auth.jwt() -> 'app_metadata' ->> 'active_organization_id') IS NOT NULL THEN
      RETURN (auth.jwt() -> 'app_metadata' ->> 'active_organization_id')::UUID;
    END IF;

    -- Fallback: Look up from auth.users
    RETURN (
      SELECT (raw_app_meta_data ->> 'active_organization_id')::UUID
      FROM auth.users
      WHERE id = auth.uid()
    );
  END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Redefine get_active_care_home_id to be recursion-safe
CREATE OR REPLACE FUNCTION public.get_active_care_home_id()
RETURNS UUID AS $$
  BEGIN
    -- Fast path: JWT
    IF (auth.jwt() -> 'app_metadata' ->> 'active_care_home_id') IS NOT NULL THEN
      RETURN (auth.jwt() -> 'app_metadata' ->> 'active_care_home_id')::UUID;
    END IF;

    -- Fallback: Look up from auth.users
    RETURN (
      SELECT (raw_app_meta_data ->> 'active_care_home_id')::UUID
      FROM auth.users
      WHERE id = auth.uid()
    );
  END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 4. Redefine is_saas_admin to be recursion-safe
CREATE OR REPLACE FUNCTION public.is_saas_admin()
RETURNS BOOLEAN AS $$
  BEGIN
    -- Fast path: JWT
    IF (auth.jwt() -> 'app_metadata' ->> 'is_saas_admin') IS NOT NULL THEN
      RETURN (auth.jwt() -> 'app_metadata' ->> 'is_saas_admin')::BOOLEAN;
    END IF;

    -- Fallback: Look up from auth.users
    RETURN COALESCE(
      (SELECT (raw_app_meta_data ->> 'is_saas_admin')::BOOLEAN FROM auth.users WHERE id = auth.uid()),
      false
    );
  END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 5. RE-APPLY CLEAN POLICIES

-- TEAMS
DROP POLICY IF EXISTS "SaaS admins manage all teams" ON public.teams;
DROP POLICY IF EXISTS "Users can view teams in their organization" ON public.teams;
DROP POLICY IF EXISTS "Owners and Managers manage teams" ON public.teams;

CREATE POLICY "SaaS admins manage all teams"
  ON public.teams FOR ALL TO authenticated
  USING ( public.is_saas_admin() );

CREATE POLICY "Users can view teams in their organization"
  ON public.teams FOR SELECT TO authenticated
  USING ( 
    public.is_saas_admin()
    OR public.get_active_organization_id() = organization_id
  );

CREATE POLICY "Owners and Managers manage teams"
  ON public.teams FOR ALL TO authenticated
  USING ( 
    public.get_user_role() IN ('owner', 'manager')
    AND public.get_active_organization_id() = organization_id
  );

-- USERS
DROP POLICY IF EXISTS "Users can view staff assigned to their active care home" ON public.users;
CREATE POLICY "Users can view staff assigned to their active care home"
  ON public.users FOR SELECT TO authenticated
  USING (
    -- User can see themselves (Standard safe rule)
    auth.uid() = id
    OR 
    -- SaaS Admins see all (Safe helper)
    public.is_saas_admin()
    OR 
    (
      -- Visibility based on assignments (Now safe because helpers don't loop back to users)
      (
        EXISTS (
          SELECT 1 FROM public.team_staff ts
          JOIN public.teams t ON ts.team_id = t.id
          WHERE ts.user_id = public.users.id
          AND t.care_home_id = public.get_active_care_home_id()
        )
        OR EXISTS (
          SELECT 1 FROM public.care_home_managers chm
          WHERE chm.user_id = public.users.id
          AND chm.care_home_id = public.get_active_care_home_id()
        )
        OR (
          public.get_user_role() = 'owner'
          AND active_organization_id = public.get_active_organization_id()
        )
      )
      -- Role-based restriction
      AND (
        public.get_user_role() NOT IN ('nurse', 'care_assistant')
        OR role != 'owner'
      )
    )
  );
