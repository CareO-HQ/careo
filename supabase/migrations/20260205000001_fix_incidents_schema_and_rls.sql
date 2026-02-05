-- Add missing columns to incidents table
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS care_manager_name TEXT,
ADD COLUMN IF NOT EXISTS care_manager_email TEXT,
ADD COLUMN IF NOT EXISTS key_worker_name TEXT,
ADD COLUMN IF NOT EXISTS key_worker_email TEXT;

-- Move data from trust_care_manager_* to care_manager_* if they exist and are populated
-- This is just a safety measure to ensure no data is lost if the old columns were used
UPDATE public.incidents 
SET 
  care_manager_name = COALESCE(care_manager_name, trust_care_manager_name),
  care_manager_email = COALESCE(care_manager_email, trust_care_manager_email),
  key_worker_name = COALESCE(key_worker_name, trust_key_worker_name),
  key_worker_email = COALESCE(key_worker_email, trust_key_worker_email);

-- Enable RLS
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_incident_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view incidents in their organization" ON public.incidents;
DROP POLICY IF EXISTS "Managers and above can manage incidents" ON public.incidents;
DROP POLICY IF EXISTS "Nurses can manage incidents" ON public.incidents;
DROP POLICY IF EXISTS "Owners can manage incidents" ON public.incidents;
DROP POLICY IF EXISTS "SaaS admins can manage all incidents" ON public.incidents;

-- RLS Policies for incidents
CREATE POLICY "Users within organization can view incidents"
    ON public.incidents FOR SELECT
    USING ( public.can_access_organization(organization_id) );

CREATE POLICY "Nurse/Manager/Owner can insert incidents"
    ON public.incidents FOR INSERT
    WITH CHECK (
        public.can_access_organization(organization_id)
        AND (public.get_user_role(auth.uid()) IN ('nurse', 'manager', 'owner', 'saas_admin'))
    );

CREATE POLICY "Nurse/Manager/Owner can update incidents"
    ON public.incidents FOR UPDATE
    USING (
        public.can_access_organization(organization_id)
        AND (public.get_user_role(auth.uid()) IN ('nurse', 'manager', 'owner', 'saas_admin'))
    );

CREATE POLICY "Manager/Owner can delete incidents"
    ON public.incidents FOR DELETE
    USING (
        public.can_access_organization(organization_id)
        AND (public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin'))
    );

-- RLS Policies for trust_incident_reports
CREATE POLICY "Users within organization can view trust reports"
    ON public.trust_incident_reports FOR SELECT
    USING ( 
        EXISTS (
            SELECT 1 FROM public.incidents i 
            WHERE i.id = incident_id 
            AND public.can_access_organization(i.organization_id)
        )
    );

CREATE POLICY "Nurse/Manager/Owner can manage trust reports"
    ON public.trust_incident_reports FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.incidents i 
            WHERE i.id = incident_id 
            AND public.can_access_organization(i.organization_id)
            AND (public.get_user_role(auth.uid()) IN ('nurse', 'manager', 'owner', 'saas_admin'))
        )
    );
