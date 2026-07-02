-- Create table for resident admission checklist tasks
CREATE TABLE IF NOT EXISTS public.resident_admission_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    timeframe TEXT NOT NULL, -- 'immediate', '6hours', '24hours', '48hours', '5days', 'ongoing'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in-progress', 'completed', 'ongoing'
    form TEXT,
    completed_by TEXT,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for checklist audit logs
CREATE TABLE IF NOT EXISTS public.resident_admission_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    icon TEXT NOT NULL,
    color TEXT,
    action TEXT NOT NULL,
    created_by_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.resident_admission_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resident_admission_audit_logs ENABLE ROW LEVEL SECURITY;

-- Triggers for modtime on tasks
CREATE TRIGGER update_resident_admission_tasks_modtime
    BEFORE UPDATE ON public.resident_admission_tasks
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Policies for resident_admission_tasks
DROP POLICY IF EXISTS "Users can view tasks in their organization" ON public.resident_admission_tasks;
CREATE POLICY "Users can view tasks in their organization" 
    ON public.resident_admission_tasks 
    FOR SELECT 
    TO authenticated 
    USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage tasks in their organization" ON public.resident_admission_tasks;
CREATE POLICY "Staff can manage tasks in their organization" 
    ON public.resident_admission_tasks 
    FOR ALL 
    TO authenticated 
    USING (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'care_assistant', 'agency_care_assistant'))
    WITH CHECK (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'care_assistant', 'agency_care_assistant'));

-- Policies for resident_admission_audit_logs
DROP POLICY IF EXISTS "Users can view audit logs in their organization" ON public.resident_admission_audit_logs;
CREATE POLICY "Users can view audit logs in their organization" 
    ON public.resident_admission_audit_logs 
    FOR SELECT 
    TO authenticated 
    USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can insert audit logs in their organization" ON public.resident_admission_audit_logs;
CREATE POLICY "Staff can insert audit logs in their organization" 
    ON public.resident_admission_audit_logs 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'care_assistant', 'agency_care_assistant'));
