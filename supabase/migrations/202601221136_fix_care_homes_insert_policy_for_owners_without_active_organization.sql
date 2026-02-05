-- ============================================
-- Fix Care Homes Insert Policy for Owners Without Active Organization
-- ============================================
-- This migration fixes the RLS policy for care homes to allow users with 'owner' role
-- to create care homes even if they don't have an active_organization_id set yet.
-- This addresses the onboarding flow where owners are creating their first care home.

-- Add policy to allow owners to create organizations (for initial onboarding)
DROP POLICY IF EXISTS "Owners can create organizations" ON public.organizations;
CREATE POLICY "Owners can create organizations"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK ( 
    EXISTS (
      SELECT 1 
      FROM public.users 
      WHERE id = auth.uid() 
      AND (role = 'owner' OR is_saas_admin = true)
      -- Only allow creating one organization per owner (prevents abuse)
      AND active_organization_id IS NULL
    )
  );

-- Drop existing insert policy first
DROP POLICY IF EXISTS "Owners and SaaS admins can create care homes" ON public.care_homes;

-- Allow owners and SaaS admins to insert care homes
-- For owners without active_organization_id, we still allow them to create care homes
-- as long as they have the 'owner' role (this handles the initial onboarding case)
CREATE POLICY "Owners and SaaS admins can create care homes"
  ON public.care_homes FOR INSERT
  TO authenticated
  WITH CHECK ( 
    public.is_saas_admin() 
    OR (
      -- Check if user has owner role
      EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'owner'
        -- If user has active_organization_id, it must match
        AND (
          active_organization_id IS NULL 
          OR active_organization_id = organization_id
        )
      )
    )
  );

-- Update the existing update and delete policies to maintain consistency
DROP POLICY IF EXISTS "Owners and SaaS admins can update care homes" ON public.care_homes;
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

DROP POLICY IF EXISTS "Owners and SaaS admins can delete care homes" ON public.care_homes;
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
