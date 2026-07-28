-- Allow inviting users with the 'rqia' role
-- Migration: 20260721150000_allow_inviting_rqia_role.sql

-- 1. Add 'rqia' value to public.user_role enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'rqia';

-- 2. Update public.can_manage_invitation function to allow inviting 'rqia'
CREATE OR REPLACE FUNCTION public.can_manage_invitation(
  target_organization_id UUID,
  target_care_home_id UUID,
  invitation_role user_role
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF public.is_saas_admin() THEN
    RETURN invitation_role IN ('owner', 'manager');
  END IF;

  IF public.current_user_role() = 'owner' THEN
    RETURN target_organization_id = public.current_active_organization_id()
      AND invitation_role IN ('manager', 'nurse', 'care_assistant', 'mdt', 'rqia');
  END IF;

  IF public.current_user_role() = 'manager' THEN
    RETURN target_organization_id = public.current_active_organization_id()
      AND target_care_home_id = public.current_active_care_home_id()
      AND invitation_role IN ('nurse', 'care_assistant', 'mdt', 'rqia');
  END IF;

  RETURN FALSE;
END;
$$;

-- 3. Update storage and resident files RLS helper functions for rqia role
CREATE OR REPLACE FUNCTION public.can_access_resident_file_object(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
  target_resident_id UUID := public.leading_uuid(COALESCE((storage.foldername(object_name))[1], ''));
BEGIN
  RETURN target_resident_id IS NOT NULL
    AND public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin', 'mdt', 'rqia')
    AND public.can_access_resident(target_resident_id);
END;
$$;
