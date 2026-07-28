-- Allow rqia and mdt roles to view incidents and wounds data in scope
-- Migration: 20260727160000_allow_rqia_and_mdt_incidents_and_wounds_rls.sql

-- 1. public.incidents
DROP POLICY IF EXISTS "Users within care home can view incidents" ON public.incidents;
DROP POLICY IF EXISTS "Users within organization can view incidents" ON public.incidents;
DROP POLICY IF EXISTS "Authorized roles can view incidents in scope" ON public.incidents;

CREATE POLICY "Authorized roles can view incidents in scope"
  ON public.incidents FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin', 'care_assistant', 'agency_nurse', 'agency_care_assistant', 'mdt', 'rqia')
    AND public.can_access_resident(resident_id)
  );

-- 2. public.incident_folders
DROP POLICY IF EXISTS "Users can view incident folders in scope" ON public.incident_folders;
DROP POLICY IF EXISTS "Users can view incident folders for accessible residents" ON public.incident_folders;
DROP POLICY IF EXISTS "Authorized roles can view incident folders in scope" ON public.incident_folders;

CREATE POLICY "Authorized roles can view incident folders in scope"
  ON public.incident_folders FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin', 'care_assistant', 'agency_nurse', 'agency_care_assistant', 'mdt', 'rqia')
    AND public.can_access_resident(resident_id)
  );

-- 3. public.wounds
DROP POLICY IF EXISTS "Users within organization can view wounds" ON public.wounds;
DROP POLICY IF EXISTS "Authorized roles can view wounds in scope" ON public.wounds;

CREATE POLICY "Authorized roles can view wounds in scope"
  ON public.wounds FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin', 'care_assistant', 'agency_nurse', 'agency_care_assistant', 'mdt', 'rqia')
    AND (
      (resident_id IS NOT NULL AND public.can_access_resident(resident_id))
      OR (organization_id IS NOT NULL AND public.can_access_organization(organization_id))
    )
  );

-- 4. public.wound_folders
DROP POLICY IF EXISTS "Users within care home can view wound folders" ON public.wound_folders;
DROP POLICY IF EXISTS "Authorized roles can view wound folders in scope" ON public.wound_folders;

CREATE POLICY "Authorized roles can view wound folders in scope"
  ON public.wound_folders FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin', 'care_assistant', 'agency_nurse', 'agency_care_assistant', 'mdt', 'rqia')
    AND public.can_access_resident(resident_id)
  );

-- 5. public.wound_assessments
DROP POLICY IF EXISTS "Users within organization can view wound_assessments" ON public.wound_assessments;
DROP POLICY IF EXISTS "Authorized roles can view wound assessments in scope" ON public.wound_assessments;

CREATE POLICY "Authorized roles can view wound assessments in scope"
  ON public.wound_assessments FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin', 'care_assistant', 'agency_nurse', 'agency_care_assistant', 'mdt', 'rqia')
    AND (
      (resident_id IS NOT NULL AND public.can_access_resident(resident_id))
      OR (organization_id IS NOT NULL AND public.can_access_organization(organization_id))
    )
  );

-- 6. public.initial_wound_assessments
DROP POLICY IF EXISTS "Users can view initial_wound_assessments in their organization" ON public.initial_wound_assessments;
DROP POLICY IF EXISTS "Authorized roles can view initial wound assessments in scope" ON public.initial_wound_assessments;

CREATE POLICY "Authorized roles can view initial wound assessments in scope"
  ON public.initial_wound_assessments FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin', 'care_assistant', 'agency_nurse', 'agency_care_assistant', 'mdt', 'rqia')
    AND public.can_access_resident(resident_id)
  );

-- 7. public.wound_gallery_photos
DROP POLICY IF EXISTS "Users in scope can view wound gallery photos" ON public.wound_gallery_photos;
DROP POLICY IF EXISTS "Authorized roles can view wound gallery photos in scope" ON public.wound_gallery_photos;

CREATE POLICY "Authorized roles can view wound gallery photos in scope"
  ON public.wound_gallery_photos FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin', 'care_assistant', 'agency_nurse', 'agency_care_assistant', 'mdt', 'rqia')
    AND public.can_access_resident(resident_id)
  );
