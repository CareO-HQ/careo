-- Allow rqia role to view medications, emar_sheets, emar_administrations, medication_intakes, and medication_refusals in scope
-- Migration: 20260722170000_allow_rqia_medications_and_emar_rls.sql

-- 1. public.medications
DROP POLICY IF EXISTS "Medication in scope for clinical/admin roles" ON public.medications;
DROP POLICY IF EXISTS "Medications viewable by authorized roles" ON public.medications;

CREATE POLICY "Medications viewable by authorized roles"
  ON public.medications FOR ALL
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin', 'mdt', 'rqia')
    AND public.can_access_organization(organization_id)
  )
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_organization(organization_id)
  );

-- 2. public.emar_sheets
DROP POLICY IF EXISTS "Users can view eMAR sheets in scope" ON public.emar_sheets;

CREATE POLICY "Users can view eMAR sheets in scope"
  ON public.emar_sheets FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin', 'mdt', 'rqia')
    AND public.can_access_care_home(care_home_id)
  );

-- 3. public.emar_administrations
DROP POLICY IF EXISTS "Users can view eMAR administrations in scope" ON public.emar_administrations;

CREATE POLICY "Users can view eMAR administrations in scope"
  ON public.emar_administrations FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin', 'mdt', 'rqia')
    AND public.can_access_care_home(care_home_id)
  );

-- 4. public.medication_intakes
DROP POLICY IF EXISTS "Medication intakes viewable by authorized roles" ON public.medication_intakes;

CREATE POLICY "Medication intakes viewable by authorized roles"
  ON public.medication_intakes FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin', 'mdt', 'rqia')
    AND public.can_access_care_home(care_home_id)
  );

-- 5. public.medication_refusals
DROP POLICY IF EXISTS "Users can view medication refusals for their organization" ON public.medication_refusals;
DROP POLICY IF EXISTS "Medication refusals viewable by authorized roles" ON public.medication_refusals;

CREATE POLICY "Medication refusals viewable by authorized roles"
  ON public.medication_refusals FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin', 'mdt', 'rqia')
    AND public.can_access_resident(resident_id)
  );
