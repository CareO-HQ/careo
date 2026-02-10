-- Migration to fix users update policy
-- Allows managers and owners to edit staff details in their organization

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
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
      AND active_organization_id = public.get_active_organization_id()
    )
    OR auth.uid() = id
  );

-- Add comment for the policy
COMMENT ON POLICY "Managed staff updates" ON public.users IS 'Allows SaaS admins, owners, and managers to update user records in their organization, and all users to update their own profile.';
