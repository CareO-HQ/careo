-- ============================================
-- Fix Care Homes RLS Policy for Owner Role
-- ============================================
-- This migration fixes the RLS policy for care homes by checking role from public.users table
-- instead of relying solely on auth.users.app_metadata

-- Drop existing policies first
DROP POLICY IF EXISTS "Owners and SaaS admins can create care homes" ON public.care_homes;
DROP POLICY IF EXISTS "Owners and SaaS admins can update care homes" ON public.care_homes;
DROP POLICY IF EXISTS "Owners and SaaS admins can delete care homes" ON public.care_homes;

-- Allow owners and SaaS admins to insert care homes
CREATE POLICY "Owners and SaaS admins can create care homes"
  ON public.care_homes FOR INSERT
  TO authenticated
  WITH CHECK ( 
    public.is_saas_admin() 
    OR (
      -- Check if user is owner of the organization using public.users table directly
      EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND active_organization_id = organization_id
        AND role = 'owner'
      )
    )
  );

-- Allow owners and SaaS admins to update care homes
CREATE POLICY "Owners and SaaS admins can update care homes"
  ON public.care_homes FOR UPDATE
  TO authenticated
  USING ( 
    public.is_saas_admin() 
    OR (
      EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND active_organization_id = organization_id
        AND role = 'owner'
      )
    )
  )
  WITH CHECK ( 
    public.is_saas_admin() 
    OR (
      EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND active_organization_id = organization_id
        AND role = 'owner'
      )
    )
  );

-- Allow owners and SaaS admins to delete care homes
CREATE POLICY "Owners and SaaS admins can delete care homes"
  ON public.care_homes FOR DELETE
  TO authenticated
  USING ( 
    public.is_saas_admin() 
    OR (
      EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND active_organization_id = organization_id
        AND role = 'owner'
      )
    )
  );

-- Also fix get_user_role to check public.users table
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT role::TEXT FROM public.users WHERE id = user_uuid),
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = user_uuid),
    'member'
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- And fix can_access_organization to check public.users table
CREATE OR REPLACE FUNCTION public.can_access_organization(
  user_uuid UUID,
  org_uuid UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  IF public.is_saas_admin(user_uuid) THEN
    RETURN true;
  END IF;
  
  -- Check if user has active_organization_id matching by querying directly
  RETURN EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = user_uuid 
    AND active_organization_id = org_uuid
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
