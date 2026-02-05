-- Enable RLS on menu_items
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- DROP existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view menu items in their organization" ON public.menu_items;
DROP POLICY IF EXISTS "Authorized roles can manage menu items" ON public.menu_items;

-- SELECT policy: Any authenticated user in the organization can view menu items
CREATE POLICY "Users can view menu items in their organization"
  ON public.menu_items FOR SELECT
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
  );

-- INSERT/UPDATE/DELETE policy: Only owner, manager, nurse, and admin can manage menu items
CREATE POLICY "Authorized roles can manage menu items"
  ON public.menu_items FOR ALL
  TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND (
      public.is_saas_admin()
      OR public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'admin')
    )
  )
  WITH CHECK (
    public.can_access_organization(organization_id)
    AND (
      public.is_saas_admin()
      OR public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'admin')
    )
  );
