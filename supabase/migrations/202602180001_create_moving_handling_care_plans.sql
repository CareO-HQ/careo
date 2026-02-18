-- Migration: Create moving_handling_care_plans table
-- Date: 2026-02-18
-- Description: Creates the moving_handling_care_plans table to store
--              Moving and Handling Care Plan form submissions with versioning support.

-- ── Table ──────────────────────────────────────────────────────────────────────

CREATE TABLE public.moving_handling_care_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  assessment_data JSONB,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Versioning
  version_number INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES public.moving_handling_care_plans(id),
  archived_at TIMESTAMPTZ
);

CREATE INDEX idx_moving_handling_care_plans_resident
  ON public.moving_handling_care_plans(resident_id);

CREATE INDEX idx_moving_handling_care_plans_status
  ON public.moving_handling_care_plans(resident_id, status);

-- ── RLS ────────────────────────────────────────────────────────────────────────

ALTER TABLE public.moving_handling_care_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS admins manage moving_handling_care_plans" ON public.moving_handling_care_plans;
CREATE POLICY "SaaS admins manage moving_handling_care_plans"
  ON public.moving_handling_care_plans FOR ALL TO authenticated
  USING (public.is_saas_admin())
  WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view moving_handling_care_plans in their organization" ON public.moving_handling_care_plans;
CREATE POLICY "Users can view moving_handling_care_plans in their organization"
  ON public.moving_handling_care_plans FOR SELECT TO authenticated
  USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage moving_handling_care_plans" ON public.moving_handling_care_plans;
CREATE POLICY "Staff can manage moving_handling_care_plans"
  ON public.moving_handling_care_plans FOR ALL TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'carer', 'senior_carer')
  )
  WITH CHECK (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'carer', 'senior_carer')
  );
