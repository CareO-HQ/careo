-- Allow rqia, mdt, care_assistant, agency_nurse, agency_care_assistant roles to view trust_incident_reports in scope
-- Migration: 20260728140000_allow_rqia_and_mdt_trust_incident_reports_rls.sql

DROP POLICY IF EXISTS "Users within organization can view trust reports" ON public.trust_incident_reports;
DROP POLICY IF EXISTS "Authorized staff can view trust reports" ON public.trust_incident_reports;

CREATE POLICY "Authorized staff can view trust reports"
  ON public.trust_incident_reports FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin', 'care_assistant', 'agency_nurse', 'agency_care_assistant', 'mdt', 'rqia')
    AND (
      (incident_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.incidents i
        WHERE i.id = incident_id AND public.can_access_resident(i.resident_id)
      ))
      OR
      (folder_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.incident_folders f
        WHERE f.id = folder_id AND public.can_access_resident(f.resident_id)
      ))
    )
  );
