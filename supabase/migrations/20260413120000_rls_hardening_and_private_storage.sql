-- ============================================
-- RLS HARDENING AND PRIVATE STORAGE
-- ============================================

-- --------------------------------------------
-- Helper functions
-- --------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') IS NOT NULL THEN
    RETURN (auth.jwt() -> 'app_metadata' ->> 'role')::TEXT;
  END IF;

  RETURN COALESCE(
    (
      SELECT raw_app_meta_data ->> 'role'
      FROM auth.users
      WHERE id = auth.uid()
    ),
    'care_assistant'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF (auth.jwt() ->> 'email') IS NOT NULL THEN
    RETURN LOWER(auth.jwt() ->> 'email');
  END IF;

  RETURN LOWER(
    COALESCE(
      (
        SELECT email
        FROM auth.users
        WHERE id = auth.uid()
      ),
      ''
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.current_active_organization_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'active_organization_id') IS NOT NULL THEN
    RETURN (auth.jwt() -> 'app_metadata' ->> 'active_organization_id')::UUID;
  END IF;

  RETURN (
    SELECT (raw_app_meta_data ->> 'active_organization_id')::UUID
    FROM auth.users
    WHERE id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.current_active_care_home_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'active_care_home_id') IS NOT NULL THEN
    RETURN (auth.jwt() -> 'app_metadata' ->> 'active_care_home_id')::UUID;
  END IF;

  RETURN (
    SELECT (raw_app_meta_data ->> 'active_care_home_id')::UUID
    FROM auth.users
    WHERE id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.leading_uuid(value TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  match_text TEXT;
BEGIN
  match_text := substring(value FROM '^([0-9a-fA-F-]{36})');

  IF match_text IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN match_text::UUID;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_care_home(target_care_home_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL OR target_care_home_id IS NULL THEN FALSE
    WHEN public.is_saas_admin() THEN TRUE
    WHEN public.current_user_role() = 'owner' THEN EXISTS (
      SELECT 1
      FROM public.care_homes ch
      WHERE ch.id = target_care_home_id
        AND ch.organization_id = public.current_active_organization_id()
    )
    ELSE target_care_home_id = public.current_active_care_home_id()
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_resident(target_resident_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.residents r
    WHERE r.id = target_resident_id
      AND (
        public.is_saas_admin()
        OR (
          public.current_user_role() = 'owner'
          AND r.organization_id = public.current_active_organization_id()
        )
        OR r.care_home_id = public.current_active_care_home_id()
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_care_context(
  target_organization_id UUID,
  target_care_home_id UUID DEFAULT NULL,
  target_resident_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF public.is_saas_admin() THEN
    RETURN TRUE;
  END IF;

  IF target_resident_id IS NOT NULL THEN
    RETURN public.can_access_resident(target_resident_id);
  END IF;

  IF target_care_home_id IS NOT NULL THEN
    RETURN public.can_access_care_home(target_care_home_id);
  END IF;

  RETURN public.current_user_role() = 'owner'
    AND target_organization_id = public.current_active_organization_id();
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_user_record(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = target_user_id
      AND (
        auth.uid() = u.id
        OR public.is_saas_admin()
        OR (
          public.current_user_role() IN ('owner', 'manager')
          AND u.active_organization_id = public.current_active_organization_id()
        )
        OR (
          public.current_user_role() IN ('nurse', 'care_assistant')
          AND u.role <> 'owner'
          AND (
            u.active_care_home_id = public.current_active_care_home_id()
            OR EXISTS (
              SELECT 1
              FROM public.team_staff ts
              JOIN public.teams t ON t.id = ts.team_id
              WHERE ts.user_id = u.id
                AND t.care_home_id = public.current_active_care_home_id()
            )
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_user_record(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    auth.uid() = target_user_id
    OR public.is_saas_admin()
    OR (
      public.current_user_role() IN ('owner', 'manager')
      AND public.can_access_user_record(target_user_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_wound_folder(target_wound_folder_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.wound_folders wf
    WHERE wf.id = target_wound_folder_id
      AND public.can_access_resident(wf.resident_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_careo_public_object(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
  folder_one TEXT := COALESCE((storage.foldername(object_name))[1], '');
  folder_two TEXT := COALESCE((storage.foldername(object_name))[2], '');
  file_name TEXT := COALESCE(storage.filename(object_name), '');
  target_user_id UUID;
  target_org_id UUID;
  target_care_home_id UUID;
  target_resident_id UUID;
BEGIN
  IF folder_one IN ('avatars', 'profile-images') THEN
    target_user_id := public.leading_uuid(file_name);
    RETURN target_user_id IS NOT NULL AND public.can_access_user_record(target_user_id);
  END IF;

  IF folder_one IN ('organization-logos', 'org-logos') THEN
    target_org_id := public.leading_uuid(file_name);
    RETURN target_org_id IS NOT NULL
      AND (
        public.is_saas_admin()
        OR target_org_id = public.current_active_organization_id()
      );
  END IF;

  IF folder_one = 'care-home-logos' THEN
    target_care_home_id := public.leading_uuid(file_name);
    RETURN target_care_home_id IS NOT NULL
      AND public.can_access_care_home(target_care_home_id);
  END IF;

  IF folder_one = 'residents' THEN
    target_resident_id := public.leading_uuid(folder_two);
    RETURN target_resident_id IS NOT NULL
      AND public.can_access_resident(target_resident_id);
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_careo_public_object(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
  folder_one TEXT := COALESCE((storage.foldername(object_name))[1], '');
  folder_two TEXT := COALESCE((storage.foldername(object_name))[2], '');
  file_name TEXT := COALESCE(storage.filename(object_name), '');
  target_user_id UUID;
  target_org_id UUID;
  target_care_home_id UUID;
  target_resident_id UUID;
BEGIN
  IF folder_one IN ('avatars', 'profile-images') THEN
    target_user_id := public.leading_uuid(file_name);
    RETURN target_user_id IS NOT NULL AND public.can_manage_user_record(target_user_id);
  END IF;

  IF folder_one IN ('organization-logos', 'org-logos') THEN
    target_org_id := public.leading_uuid(file_name);
    RETURN target_org_id IS NOT NULL
      AND (
        public.is_saas_admin()
        OR (
          public.current_user_role() IN ('owner', 'manager')
          AND target_org_id = public.current_active_organization_id()
        )
      );
  END IF;

  IF folder_one = 'care-home-logos' THEN
    target_care_home_id := public.leading_uuid(file_name);
    RETURN target_care_home_id IS NOT NULL
      AND (
        public.is_saas_admin()
        OR (
          public.current_user_role() IN ('owner', 'manager')
          AND public.can_access_care_home(target_care_home_id)
        )
      );
  END IF;

  IF folder_one = 'residents' THEN
    target_resident_id := public.leading_uuid(folder_two);
    RETURN target_resident_id IS NOT NULL
      AND public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
      AND public.can_access_resident(target_resident_id);
  END IF;

  RETURN FALSE;
END;
$$;

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
    AND public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_resident(target_resident_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_wound_photo_object(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
  target_wound_folder_id UUID := public.leading_uuid(COALESCE((storage.foldername(object_name))[2], ''));
BEGIN
  RETURN target_wound_folder_id IS NOT NULL
    AND public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_wound_folder(target_wound_folder_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.build_storage_proxy_url(bucket_name TEXT, object_path TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN object_path IS NULL OR btrim(object_path) = '' THEN NULL
    ELSE '/api/storage/object?bucket=' || bucket_name || '&path=' || replace(object_path, ' ', '%20')
  END;
$$;

CREATE OR REPLACE FUNCTION public.extract_storage_object_path(stored_value TEXT, bucket_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  path_match TEXT;
  bucket_match TEXT;
  public_prefix TEXT := '/storage/v1/object/public/' || bucket_name || '/';
BEGIN
  IF stored_value IS NULL OR btrim(stored_value) = '' THEN
    RETURN NULL;
  END IF;

  IF stored_value LIKE '/api/storage/object?%' THEN
    bucket_match := substring(stored_value FROM 'bucket=([^&]+)');
    path_match := substring(stored_value FROM '[?&]path=([^&]+)');

    IF bucket_match = bucket_name THEN
      RETURN replace(path_match, '%20', ' ');
    END IF;

    RETURN NULL;
  END IF;

  IF position(public_prefix IN stored_value) > 0 THEN
    RETURN split_part(stored_value, public_prefix, 2);
  END IF;

  IF stored_value LIKE bucket_name || '/%' THEN
    RETURN split_part(stored_value, bucket_name || '/', 2);
  END IF;

  IF stored_value LIKE 'http%' THEN
    RETURN NULL;
  END IF;

  RETURN stored_value;
END;
$$;

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
      AND invitation_role IN ('manager', 'nurse', 'care_assistant');
  END IF;

  IF public.current_user_role() = 'manager' THEN
    RETURN target_organization_id = public.current_active_organization_id()
      AND target_care_home_id = public.current_active_care_home_id()
      AND invitation_role IN ('nurse', 'care_assistant');
  END IF;

  RETURN FALSE;
END;
$$;

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

CREATE OR REPLACE FUNCTION public.accept_invitation(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.invitations
  SET
    status = 'accepted',
    updated_at = NOW()
  WHERE token = p_token
    AND LOWER(email) = public.current_user_email()
    AND status = 'pending'
    AND expires_at > NOW();

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RETURN updated_count > 0;
END;
$$;

-- --------------------------------------------
-- Invitations
-- --------------------------------------------

DROP POLICY IF EXISTS "Allow viewing invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users view invitations" ON public.invitations;
DROP POLICY IF EXISTS "SaaS admins and owners can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "SaaS admins and owners can update invitations" ON public.invitations;
DROP POLICY IF EXISTS "SaaS admins and owners can delete invitations" ON public.invitations;
DROP POLICY IF EXISTS "SaaS admins manage all invitations" ON public.invitations;
DROP POLICY IF EXISTS "Owners can manage invitations for their organization" ON public.invitations;
DROP POLICY IF EXISTS "Owners and Managers manage invitations" ON public.invitations;

CREATE POLICY "SaaS admins manage all invitations"
  ON public.invitations FOR ALL
  TO authenticated
  USING (public.is_saas_admin())
  WITH CHECK (public.is_saas_admin());

CREATE POLICY "Owners and managers can view invitations in scope"
  ON public.invitations FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'saas_admin')
    AND public.can_access_care_context(organization_id, care_home_id, NULL)
  );

CREATE POLICY "Owners and managers can create invitations in scope"
  ON public.invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_manage_invitation(organization_id, care_home_id, role)
  );

CREATE POLICY "Owners and managers can update invitations in scope"
  ON public.invitations FOR UPDATE
  TO authenticated
  USING (
    public.can_manage_invitation(organization_id, care_home_id, role)
  )
  WITH CHECK (
    public.can_manage_invitation(organization_id, care_home_id, role)
  );

CREATE POLICY "Owners and managers can delete invitations in scope"
  ON public.invitations FOR DELETE
  TO authenticated
  USING (
    public.can_manage_invitation(organization_id, care_home_id, role)
  );

-- --------------------------------------------
-- Private storage buckets and URL normalization
-- --------------------------------------------

UPDATE storage.buckets
SET public = false
WHERE id IN ('careo-public', 'resident-files', 'wound-photos');

DROP POLICY IF EXISTS "Public access to careo-public" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to careo-public" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their own uploads in careo-public" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from careo-public" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to resident-files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view resident-files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update resident-files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete from resident-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view resident-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to resident-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update resident-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from resident-files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload wound photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view wound photos in their organization" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their wound photos" ON storage.objects;
DROP POLICY IF EXISTS "Managers can delete wound photos" ON storage.objects;

CREATE POLICY "Authenticated users can view careo-public objects"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'careo-public'
    AND public.can_access_careo_public_object(name)
  );

CREATE POLICY "Authenticated users can manage careo-public objects"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'careo-public'
    AND public.can_manage_careo_public_object(name)
  );

CREATE POLICY "Authenticated users can update careo-public objects"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'careo-public'
    AND public.can_manage_careo_public_object(name)
  )
  WITH CHECK (
    bucket_id = 'careo-public'
    AND public.can_manage_careo_public_object(name)
  );

CREATE POLICY "Authenticated users can delete careo-public objects"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'careo-public'
    AND public.can_manage_careo_public_object(name)
  );

CREATE POLICY "Authenticated users can view resident files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'resident-files'
    AND public.can_access_resident_file_object(name)
  );

CREATE POLICY "Authenticated users can manage resident files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'resident-files'
    AND public.can_access_resident_file_object(name)
  );

CREATE POLICY "Authenticated users can update resident files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'resident-files'
    AND public.can_access_resident_file_object(name)
  )
  WITH CHECK (
    bucket_id = 'resident-files'
    AND public.can_access_resident_file_object(name)
  );

CREATE POLICY "Authenticated users can delete resident files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'resident-files'
    AND public.can_access_resident_file_object(name)
  );

CREATE POLICY "Authenticated users can view wound photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'wound-photos'
    AND public.can_manage_wound_photo_object(name)
  );

CREATE POLICY "Authenticated users can manage wound photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'wound-photos'
    AND public.can_manage_wound_photo_object(name)
  );

CREATE POLICY "Authenticated users can update wound photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'wound-photos'
    AND public.can_manage_wound_photo_object(name)
  )
  WITH CHECK (
    bucket_id = 'wound-photos'
    AND public.can_manage_wound_photo_object(name)
  );

CREATE POLICY "Authenticated users can delete wound photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'wound-photos'
    AND public.can_manage_wound_photo_object(name)
  );

UPDATE public.users
SET image_url = public.build_storage_proxy_url(
  'careo-public',
  public.extract_storage_object_path(image_url, 'careo-public')
)
WHERE public.extract_storage_object_path(image_url, 'careo-public') IS NOT NULL;

UPDATE public.residents
SET image_url = public.build_storage_proxy_url(
  'careo-public',
  public.extract_storage_object_path(image_url, 'careo-public')
)
WHERE public.extract_storage_object_path(image_url, 'careo-public') IS NOT NULL;

UPDATE public.organizations
SET logo_url = public.build_storage_proxy_url(
  'careo-public',
  public.extract_storage_object_path(logo_url, 'careo-public')
)
WHERE public.extract_storage_object_path(logo_url, 'careo-public') IS NOT NULL;

UPDATE public.files
SET public_url = public.build_storage_proxy_url('resident-files', storage_path)
WHERE storage_path IS NOT NULL
  AND btrim(storage_path) <> '';

UPDATE public.wound_photograph_evaluations
SET photograph_url = public.build_storage_proxy_url(
  'wound-photos',
  public.extract_storage_object_path(photograph_url, 'wound-photos')
)
WHERE public.extract_storage_object_path(photograph_url, 'wound-photos') IS NOT NULL;

-- --------------------------------------------
-- Privilege reduction
-- --------------------------------------------

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- --------------------------------------------
-- Care-home scoped table policies
-- --------------------------------------------

DROP POLICY IF EXISTS "Users can view residents in their organization" ON public.residents;
DROP POLICY IF EXISTS "Staff can manage residents" ON public.residents;

CREATE POLICY "Users can view residents in scope"
  ON public.residents FOR SELECT
  TO authenticated
  USING (public.can_access_resident(id));

CREATE POLICY "Staff can manage residents in scope"
  ON public.residents FOR ALL
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_care_home(care_home_id)
  )
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_care_home(care_home_id)
  );

DROP POLICY IF EXISTS "Users can view emergency contacts in their organization" ON public.emergency_contacts;
DROP POLICY IF EXISTS "Staff can manage emergency contacts" ON public.emergency_contacts;

CREATE POLICY "Users can view emergency contacts in scope"
  ON public.emergency_contacts FOR SELECT
  TO authenticated
  USING (public.can_access_resident(resident_id));

CREATE POLICY "Staff can manage emergency contacts in scope"
  ON public.emergency_contacts FOR ALL
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_resident(resident_id)
  )
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_resident(resident_id)
  );

DROP POLICY IF EXISTS "Users can view folders in their organization" ON public.folders;
DROP POLICY IF EXISTS "Authorized roles can create folders" ON public.folders;
DROP POLICY IF EXISTS "Authorized roles can update folders" ON public.folders;
DROP POLICY IF EXISTS "Authorized roles can delete folders" ON public.folders;

CREATE POLICY "Users can view folders in scope"
  ON public.folders FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_care_context(organization_id, care_home_id, resident_id)
  );

CREATE POLICY "Authorized roles can manage folders in scope"
  ON public.folders FOR ALL
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_care_context(organization_id, care_home_id, resident_id)
  )
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_care_context(organization_id, care_home_id, resident_id)
  );

DROP POLICY IF EXISTS "Users can view files in their organization" ON public.files;
DROP POLICY IF EXISTS "Authorized roles can create files" ON public.files;
DROP POLICY IF EXISTS "Authorized roles can update files" ON public.files;
DROP POLICY IF EXISTS "Authorized roles can delete files" ON public.files;

CREATE POLICY "Users can view files in scope"
  ON public.files FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_care_context(organization_id, care_home_id, resident_id)
  );

CREATE POLICY "Authorized roles can manage files in scope"
  ON public.files FOR ALL
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_care_context(organization_id, care_home_id, resident_id)
  )
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_care_context(organization_id, care_home_id, resident_id)
  );

