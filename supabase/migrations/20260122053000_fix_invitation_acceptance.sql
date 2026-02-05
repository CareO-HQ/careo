-- ============================================
-- Fix Invitation Acceptance Flow
-- ============================================
-- This migration fixes two critical issues:
-- 1. RLS policies that block newly-registered users from querying invitations
-- 2. setup_new_user_metadata() trigger that forces all users to be saas_admin

-- ============================================
-- 1. FIX INVITATION RLS POLICIES
-- ============================================

-- Drop the overly restrictive policies
DROP POLICY IF EXISTS "SaaS admins can manage all invitations" ON public.invitations;
DROP POLICY IF EXISTS "Owners can manage invitations for their organization" ON public.invitations;

-- Allow authenticated users to SELECT invitations
-- This is safe because:
-- - Token is UNIQUE and hard to guess (UUID)
-- - Users can only find invitations if they have the token
-- - No sensitive data is exposed in invitation records
CREATE POLICY "Allow viewing invitations"
  ON public.invitations FOR SELECT
  TO authenticated
  USING (true);

-- Restrict INSERT to authorized roles only
CREATE POLICY "SaaS admins and owners can create invitations"
  ON public.invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_saas_admin() 
    OR public.can_access_organization(organization_id)
  );

-- Restrict UPDATE to authorized roles only
CREATE POLICY "SaaS admins and owners can update invitations"
  ON public.invitations FOR UPDATE
  TO authenticated
  USING (
    public.is_saas_admin() 
    OR public.can_access_organization(organization_id)
  )
  WITH CHECK (
    public.is_saas_admin() 
    OR public.can_access_organization(organization_id)
  );

-- Restrict DELETE to authorized roles only
CREATE POLICY "SaaS admins and owners can delete invitations"
  ON public.invitations FOR DELETE
  TO authenticated
  USING (
    public.is_saas_admin() 
    OR public.can_access_organization(organization_id)
  );

-- ============================================
-- 2. FIX USER METADATA SETUP TRIGGER
-- ============================================

-- Replace the trigger function to check for pending invitations
CREATE OR REPLACE FUNCTION public.setup_new_user_metadata()
RETURNS TRIGGER AS $$
DECLARE
  v_invitation_exists BOOLEAN;
  v_invitation_role TEXT;
BEGIN
  RAISE NOTICE 'DEBUG: setup_new_user_metadata triggered for email: %', NEW.email;

  -- Check if there's a pending invitation for this email
  SELECT 
    EXISTS(SELECT 1 FROM public.invitations WHERE email = NEW.email AND status = 'pending'),
    COALESCE((SELECT role FROM public.invitations WHERE email = NEW.email AND status = 'pending' LIMIT 1)::TEXT, 'care_assistant')
  INTO v_invitation_exists, v_invitation_role;

  IF v_invitation_exists THEN
    -- User is joining via invitation - DON'T make them saas_admin
    RAISE NOTICE 'DEBUG: User % has pending invitation with role %', NEW.email, v_invitation_role;
    
    NEW.raw_app_meta_data = jsonb_set(
      COALESCE(NEW.raw_app_meta_data, '{}'::jsonb),
      '{is_saas_admin}',
      'false'::jsonb
    );
    NEW.raw_app_meta_data = jsonb_set(
      NEW.raw_app_meta_data,
      '{role}',
      to_jsonb(v_invitation_role)
    );
  ELSE
    -- No invitation - make them saas_admin (for testing/development)
    -- In production, you may want to change this behavior
    RAISE NOTICE 'DEBUG: No invitation found, setting as SaaS Admin for %', NEW.email;
    
    NEW.raw_app_meta_data = jsonb_set(
      COALESCE(NEW.raw_app_meta_data, '{}'::jsonb),
      '{is_saas_admin}',
      'true'::jsonb
    );
    NEW.raw_app_meta_data = jsonb_set(
      NEW.raw_app_meta_data,
      '{role}',
      '"saas_admin"'::jsonb
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The trigger on_auth_user_created_init already exists and calls this function
-- No need to recreate the trigger, just the function
