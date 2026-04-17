-- Make invitation lookup tolerant of legacy/new invitation timestamp columns.
-- Some environments have invitations.invited_at/accepted_at but not created_at/updated_at.

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invitations'
      AND column_name = 'invited_at'
  ) THEN
    UPDATE public.invitations
    SET
      created_at = COALESCE(created_at, invited_at, NOW()),
      updated_at = COALESCE(updated_at, invited_at, NOW())
    WHERE created_at IS NULL OR updated_at IS NULL;
  ELSE
    UPDATE public.invitations
    SET
      created_at = COALESCE(created_at, NOW()),
      updated_at = COALESCE(updated_at, NOW())
    WHERE created_at IS NULL OR updated_at IS NULL;
  END IF;
END;
$$;

ALTER TABLE public.invitations
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET NOT NULL;

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
    o.name AS organization_name
  FROM public.invitations i
  LEFT JOIN public.organizations o ON o.id = i.organization_id
  WHERE i.token = p_token
    AND LOWER(i.email) = public.current_user_email();
END;
$$;