DROP POLICY IF EXISTS "Users within organization can view incidents" ON public.incidents;
DROP POLICY IF EXISTS "Nurse/Manager/Owner can insert incidents" ON public.incidents;
DROP POLICY IF EXISTS "Nurse/Manager/Owner can update incidents" ON public.incidents;
DROP POLICY IF EXISTS "Manager/Owner can delete incidents" ON public.incidents;

CREATE POLICY "Users within care home can view incidents"
  ON public.incidents FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_resident(resident_id)
  );

CREATE POLICY "Authorized staff can manage incidents in scope"
  ON public.incidents FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_resident(resident_id)
  );

CREATE POLICY "Authorized staff can update incidents in scope"
  ON public.incidents FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_resident(resident_id)
  )
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_resident(resident_id)
  );

CREATE POLICY "Managers can delete incidents in scope"
  ON public.incidents FOR DELETE
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'saas_admin')
    AND public.can_access_resident(resident_id)
  );

DROP POLICY IF EXISTS "Users within organization can view trust reports" ON public.trust_incident_reports;
DROP POLICY IF EXISTS "Nurse/Manager/Owner can manage trust reports" ON public.trust_incident_reports;

CREATE POLICY "Users within care home can view trust reports"
  ON public.trust_incident_reports FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND EXISTS (
      SELECT 1
      FROM public.incidents i
      WHERE i.id = incident_id
        AND public.can_access_resident(i.resident_id)
    )
  );

