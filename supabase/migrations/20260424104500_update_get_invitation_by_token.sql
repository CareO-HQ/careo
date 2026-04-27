-- Update get_invitation_by_token to return care home name instead of organization name if it exists
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  token TEXT,
  role user_role,
  organization_id UUID,
  care_home_id UUID,
  team_id UUID,
  invited_by UUID,
  status invitation_status,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  organization_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.email,
    i.token,
    i.role,
    i.organization_id,
    i.care_home_id,
    i.team_id,
    i.invited_by,
    i.status,
    i.expires_at,
    i.created_at,
    i.updated_at,
    COALESCE(ch.name, o.name) AS organization_name
  FROM public.invitations i
  LEFT JOIN public.organizations o ON o.id = i.organization_id
  LEFT JOIN public.care_homes ch ON ch.id = i.care_home_id
  WHERE i.token = p_token
    AND LOWER(i.email) = public.current_user_email();
END;
$$;
