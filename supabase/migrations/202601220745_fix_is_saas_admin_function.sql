-- ============================================
-- Fix is_saas_admin function
-- ============================================
-- This migration fixes the error: 
-- "function public.is_saas_admin(uuid) does not exist"
-- by creating an overloaded version of the function that accepts a UUID parameter

-- Create an overloaded version of is_saas_admin that accepts a UUID parameter
CREATE OR REPLACE FUNCTION public.is_saas_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(is_saas_admin, false)
  FROM public.users
  WHERE id = user_uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Keep the existing version that uses JWT metadata for backwards compatibility
CREATE OR REPLACE FUNCTION public.is_saas_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_saas_admin')::BOOLEAN, false);
$$ LANGUAGE sql STABLE SECURITY DEFINER;
