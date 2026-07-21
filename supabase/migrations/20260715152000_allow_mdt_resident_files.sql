-- Allow 'mdt' role to upload and view resident files (such as MDT reports/documents) in storage and database
-- Migration: 20260715152000_allow_mdt_resident_files.sql

-- 1. Update storage RLS helper function
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
    AND public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin', 'mdt')
    AND public.can_access_resident(target_resident_id);
END;
$$;

-- 2. Re-create public.files table policies to allow 'mdt' role
DROP POLICY IF EXISTS "Users can view files in scope" ON public.files;
DROP POLICY IF EXISTS "Authorized roles can manage files in scope" ON public.files;

CREATE POLICY "Users can view files in scope"
  ON public.files FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin', 'mdt')
    AND public.can_access_care_context(organization_id, care_home_id, resident_id)
  );

CREATE POLICY "Authorized roles can manage files in scope"
  ON public.files FOR ALL
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin', 'mdt')
    AND public.can_access_care_context(organization_id, care_home_id, resident_id)
  )
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin', 'mdt')
    AND public.can_access_care_context(organization_id, care_home_id, resident_id)
  );
