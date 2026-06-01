-- Migration: Add SaaS admin RLS policies for agency tables
-- Date: May 29, 2026

-- 1. Allow SaaS admins to view and manage agency_staff profiles
CREATE POLICY "SaaS admins manage agency staff"
  ON public.agency_staff FOR ALL
  TO authenticated
  USING ( public.is_saas_admin() )
  WITH CHECK ( public.is_saas_admin() );

-- 2. Allow SaaS admins to view and manage agency requests (deployments)
CREATE POLICY "SaaS admins manage agency requests"
  ON public.agency_requests FOR ALL
  TO authenticated
  USING ( public.is_saas_admin() )
  WITH CHECK ( public.is_saas_admin() );

-- 3. Allow SaaS admins to view and manage agency shifts
CREATE POLICY "SaaS admins manage agency shifts"
  ON public.agency_shifts FOR ALL
  TO authenticated
  USING ( public.is_saas_admin() )
  WITH CHECK ( public.is_saas_admin() );
