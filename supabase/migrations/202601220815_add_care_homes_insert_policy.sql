-- ============================================
-- Add Care Homes Insert Policy
-- ============================================
-- This migration adds an RLS policy that allows owners and SaaS admins to create care homes

-- Allow owners and SaaS admins to insert care homes
CREATE POLICY "Owners and SaaS admins can create care homes"
  ON public.care_homes FOR INSERT
  TO authenticated
  WITH CHECK ( 
    public.is_saas_admin() 
    OR (
      -- Check if user is owner of the organization
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
