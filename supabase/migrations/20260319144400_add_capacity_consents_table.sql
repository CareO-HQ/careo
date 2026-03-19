-- Migration: add_capacity_consents_table
-- Drop existing table to restructure
DROP TABLE IF EXISTS public.capacity_consents;

CREATE TABLE public.capacity_consents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resident_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    
    -- Standard assessment columns
    assessment_date date DEFAULT CURRENT_DATE,
    assessment_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    
    -- Meta
    saved_as_draft boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

    CONSTRAINT capacity_consents_pkey PRIMARY KEY (id),
    CONSTRAINT capacity_consents_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE,
    CONSTRAINT capacity_consents_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
    CONSTRAINT capacity_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.capacity_consents ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "SaaS admins manage capacity_consents" ON public.capacity_consents;
CREATE POLICY "SaaS admins manage capacity_consents" ON public.capacity_consents FOR ALL TO authenticated USING (public.is_saas_admin()) WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view capacity_consents in their organization" ON public.capacity_consents;
CREATE POLICY "Users can view capacity_consents in their organization" ON public.capacity_consents FOR SELECT TO authenticated USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage capacity_consents" ON public.capacity_consents;
CREATE POLICY "Staff can manage capacity_consents" ON public.capacity_consents FOR ALL TO authenticated USING (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')) WITH CHECK (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse'));
