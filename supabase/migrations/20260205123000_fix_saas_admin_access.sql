-- ============================================
-- FIX SAAS ADMIN ACCESS
-- ============================================

-- Grant SaaS admins full access to care_homes
-- This ensures they can view/manage care homes in the Admin dashboard
CREATE POLICY "SaaS admins manage care homes"
  ON public.care_homes FOR ALL
  TO authenticated
  USING ( public.is_saas_admin() )
  WITH CHECK ( public.is_saas_admin() );

-- Grant SaaS admins full access to teams
-- This ensures they can view/manage teams in the Admin dashboard
CREATE POLICY "SaaS admins manage teams"
  ON public.teams FOR ALL
  TO authenticated
  USING ( public.is_saas_admin() )
  WITH CHECK ( public.is_saas_admin() );
