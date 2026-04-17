-- Allow care_assistant (and other roles) to update weight_check_frequency when they can access the resident.
-- Direct UPDATE on residents is restricted to owner/manager/nurse/saas_admin by RLS; mobile staff often use care_assistant.

CREATE OR REPLACE FUNCTION public.set_resident_weight_check_frequency(
  p_resident_id uuid,
  p_frequency text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := public.current_user_role();

  IF v_role IS NULL OR v_role NOT IN (
    'owner',
    'manager',
    'nurse',
    'saas_admin',
    'care_assistant'
  ) THEN
    RAISE EXCEPTION 'Not allowed to update weight check frequency'
      USING ERRCODE = '42501';
  END IF;

  IF p_frequency IS NULL OR p_frequency NOT IN ('weekly', 'monthly', 'as-needed') THEN
    RAISE EXCEPTION 'Invalid weight_check_frequency'
      USING ERRCODE = '23514';
  END IF;

  IF NOT public.can_access_resident(p_resident_id) THEN
    RAISE EXCEPTION 'Resident not accessible'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.residents
  SET weight_check_frequency = p_frequency
  WHERE id = p_resident_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resident not found'
      USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_resident_weight_check_frequency(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_resident_weight_check_frequency(uuid, text) TO authenticated;
