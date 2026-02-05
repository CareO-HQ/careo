-- ============================================
-- Fix Daily Care RLS Policies
-- ============================================
-- This migration fixes RLS policies for quick_care_notes to ensure
-- care assistants cannot create, update, or delete quick care notes.
-- Only owners, managers, nurses, and saas_admins can manage quick care notes.

-- Drop existing policy
DROP POLICY IF EXISTS "Quick care notes isolation" ON public.quick_care_notes;

-- SELECT: All authenticated users in organization can view
CREATE POLICY "Users can view quick care notes in their organization"
  ON public.quick_care_notes FOR SELECT
  USING (public.can_access_organization(organization_id));

-- INSERT: Only owners, managers, nurses, and saas_admins can create
CREATE POLICY "Owners, managers, and nurses can create quick care notes"
  ON public.quick_care_notes FOR INSERT
  WITH CHECK (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'saas_admin')
  );

-- UPDATE: Only owners, managers, nurses, and saas_admins can update
CREATE POLICY "Owners, managers, and nurses can update quick care notes"
  ON public.quick_care_notes FOR UPDATE
  USING (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'saas_admin')
  )
  WITH CHECK (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'saas_admin')
  );

-- DELETE: Only owners, managers, nurses, and saas_admins can delete
CREATE POLICY "Owners, managers, and nurses can delete quick care notes"
  ON public.quick_care_notes FOR DELETE
  USING (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'saas_admin')
  );
