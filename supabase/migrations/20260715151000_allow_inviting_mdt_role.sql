-- Allow inviting users with the 'mdt' role
-- Migration: 20260715151000_allow_inviting_mdt_role.sql

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
      AND invitation_role IN ('manager', 'nurse', 'care_assistant', 'mdt');
  END IF;

  IF public.current_user_role() = 'manager' THEN
    RETURN target_organization_id = public.current_active_organization_id()
      AND target_care_home_id = public.current_active_care_home_id()
      AND invitation_role IN ('nurse', 'care_assistant', 'mdt');
  END IF;

  RETURN FALSE;
END;
$$;
