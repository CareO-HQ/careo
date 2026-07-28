-- Create mdt_login_logs table and RLS policies
-- Migration: 20260728160000_create_mdt_login_logs.sql

CREATE TABLE IF NOT EXISTS public.mdt_login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    profession TEXT NOT NULL,
    unit_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    unit_name TEXT,
    resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
    resident_name TEXT,
    care_home_id UUID REFERENCES public.care_homes(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    logged_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_mdt_login_logs_user_id ON public.mdt_login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mdt_login_logs_care_home_id ON public.mdt_login_logs(care_home_id);
CREATE INDEX IF NOT EXISTS idx_mdt_login_logs_organization_id ON public.mdt_login_logs(organization_id);

-- Enable RLS
ALTER TABLE public.mdt_login_logs ENABLE ROW LEVEL SECURITY;

-- 1. INSERT Policy: Authenticated MDT users (or self) can record their visit session
CREATE POLICY "Enable insert access for authenticated users to record mdt session"
ON public.mdt_login_logs
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid() OR public.current_user_role() = 'mdt'
);

-- 2. SELECT Policy: Owners, Managers, SaaS Admins, and the MDT user can view visit logs
CREATE POLICY "Enable select access for managers, owners, saas admins and self"
ON public.mdt_login_logs
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR public.current_user_role() IN ('owner', 'manager', 'saas_admin')
);