CREATE POLICY "Authorized staff can manage trust reports in scope"
  ON public.trust_incident_reports FOR ALL
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND EXISTS (
      SELECT 1
      FROM public.incidents i
      WHERE i.id = incident_id
        AND public.can_access_resident(i.resident_id)
    )
  )
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND EXISTS (
      SELECT 1
      FROM public.incidents i
      WHERE i.id = incident_id
        AND public.can_access_resident(i.resident_id)
    )
  );

DROP POLICY IF EXISTS "Users can view incident folders for accessible residents" ON public.incident_folders;
DROP POLICY IF EXISTS "Staff can manage incident folders" ON public.incident_folders;

CREATE POLICY "Users can view incident folders in scope"
  ON public.incident_folders FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_resident(resident_id)
  );

CREATE POLICY "Staff can manage incident folders in scope"
  ON public.incident_folders FOR ALL
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_resident(resident_id)
  )
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_resident(resident_id)
  );

DROP POLICY IF EXISTS "Medication intakes isolation" ON public.medication_intakes;

CREATE POLICY "Medication intakes in scope"
  ON public.medication_intakes FOR ALL
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_care_home(care_home_id)
  )
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_care_home(care_home_id)
  );

DROP POLICY IF EXISTS "Users can view eMAR sheets in their organization" ON public.emar_sheets;
DROP POLICY IF EXISTS "Users can create eMAR sheets in their organization" ON public.emar_sheets;
DROP POLICY IF EXISTS "Users can update eMAR sheets in their organization" ON public.emar_sheets;

