-- Create rqia_login_logs table and RLS policies
-- Migration: 20260728150000_create_rqia_login_logs.sql

CREATE TABLE IF NOT EXISTS public.rqia_login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    care_home_id UUID REFERENCES public.care_homes(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    logged_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient querying by user_id and care_home_id
CREATE INDEX IF NOT EXISTS idx_rqia_login_logs_user_id ON public.rqia_login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_rqia_login_logs_care_home_id ON public.rqia_login_logs(care_home_id);
CREATE INDEX IF NOT EXISTS idx_rqia_login_logs_organization_id ON public.rqia_login_logs(organization_id);

-- Enable RLS
ALTER TABLE public.rqia_login_logs ENABLE ROW LEVEL SECURITY;

-- 1. INSERT Policy: Authenticated users (specifically RQIA role or self) can record their login session
CREATE POLICY "Enable insert access for authenticated users to record rqia session"
ON public.rqia_login_logs
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid() OR public.current_user_role() = 'rqia'
);

-- 2. SELECT Policy: Owners, Managers, SaaS Admins, and the RQIA user can view login logs
CREATE POLICY "Enable select access for managers, owners, saas admins and self"
ON public.rqia_login_logs
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR public.current_user_role() IN ('owner', 'manager', 'saas_admin')
);
