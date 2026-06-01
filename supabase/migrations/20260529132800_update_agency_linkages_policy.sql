-- Migration: Update agency_linkages RLS policy to allow SaaS admins
-- Date: May 29, 2026

-- 1. Drop existing supervisor management policies
DROP POLICY IF EXISTS "Supervisors manage agency linkages" ON public.agency_linkages;

-- 2. Create updated policy that allows both supervisors and SaaS admins
CREATE POLICY "Supervisors manage agency linkages" ON public.agency_linkages FOR ALL USING (
  (COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_agency_staff')::BOOLEAN, false) AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'supervisor')
  OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_saas_admin')::BOOLEAN, false)
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'saas_admin'
);
