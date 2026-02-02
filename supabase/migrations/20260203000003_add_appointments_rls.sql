-- ============================================
-- Add RLS Policies for Appointments and Appointment Notes
-- ============================================
-- This migration adds RLS policies to ensure:
-- 1. Care assistants cannot access appointments (SELECT, INSERT, UPDATE, DELETE)
-- 2. Care assistants cannot access appointment_notes (SELECT, INSERT, UPDATE, DELETE)
-- 3. All other users (owner, manager, nurse, saas_admin) can access appointments and appointment_notes
-- ============================================

-- ============================================
-- APPOINTMENTS TABLE RLS POLICIES
-- ============================================

-- Ensure RLS is enabled
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view appointments in their organization" ON public.appointments;
DROP POLICY IF EXISTS "Owners, managers, and nurses can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Owners, managers, and nurses can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Owners, managers, and nurses can delete appointments" ON public.appointments;

-- SELECT: All authenticated users in organization can view (except care assistants)
CREATE POLICY "Users can view appointments in their organization"
  ON public.appointments FOR SELECT
  USING (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'saas_admin')
  );

-- INSERT: Only owners, managers, nurses, and saas_admins can create
CREATE POLICY "Owners, managers, and nurses can create appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'saas_admin')
  );

-- UPDATE: Only owners, managers, nurses, and saas_admins can update
CREATE POLICY "Owners, managers, and nurses can update appointments"
  ON public.appointments FOR UPDATE
  USING (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'saas_admin')
  )
  WITH CHECK (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'saas_admin')
  );

-- DELETE: Only owners, managers, nurses, and saas_admins can delete
CREATE POLICY "Owners, managers, and nurses can delete appointments"
  ON public.appointments FOR DELETE
  USING (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'saas_admin')
  );

-- ============================================
-- APPOINTMENT_NOTES TABLE RLS POLICIES
-- ============================================

-- Ensure RLS is enabled
ALTER TABLE public.appointment_notes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view appointment notes in their organization" ON public.appointment_notes;
DROP POLICY IF EXISTS "Users can create appointment notes in their organization" ON public.appointment_notes;
DROP POLICY IF EXISTS "Users can update appointment notes in their organization" ON public.appointment_notes;
DROP POLICY IF EXISTS "Users can delete appointment notes in their organization" ON public.appointment_notes;

-- SELECT: All authenticated users in organization can view (except care assistants)
CREATE POLICY "Users can view appointment notes in their organization"
  ON public.appointment_notes FOR SELECT
  USING (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'saas_admin')
  );

-- INSERT: Only owners, managers, nurses, and saas_admins can create
CREATE POLICY "Owners, managers, and nurses can create appointment notes"
  ON public.appointment_notes FOR INSERT
  WITH CHECK (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'saas_admin')
  );

-- UPDATE: Only owners, managers, nurses, and saas_admins can update
CREATE POLICY "Owners, managers, and nurses can update appointment notes"
  ON public.appointment_notes FOR UPDATE
  USING (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'saas_admin')
  )
  WITH CHECK (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'saas_admin')
  );

-- DELETE: Only owners, managers, nurses, and saas_admins can delete
CREATE POLICY "Owners, managers, and nurses can delete appointment notes"
  ON public.appointment_notes FOR DELETE
  USING (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'saas_admin')
  );
