-- ============================================
-- CAREO: ADD RLS POLICIES FOR AGENCY ONBOARDING
-- ============================================
-- Migration: Add missing RLS policies for users, team_staff, and agency_requests during activation
-- Date: May 29, 2026

-- 1. Allow users to insert their own profile in public.users (needed for upsert during onboarding/activation)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK ( auth.uid() = id );

-- 2. Allow users to manage (insert/update/delete) their own assignments in public.team_staff
DROP POLICY IF EXISTS "Users can manage their own team assignments" ON public.team_staff;
CREATE POLICY "Users can manage their own team assignments"
  ON public.team_staff FOR ALL
  TO authenticated
  USING ( auth.uid() = user_id )
  WITH CHECK ( auth.uid() = user_id );

-- 3. Allow agency staff to update their own requests (needed for activating/offboarding assignments client-side)
DROP POLICY IF EXISTS "Agency staff update own requests" ON public.agency_requests;
CREATE POLICY "Agency staff update own requests"
  ON public.agency_requests FOR UPDATE
  TO authenticated
  USING ( public.is_own_agency_staff(agency_staff_id) )
  WITH CHECK ( public.is_own_agency_staff(agency_staff_id) );