CREATE POLICY "Users can view eMAR sheets in scope"
  ON public.emar_sheets FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_care_home(care_home_id)
  );

CREATE POLICY "Users can create eMAR sheets in scope"
  ON public.emar_sheets FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_care_home(care_home_id)
  );

CREATE POLICY "Users can update eMAR sheets in scope"
  ON public.emar_sheets FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_care_home(care_home_id)
  )
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_care_home(care_home_id)
  );

DROP POLICY IF EXISTS "Users can view eMAR administrations in their organization" ON public.emar_administrations;
DROP POLICY IF EXISTS "Users can create eMAR administrations in their organization" ON public.emar_administrations;
DROP POLICY IF EXISTS "Users can update eMAR administrations in their organization" ON public.emar_administrations;

CREATE POLICY "Users can view eMAR administrations in scope"
  ON public.emar_administrations FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_care_home(care_home_id)
  );

CREATE POLICY "Users can create eMAR administrations in scope"
  ON public.emar_administrations FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_care_home(care_home_id)
  );

CREATE POLICY "Users can update eMAR administrations in scope"
  ON public.emar_administrations FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_care_home(care_home_id)
  )
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_care_home(care_home_id)
  );

DROP POLICY IF EXISTS "Owner, Manager, and Nurse can view progress notes" ON public.progress_notes;
DROP POLICY IF EXISTS "Owner, Manager, and Nurse can insert progress notes" ON public.progress_notes;
DROP POLICY IF EXISTS "Owner, Manager, and Nurse can update progress notes" ON public.progress_notes;
DROP POLICY IF EXISTS "Owner, Manager, and Nurse can delete progress notes" ON public.progress_notes;

