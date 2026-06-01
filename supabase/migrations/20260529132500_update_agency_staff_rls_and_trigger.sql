-- Migration: Update agency RLS policies to allow SaaS admins and fix setup_new_user_metadata trigger
-- Date: May 29, 2026

-- 1. Drop existing supervisor management policies
DROP POLICY IF EXISTS "Supervisors manage agency staff" ON public.agency_staff;
DROP POLICY IF EXISTS "Supervisors manage agency requests" ON public.agency_requests;
DROP POLICY IF EXISTS "Supervisors manage agency shifts" ON public.agency_shifts;
DROP POLICY IF EXISTS "Supervisors manage agency linkages" ON public.agency_linkages;

-- 2. Create updated policies that allow both supervisors and SaaS admins
CREATE POLICY "Supervisors manage agency staff" ON public.agency_staff FOR ALL USING (
  (COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_agency_staff')::BOOLEAN, false) AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'supervisor')
  OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_saas_admin')::BOOLEAN, false)
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'saas_admin'
);

CREATE POLICY "Supervisors manage agency requests" ON public.agency_requests FOR ALL USING (
  (COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_agency_staff')::BOOLEAN, false) AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'supervisor')
  OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_saas_admin')::BOOLEAN, false)
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'saas_admin'
);

CREATE POLICY "Supervisors manage agency shifts" ON public.agency_shifts FOR ALL USING (
  (COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_agency_staff')::BOOLEAN, false) AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'supervisor')
  OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_saas_admin')::BOOLEAN, false)
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'saas_admin'
);

CREATE POLICY "Supervisors manage agency linkages" ON public.agency_linkages FOR ALL USING (
  (COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_agency_staff')::BOOLEAN, false) AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'supervisor')
  OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_saas_admin')::BOOLEAN, false)
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'saas_admin'
);

-- 3. Update the setup_new_user_metadata trigger function to handle agency staff correctly
CREATE OR REPLACE FUNCTION public.setup_new_user_metadata()
RETURNS TRIGGER AS $$
DECLARE
  v_role_text TEXT;
BEGIN
  RAISE NOTICE 'DEBUG: setup_new_user_metadata triggered for email: %', NEW.email;

  -- If it's agency staff (passed from raw_user_meta_data on client signup)
  IF COALESCE((NEW.raw_user_meta_data->>'is_agency_staff')::BOOLEAN, false) THEN
    v_role_text := COALESCE(NEW.raw_user_meta_data->>'role', 'supervisor');
    
    NEW.raw_app_meta_data := jsonb_set(
      COALESCE(NEW.raw_app_meta_data, '{}'::jsonb),
      '{is_agency_staff}',
      'true'::jsonb
    );
    NEW.raw_app_meta_data := jsonb_set(
      NEW.raw_app_meta_data,
      '{role}',
      to_jsonb(v_role_text)
    );
    RETURN NEW;
  END IF;

  -- For other users, set as SaaS Admin (for testing phase)
  RAISE NOTICE 'DEBUG: Forcing SaaS Admin role for %', NEW.email;
  
  NEW.raw_app_meta_data := jsonb_set(
    COALESCE(NEW.raw_app_meta_data, '{}'::jsonb),
    '{is_saas_admin}',
    'true'::jsonb
  );
  NEW.raw_app_meta_data := jsonb_set(
    NEW.raw_app_meta_data,
    '{role}',
    '"saas_admin"'::jsonb
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
