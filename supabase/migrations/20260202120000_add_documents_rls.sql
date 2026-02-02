-- ============================================
-- RLS POLICIES FOR DOCUMENTS TAB
-- Folders and Files tables
-- Blocks care_assistant role, allows owner/manager/nurse
-- ============================================

-- Enable RLS on folders table
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "SaaS admins manage folders" ON public.folders;
DROP POLICY IF EXISTS "Users can view folders in their organization" ON public.folders;
DROP POLICY IF EXISTS "Authorized roles can create folders" ON public.folders;
DROP POLICY IF EXISTS "Authorized roles can update folders" ON public.folders;
DROP POLICY IF EXISTS "Authorized roles can delete folders" ON public.folders;

-- SaaS admins have full access
CREATE POLICY "SaaS admins manage folders"
  ON public.folders FOR ALL
  TO authenticated
  USING (public.is_saas_admin())
  WITH CHECK (public.is_saas_admin());

-- Allow owner, manager, nurse to view folders in their organization
CREATE POLICY "Users can view folders in their organization"
  ON public.folders FOR SELECT
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'saas_admin')
  );

-- Allow owner, manager, nurse to create folders (care_assistant blocked)
CREATE POLICY "Authorized roles can create folders"
  ON public.folders FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'saas_admin')
  );

-- Allow owner, manager, nurse to update folders
CREATE POLICY "Authorized roles can update folders"
  ON public.folders FOR UPDATE
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'saas_admin')
  )
  WITH CHECK (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'saas_admin')
  );

-- Allow owner, manager, nurse to delete folders
CREATE POLICY "Authorized roles can delete folders"
  ON public.folders FOR DELETE
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'saas_admin')
  );

-- ============================================
-- RLS POLICIES FOR FILES TABLE
-- ============================================

-- Enable RLS on files table
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "SaaS admins manage files" ON public.files;
DROP POLICY IF EXISTS "Users can view files in their organization" ON public.files;
DROP POLICY IF EXISTS "Authorized roles can create files" ON public.files;
DROP POLICY IF EXISTS "Authorized roles can update files" ON public.files;
DROP POLICY IF EXISTS "Authorized roles can delete files" ON public.files;

-- SaaS admins have full access
CREATE POLICY "SaaS admins manage files"
  ON public.files FOR ALL
  TO authenticated
  USING (public.is_saas_admin())
  WITH CHECK (public.is_saas_admin());

-- Allow owner, manager, nurse to view files in their organization
CREATE POLICY "Users can view files in their organization"
  ON public.files FOR SELECT
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'saas_admin')
  );

-- Allow owner, manager, nurse to create files (care_assistant blocked)
CREATE POLICY "Authorized roles can create files"
  ON public.files FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'saas_admin')
  );

-- Allow owner, manager, nurse to update files
CREATE POLICY "Authorized roles can update files"
  ON public.files FOR UPDATE
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'saas_admin')
  )
  WITH CHECK (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'saas_admin')
  );

-- Allow owner, manager, nurse to delete files
CREATE POLICY "Authorized roles can delete files"
  ON public.files FOR DELETE
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'saas_admin')
  );
