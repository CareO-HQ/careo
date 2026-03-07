-- ============================================
-- Modified Diet & Fluid Audit Tables
-- ============================================

-- Response options enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_response') THEN
    CREATE TYPE audit_response AS ENUM ('yes', 'no', 'not_applicable');
  END IF;
END $$;

-- Manager Audits (parent table for all audit types)
DROP TABLE IF EXISTS public.manager_audits CASCADE;

CREATE TABLE public.manager_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_type_id TEXT NOT NULL, -- e.g., "19" for Modified Diet Audit
  audit_type_name TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  care_home_id UUID REFERENCES public.care_homes(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,

  -- Audit metadata
  status TEXT NOT NULL DEFAULT 'in-progress' CHECK (status IN ('new', 'in-progress', 'completed')),
  auditor_id UUID NOT NULL REFERENCES auth.users(id),
  auditor_name TEXT NOT NULL,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_manager_audits_org ON public.manager_audits(organization_id);
CREATE INDEX idx_manager_audits_care_home ON public.manager_audits(care_home_id);
CREATE INDEX idx_manager_audits_team ON public.manager_audits(team_id);
CREATE INDEX idx_manager_audits_type ON public.manager_audits(audit_type_id);
CREATE INDEX idx_manager_audits_auditor ON public.manager_audits(auditor_id);
CREATE INDEX idx_manager_audits_status ON public.manager_audits(status);

-- Modified Diet Audit Entries (child table for specific audit data)
CREATE TABLE IF NOT EXISTS public.modified_diet_audit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.manager_audits(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Column 2: Date of last SALT Assessment & is the report available in Care Plan file?
  salt_assessment_date DATE,
  salt_report_available audit_response,

  -- Column 3: Are recommendations of this SALT Report recorded and consistent on the written handover and Meal Distribution list?
  recommendations_consistent audit_response,

  -- Column 4: Does the "Eating and Drinking / Nutrition" care plan reflect the SALT recommendations?
  care_plan_reflects_salt audit_response,

  -- Column 5: Does the kitchen have the current resident SALT recommendations?
  kitchen_has_recommendations audit_response,

  -- Column 6: Is the MARS and KARDEX consistent with the SALT recommendations?
  mars_kardex_consistent audit_response,

  -- Column 7: Comments
  comments TEXT,

  -- Compliance tracking
  is_compliant BOOLEAN GENERATED ALWAYS AS (
    salt_report_available != 'no' AND
    recommendations_consistent != 'no' AND
    care_plan_reflects_salt != 'no' AND
    kitchen_has_recommendations != 'no' AND
    mars_kardex_consistent != 'no'
  ) STORED,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate resident entries per audit
  UNIQUE(audit_id, resident_id)
);

CREATE INDEX idx_modified_diet_entries_audit ON public.modified_diet_audit_entries(audit_id);
CREATE INDEX idx_modified_diet_entries_resident ON public.modified_diet_audit_entries(resident_id);
CREATE INDEX idx_modified_diet_entries_org ON public.modified_diet_audit_entries(organization_id);
CREATE INDEX idx_modified_diet_entries_compliant ON public.modified_diet_audit_entries(is_compliant);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_manager_audits_updated_at ON public.manager_audits;
CREATE TRIGGER update_manager_audits_updated_at
    BEFORE UPDATE ON public.manager_audits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_modified_diet_entries_updated_at ON public.modified_diet_audit_entries;
CREATE TRIGGER update_modified_diet_entries_updated_at
    BEFORE UPDATE ON public.modified_diet_audit_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.manager_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modified_diet_audit_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for manager_audits
CREATE POLICY "Users can view audits in their organization"
  ON public.manager_audits FOR SELECT
  USING ( public.can_access_organization(organization_id) );

CREATE POLICY "Managers can create audits"
  ON public.manager_audits FOR INSERT
  WITH CHECK (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin')
  );

CREATE POLICY "Managers can update audits"
  ON public.manager_audits FOR UPDATE
  USING (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin')
  );

-- RLS Policies for modified_diet_audit_entries
CREATE POLICY "Users can view audit entries in their organization"
  ON public.modified_diet_audit_entries FOR SELECT
  USING ( public.can_access_organization(organization_id) );

CREATE POLICY "Managers can create audit entries"
  ON public.modified_diet_audit_entries FOR INSERT
  WITH CHECK (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin')
  );

CREATE POLICY "Managers can update audit entries"
  ON public.modified_diet_audit_entries FOR UPDATE
  USING (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin')
  );

CREATE POLICY "Managers can delete audit entries"
  ON public.modified_diet_audit_entries FOR DELETE
  USING (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin')
  );
