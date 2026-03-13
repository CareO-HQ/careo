-- ============================================================
-- Manager Audit Shared State (replaces localStorage)
-- Scoped to care_home_id so all managers in a care home
-- share audit state & history. Isolated between care homes.
-- ============================================================

-- ----------------------------------------------------------------
-- 1. manager_audit_state
--    Stores current in-progress work per audit type per care home
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.manager_audit_state (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_home_id        UUID NOT NULL REFERENCES public.care_homes(id) ON DELETE CASCADE,
  organization_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  audit_type_id       TEXT NOT NULL,                   -- e.g. "13" for Falls Analysis

  -- Standard audit data
  questions           JSONB NOT NULL DEFAULT '[]',
  answers             JSONB NOT NULL DEFAULT '[]',
  comments            JSONB NOT NULL DEFAULT '[]',
  action_plans        JSONB NOT NULL DEFAULT '[]',
  selected_residents  JSONB NOT NULL DEFAULT '[]',

  -- Grid/home-based audit data
  row_questions       JSONB NOT NULL DEFAULT '[]',
  column_questions    JSONB NOT NULL DEFAULT '[]',
  fixed_column_data   JSONB NOT NULL DEFAULT '{}',

  -- Care File Audit
  resident_audit_data JSONB NOT NULL DEFAULT '{}',

  -- Custom audit metadata (for custom- prefixed ids)
  template_type       TEXT,                             -- 'home-based', 'resident-based', etc.
  custom_name         TEXT,
  custom_category     TEXT,
  custom_staff_type   TEXT,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(care_home_id, audit_type_id)
);

CREATE INDEX IF NOT EXISTS idx_audit_state_care_home  ON public.manager_audit_state(care_home_id);
CREATE INDEX IF NOT EXISTS idx_audit_state_org        ON public.manager_audit_state(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_state_type       ON public.manager_audit_state(audit_type_id);

-- ----------------------------------------------------------------
-- 2. manager_audit_history
--    Completed audit snapshots per care home
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.manager_audit_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_home_id    UUID NOT NULL REFERENCES public.care_homes(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  audit_type_id   TEXT NOT NULL,
  audit_type_name TEXT NOT NULL,

  completed_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  auditor         TEXT NOT NULL,
  entries_count   INT NOT NULL DEFAULT 0,
  notes           TEXT,
  data            JSONB NOT NULL DEFAULT '{}',   -- full snapshot of the completed audit

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_history_care_home  ON public.manager_audit_history(care_home_id);
CREATE INDEX IF NOT EXISTS idx_audit_history_org        ON public.manager_audit_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_history_type       ON public.manager_audit_history(audit_type_id);
CREATE INDEX IF NOT EXISTS idx_audit_history_date       ON public.manager_audit_history(completed_date DESC);

-- ----------------------------------------------------------------
-- 3. manager_custom_audits
--    Custom audit entries created by managers
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.manager_custom_audits (
  id              TEXT PRIMARY KEY,               -- same id as the custom-TIMESTAMP key
  care_home_id    UUID NOT NULL REFERENCES public.care_homes(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  name            TEXT NOT NULL,
  template_type   TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'general',
  staff_type      TEXT,

  status          TEXT NOT NULL DEFAULT 'new',
  auditor         TEXT,
  last_audited    DATE,
  due_date        DATE,
  frequency       TEXT NOT NULL DEFAULT 'monthly',

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_audits_care_home  ON public.manager_custom_audits(care_home_id);
CREATE INDEX IF NOT EXISTS idx_custom_audits_org        ON public.manager_custom_audits(organization_id);

-- ----------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_audit_state_updated_at ON public.manager_audit_state;
CREATE TRIGGER trg_audit_state_updated_at
  BEFORE UPDATE ON public.manager_audit_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_custom_audits_updated_at ON public.manager_custom_audits;
CREATE TRIGGER trg_custom_audits_updated_at
  BEFORE UPDATE ON public.manager_custom_audits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------
ALTER TABLE public.manager_audit_state    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_audit_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_custom_audits  ENABLE ROW LEVEL SECURITY;

-- Helper: check user belongs to care home via their profile
-- We rely on the existing can_access_organization helper for org check,
-- and additionally check care_home_id matches the user's active_care_home_id.

-- manager_audit_state policies
CREATE POLICY "Managers view audit state in their care home"
  ON public.manager_audit_state FOR SELECT
  USING (
    public.can_access_organization(organization_id)
    AND care_home_id = (
      SELECT active_care_home_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Managers insert audit state in their care home"
  ON public.manager_audit_state FOR INSERT
  WITH CHECK (
    public.can_access_organization(organization_id)
    AND care_home_id = (
      SELECT active_care_home_id FROM public.users WHERE id = auth.uid()
    )
    AND public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin')
  );

CREATE POLICY "Managers update audit state in their care home"
  ON public.manager_audit_state FOR UPDATE
  USING (
    public.can_access_organization(organization_id)
    AND care_home_id = (
      SELECT active_care_home_id FROM public.users WHERE id = auth.uid()
    )
    AND public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin')
  );

-- manager_audit_history policies
CREATE POLICY "Managers view history in their care home"
  ON public.manager_audit_history FOR SELECT
  USING (
    public.can_access_organization(organization_id)
    AND care_home_id = (
      SELECT active_care_home_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Managers insert history in their care home"
  ON public.manager_audit_history FOR INSERT
  WITH CHECK (
    public.can_access_organization(organization_id)
    AND care_home_id = (
      SELECT active_care_home_id FROM public.users WHERE id = auth.uid()
    )
    AND public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin')
  );

CREATE POLICY "Managers delete history in their care home"
  ON public.manager_audit_history FOR DELETE
  USING (
    public.can_access_organization(organization_id)
    AND care_home_id = (
      SELECT active_care_home_id FROM public.users WHERE id = auth.uid()
    )
    AND public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin')
  );

-- manager_custom_audits policies
CREATE POLICY "Managers view custom audits in their care home"
  ON public.manager_custom_audits FOR SELECT
  USING (
    public.can_access_organization(organization_id)
    AND care_home_id = (
      SELECT active_care_home_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Managers insert custom audits in their care home"
  ON public.manager_custom_audits FOR INSERT
  WITH CHECK (
    public.can_access_organization(organization_id)
    AND care_home_id = (
      SELECT active_care_home_id FROM public.users WHERE id = auth.uid()
    )
    AND public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin')
  );

CREATE POLICY "Managers update custom audits in their care home"
  ON public.manager_custom_audits FOR UPDATE
  USING (
    public.can_access_organization(organization_id)
    AND care_home_id = (
      SELECT active_care_home_id FROM public.users WHERE id = auth.uid()
    )
    AND public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin')
  );

CREATE POLICY "Managers delete custom audits in their care home"
  ON public.manager_custom_audits FOR DELETE
  USING (
    public.can_access_organization(organization_id)
    AND care_home_id = (
      SELECT active_care_home_id FROM public.users WHERE id = auth.uid()
    )
    AND public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin')
  );
