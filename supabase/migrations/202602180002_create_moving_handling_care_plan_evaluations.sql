-- Migration: Create moving_handling_care_plan_evaluations table
-- Date: 2026-02-18
-- Description: Stores individual Care Plan Evaluation entries for the
--              Moving and Handling Care Plan. Each row is one evaluation.

-- ── Table ──────────────────────────────────────────────────────────────────────

CREATE TABLE public.moving_handling_care_plan_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'completed',
  assessment_data JSONB,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Versioning
  version_number INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES public.moving_handling_care_plan_evaluations(id),
  archived_at TIMESTAMPTZ
);

CREATE INDEX idx_mh_care_plan_evaluations_resident
  ON public.moving_handling_care_plan_evaluations(resident_id);

CREATE INDEX idx_mh_care_plan_evaluations_status
  ON public.moving_handling_care_plan_evaluations(resident_id, status);

-- ── RLS ────────────────────────────────────────────────────────────────────────

ALTER TABLE public.moving_handling_care_plan_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS admins manage mh_care_plan_evaluations" ON public.moving_handling_care_plan_evaluations;
CREATE POLICY "SaaS admins manage mh_care_plan_evaluations"
  ON public.moving_handling_care_plan_evaluations FOR ALL TO authenticated
  USING (public.is_saas_admin())
  WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view mh_care_plan_evaluations in their organization" ON public.moving_handling_care_plan_evaluations;
CREATE POLICY "Users can view mh_care_plan_evaluations in their organization"
  ON public.moving_handling_care_plan_evaluations FOR SELECT TO authenticated
  USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage mh_care_plan_evaluations" ON public.moving_handling_care_plan_evaluations;
CREATE POLICY "Staff can manage mh_care_plan_evaluations"
  ON public.moving_handling_care_plan_evaluations FOR ALL TO authenticated
  USING (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'carer', 'senior_carer')
  )
  WITH CHECK (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'carer', 'senior_carer')
  );
