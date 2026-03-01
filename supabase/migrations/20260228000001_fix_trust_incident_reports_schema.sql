-- Fix trust_incident_reports to support folder-based submissions
-- (forms can be submitted from an incident folder without requiring a linked incident record)

-- 1. Add folder_id column
ALTER TABLE public.trust_incident_reports
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.incident_folders(id) ON DELETE CASCADE;

-- 2. Make incident_id nullable (it may not exist when submitting directly from a folder)
ALTER TABLE public.trust_incident_reports
  ALTER COLUMN incident_id DROP NOT NULL;

-- 3. Make created_by default to the current user so forms don't need to supply it explicitly
ALTER TABLE public.trust_incident_reports
  ALTER COLUMN created_by SET DEFAULT auth.uid();

-- 4. Add an index on folder_id for fast lookups
CREATE INDEX IF NOT EXISTS trust_incident_reports_folder_id_idx
  ON public.trust_incident_reports(folder_id);

-- 5. Drop and recreate RLS policies to support both incident_id and folder_id paths

DROP POLICY IF EXISTS "Users within organization can view trust reports" ON public.trust_incident_reports;
DROP POLICY IF EXISTS "Nurse/Manager/Owner can manage trust reports" ON public.trust_incident_reports;

-- Allow viewing when linked via incident OR via folder
CREATE POLICY "Users within organization can view trust reports"
  ON public.trust_incident_reports FOR SELECT
  USING (
    (
      incident_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.incidents i
        WHERE i.id = incident_id
          AND public.can_access_organization(i.organization_id)
      )
    )
    OR
    (
      folder_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.incident_folders f
        JOIN public.residents r ON r.id = f.resident_id
        WHERE f.id = folder_id
          AND public.can_access_organization(r.organization_id)
      )
    )
  );

-- Allow insert/update/delete for nurse/manager/owner when linked via incident OR folder
CREATE POLICY "Nurse/Manager/Owner can manage trust reports"
  ON public.trust_incident_reports FOR ALL
  USING (
    (
      incident_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.incidents i
        WHERE i.id = incident_id
          AND public.can_access_organization(i.organization_id)
          AND (public.get_user_role(auth.uid()) IN ('nurse', 'manager', 'owner', 'saas_admin'))
      )
    )
    OR
    (
      folder_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.incident_folders f
        JOIN public.residents r ON r.id = f.resident_id
        WHERE f.id = folder_id
          AND public.can_access_organization(r.organization_id)
          AND (public.get_user_role(auth.uid()) IN ('nurse', 'manager', 'owner', 'saas_admin'))
      )
    )
  );
