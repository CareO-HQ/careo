-- Allow rqia, mdt, care_assistant, agency_nurse, agency_care_assistant roles to view progress notes in scope
-- Migration: 20260722160000_allow_rqia_progress_notes_rls.sql

DROP POLICY IF EXISTS "Owner, Manager, and Nurse can view progress notes in scope" ON public.progress_notes;
DROP POLICY IF EXISTS "Authorized roles can view progress notes in scope" ON public.progress_notes;

CREATE POLICY "Authorized roles can view progress notes in scope"
  ON public.progress_notes FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin', 'care_assistant', 'agency_nurse', 'agency_care_assistant', 'mdt', 'rqia')
    AND public.can_access_resident(resident_id)
  );
