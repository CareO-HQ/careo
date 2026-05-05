-- Fix trust_incident_reports RLS to support folder-based submissions
-- The hardening migration accidentally removed the folder_id path for security policies

DROP POLICY IF EXISTS "Users within care home can view trust reports" ON public.trust_incident_reports;
DROP POLICY IF EXISTS "Authorized staff can manage trust reports in scope" ON public.trust_incident_reports;

-- 1. Restore SELECT policy with folder support
CREATE POLICY "Authorized staff can view trust reports"
  ON public.trust_incident_reports FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
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

-- 2. Restore ALL (manage) policy with folder support
CREATE POLICY "Authorized staff can manage trust reports"
  ON public.trust_incident_reports FOR ALL
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
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
  )
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
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