CREATE POLICY "Owner, Manager, and Nurse can view progress notes in scope"
  ON public.progress_notes FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_resident(resident_id)
  );

CREATE POLICY "Owner, Manager, and Nurse can insert progress notes in scope"
  ON public.progress_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_resident(resident_id)
  );

CREATE POLICY "Owner, Manager, and Nurse can update progress notes in scope"
  ON public.progress_notes FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_resident(resident_id)
  )
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_resident(resident_id)
  );

CREATE POLICY "Owner, Manager, and Nurse can delete progress notes in scope"
  ON public.progress_notes FOR DELETE
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_resident(resident_id)
  );

DROP POLICY IF EXISTS "Users within organization can view wound folders" ON public.wound_folders;
DROP POLICY IF EXISTS "Nurse/Manager/Owner can insert wound folders" ON public.wound_folders;
DROP POLICY IF EXISTS "Nurse/Manager/Owner can update wound folders" ON public.wound_folders;
DROP POLICY IF EXISTS "Manager/Owner can delete wound folders" ON public.wound_folders;

CREATE POLICY "Users within care home can view wound folders"
  ON public.wound_folders FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_resident(resident_id)
  );

CREATE POLICY "Nurse/Manager/Owner can manage wound folders in scope"
  ON public.wound_folders FOR ALL
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_resident(resident_id)
  )
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_resident(resident_id)
  );

