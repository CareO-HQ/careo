-- ============================================
-- Allow managers and owners to update their own organization
-- ============================================

-- Managers and owners can update their own organization (e.g., name, logo_url)
CREATE POLICY "Managers and owners can update their organization"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (
    public.can_access_organization(id)
    AND public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin')
  )
  WITH CHECK (
    public.can_access_organization(id)
    AND public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin')
  );
