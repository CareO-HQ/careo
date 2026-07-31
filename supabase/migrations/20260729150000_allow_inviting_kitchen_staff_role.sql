-- Allow inviting users with the 'kitchen_staff' role
-- Migration: 20260729150000_allow_inviting_kitchen_staff_role.sql

-- 1. Add 'kitchen_staff' value to public.user_role enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'kitchen_staff';

-- 2. Update public.can_manage_invitation function to allow inviting 'kitchen_staff'
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
      AND invitation_role IN ('manager', 'nurse', 'care_assistant', 'mdt', 'rqia', 'kitchen_staff');
  END IF;

  IF public.current_user_role() = 'manager' THEN
    RETURN target_organization_id = public.current_active_organization_id()
      AND target_care_home_id = public.current_active_care_home_id()
      AND invitation_role IN ('nurse', 'care_assistant', 'mdt', 'rqia', 'kitchen_staff');
  END IF;

  RETURN FALSE;
END;
$$;