DROP POLICY IF EXISTS "Users within organization can view wound assessments" ON public.wound_assessments;
DROP POLICY IF EXISTS "Care staff can insert wound assessments" ON public.wound_assessments;
DROP POLICY IF EXISTS "Staff can update wound assessments" ON public.wound_assessments;
DROP POLICY IF EXISTS "Managers can delete wound assessments" ON public.wound_assessments;

CREATE POLICY "Users within care home can view wound assessments"
  ON public.wound_assessments FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'care_assistant', 'saas_admin')
    AND public.can_access_resident(resident_id)
  );

CREATE POLICY "Care staff can insert wound assessments in scope"
  ON public.wound_assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'care_assistant', 'saas_admin')
    AND public.can_access_resident(resident_id)
  );

CREATE POLICY "Staff can update wound assessments in scope"
  ON public.wound_assessments FOR UPDATE
  TO authenticated
  USING (
    public.can_access_resident(resident_id)
    AND (
      recorded_by = auth.uid()
      OR public.current_user_role() IN ('manager', 'owner', 'saas_admin')
    )
  )
  WITH CHECK (
    public.can_access_resident(resident_id)
    AND (
      recorded_by = auth.uid()
      OR public.current_user_role() IN ('manager', 'owner', 'saas_admin')
    )
  );

CREATE POLICY "Managers can delete wound assessments in scope"
  ON public.wound_assessments FOR DELETE
  TO authenticated
  USING (
    public.current_user_role() IN ('manager', 'owner', 'saas_admin')
    AND public.can_access_resident(resident_id)
  );

