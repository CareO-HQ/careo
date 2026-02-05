-- ============================================
-- RESIDENTS TABLE RLS POLICIES
-- Allow owner, manager, and nurse to create residents
-- ============================================

-- First, ensure RLS is enabled
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view residents in their organization" ON public.residents;
DROP POLICY IF EXISTS "Staff can manage residents" ON public.residents;
DROP POLICY IF EXISTS "SaaS admins manage all residents" ON public.residents;

-- 1. SaaS Admin can manage all residents
CREATE POLICY "SaaS admins manage all residents"
  ON public.residents FOR ALL
  TO authenticated
  USING ( public.is_saas_admin() )
  WITH CHECK ( public.is_saas_admin() );

-- 2. Users can view residents in their organization
CREATE POLICY "Users can view residents in their organization"
  ON public.residents FOR SELECT
  TO authenticated
  USING ( public.can_access_organization(organization_id) );

-- 3. Owner, Manager, and Nurse can create, update, delete residents in their organization
CREATE POLICY "Staff can manage residents"
  ON public.residents FOR ALL
  TO authenticated
  USING ( 
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')
  )
  WITH CHECK ( 
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')
  );

-- ============================================
-- EMERGENCY CONTACTS TABLE RLS POLICIES
-- ============================================

-- Ensure RLS is enabled
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view emergency contacts in their organization" ON public.emergency_contacts;
DROP POLICY IF EXISTS "Staff can manage emergency contacts" ON public.emergency_contacts;
DROP POLICY IF EXISTS "SaaS admins manage all emergency contacts" ON public.emergency_contacts;

-- 1. SaaS Admin can manage all emergency contacts
CREATE POLICY "SaaS admins manage all emergency contacts"
  ON public.emergency_contacts FOR ALL
  TO authenticated
  USING ( public.is_saas_admin() )
  WITH CHECK ( public.is_saas_admin() );

-- 2. Users can view emergency contacts in their organization
CREATE POLICY "Users can view emergency contacts in their organization"
  ON public.emergency_contacts FOR SELECT
  TO authenticated
  USING ( public.can_access_organization(organization_id) );

-- 3. Owner, Manager, and Nurse can manage emergency contacts
CREATE POLICY "Staff can manage emergency contacts"
  ON public.emergency_contacts FOR ALL
  TO authenticated
  USING ( 
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')
  )
  WITH CHECK ( 
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')
  );
