-- Migration to fix the users update policy for staff removal
-- Allows managers and owners to set active_organization_id to null when removing members

DROP POLICY IF EXISTS "Managed staff updates" ON public.users;

CREATE POLICY "Managed staff updates"
  ON public.users FOR UPDATE
  TO authenticated
  USING (
    public.is_saas_admin()
    OR (
      public.get_user_role() IN ('manager', 'owner')
      AND active_organization_id = public.get_active_organization_id()
    )
    OR auth.uid() = id
  )
  WITH CHECK (
    public.is_saas_admin()
    OR (
      public.get_user_role() IN ('manager', 'owner')
      AND (
        active_organization_id = public.get_active_organization_id()
        OR active_organization_id IS NULL
      )
    )
    OR auth.uid() = id
  );

COMMENT ON POLICY "Managed staff updates" ON public.users IS 'Allows SaaS admins, owners, and managers to update user records in their organization (and remove them by setting organization to NULL), and all users to update their own profile.';