DROP POLICY IF EXISTS "Users within organization can view wound photograph evaluations" ON public.wound_photograph_evaluations;
DROP POLICY IF EXISTS "Nurse/Manager/Owner can insert wound photograph evaluations" ON public.wound_photograph_evaluations;
DROP POLICY IF EXISTS "Nurse/Manager/Owner can update wound photograph evaluations" ON public.wound_photograph_evaluations;
DROP POLICY IF EXISTS "Manager/Owner can delete wound photograph evaluations" ON public.wound_photograph_evaluations;

CREATE POLICY "Users within care home can view wound photograph evaluations"
  ON public.wound_photograph_evaluations FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_resident(resident_id)
  );

CREATE POLICY "Nurse/Manager/Owner can insert wound photograph evaluations in scope"
  ON public.wound_photograph_evaluations FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_resident(resident_id)
  );

CREATE POLICY "Nurse/Manager/Owner can update wound photograph evaluations in scope"
  ON public.wound_photograph_evaluations FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_resident(resident_id)
  )
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_resident(resident_id)
  );

CREATE POLICY "Manager/Owner can delete wound photograph evaluations in scope"
  ON public.wound_photograph_evaluations FOR DELETE
  TO authenticated
  USING (
    public.current_user_role() IN ('manager', 'owner', 'saas_admin')
    AND public.can_access_resident(resident_id)
  );

DO $$
DECLARE
  target_table TEXT;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'pre_admission_care_files',
    'infection_prevention_assessments',
    'bladder_bowel_assessments',
    'moving_handling_assessments',
    'bedrail_consents',
    'bedrails_risk_assessments',
    'long_term_falls_risk_assessments',
    'admission_assessments',
    'photography_consents',
    'dnacprs',
    'peeps',
    'dependency_assessments',
    'timl_assessments',
    'skin_integrity_assessments',
    'resident_valuables_assessments',
    'handling_profiles',
    'pain_assessments',
    'nutritional_assessments',
    'oral_assessments',
    'diet_notifications',
    'choking_risk_assessments',
    'cornell_depression_scales',
    'best_interest_decisions',
    'care_plan_assessments'
  ] LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables t
      WHERE t.table_schema = 'public'
        AND t.table_name = target_table
    ) THEN
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.%I',
        'SaaS admins manage ' || target_table,
        target_table
      );

      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.%I',
        'Users can view ' || target_table || ' in their organization',
        target_table
      );

      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.%I',
        'Staff can manage ' || target_table,
        target_table
      );

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_saas_admin()) WITH CHECK (public.is_saas_admin())',
        'SaaS admins manage ' || target_table,
        target_table
      );

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.current_user_role() IN (''owner'', ''manager'', ''nurse'', ''saas_admin'') AND public.can_access_resident(resident_id))',
        'Users can view ' || target_table || ' in their organization',
        target_table
      );

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.current_user_role() IN (''owner'', ''manager'', ''nurse'', ''saas_admin'') AND public.can_access_resident(resident_id)) WITH CHECK (public.current_user_role() IN (''owner'', ''manager'', ''nurse'', ''saas_admin'') AND public.can_access_resident(resident_id))',
        'Staff can manage ' || target_table,
        target_table
      );
    END IF;
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "Users can view care plan evaluations in their organization" ON public.care_plan_evaluations;
DROP POLICY IF EXISTS "Nurses, managers, and owners can create care plan evaluations" ON public.care_plan_evaluations;

CREATE POLICY "Users can view care plan evaluations in scope"
  ON public.care_plan_evaluations FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_resident(resident_id)
  );

CREATE POLICY "Nurses, managers, and owners can manage care plan evaluations in scope"
  ON public.care_plan_evaluations FOR ALL
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_resident(resident_id)
  )
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_resident(resident_id)
  );

DROP POLICY IF EXISTS "Users can view care plan reminders in their organization" ON public.care_plan_reminders;
DROP POLICY IF EXISTS "Nurses, managers, and owners can create care plan reminders" ON public.care_plan_reminders;

CREATE POLICY "Users can view care plan reminders in scope"
  ON public.care_plan_reminders FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_resident(resident_id)
  );

CREATE POLICY "Nurses, managers, and owners can manage care plan reminders in scope"
  ON public.care_plan_reminders FOR ALL
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_resident(resident_id)
  )
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_resident(resident_id)
  );
