-- ============================================
-- FIX USERS TABLE RLS POLICIES
-- Allow users to view other users in their organization
-- ============================================

-- Ensure RLS is enabled on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policy (we'll replace it with more permissive ones)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

-- 1. SaaS admins can view all users
-- Use JWT metadata directly to avoid querying users table (which causes recursion)
CREATE POLICY "SaaS admins can view all users"
  ON public.users FOR SELECT
  TO authenticated
  USING ( 
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_saas_admin')::BOOLEAN, false)
  );

-- 2. Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  TO authenticated
  USING ( auth.uid() = id );

-- 3. Users can view other users in their organization
-- This allows users to see other staff members in the same organization
-- Uses JWT metadata to avoid querying users table (which causes infinite recursion)
CREATE POLICY "Users can view users in their organization"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    -- User can see themselves OR
    auth.uid() = id
    OR
    -- User can see others in their organization
    -- Compare JWT metadata active_organization_id with target user's active_organization_id
    (
      public.users.active_organization_id IS NOT NULL
      AND (auth.jwt() -> 'app_metadata' ->> 'active_organization_id')::UUID = public.users.active_organization_id
    )
  );

-- Note: Update policy remains unchanged - users can only update their own profile
-- This is already defined in the consolidated schema migration
