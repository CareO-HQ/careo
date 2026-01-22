-- ============================================
-- Fix Care Homes RLS Policies Role Check
-- ============================================
-- This migration fixes the role check in care homes RLS policies
-- to use the correct method of checking user role from auth.users.raw_app_meta_data

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
      -- Check if user is owner of the organization using get_user_role function
      public.get_user_role(auth.uid()) = 'owner'
      AND public.can_access_organization(auth.uid(), organization_id)
    )
  );

-- Allow owners and SaaS admins to update care homes
CREATE POLICY "Owners and SaaS admins can update care homes"
  ON public.care_homes FOR UPDATE
  TO authenticated
  USING ( 
    public.is_saas_admin() 
    OR (
      public.get_user_role(auth.uid()) = 'owner'
      AND public.can_access_organization(auth.uid(), organization_id)
    )
  )
  WITH CHECK ( 
    public.is_saas_admin() 
    OR (
      public.get_user_role(auth.uid()) = 'owner'
      AND public.can_access_organization(auth.uid(), organization_id)
    )
  );

-- Allow owners and SaaS admins to delete care homes
CREATE POLICY "Owners and SaaS admins can delete care homes"
  ON public.care_homes FOR DELETE
  TO authenticated
  USING ( 
    public.is_saas_admin() 
    OR (
      public.get_user_role(auth.uid()) = 'owner'
      AND public.can_access_organization(auth.uid(), organization_id)
    )
  );
