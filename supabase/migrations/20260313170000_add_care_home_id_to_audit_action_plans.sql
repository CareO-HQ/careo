-- Migration: Add care_home_id to all audit action plan tables
-- Date: 2026-03-13
-- Description: Adds care_home_id to all audit categories' action plan tables to allow filtering by care home.

-- 1. Governance Action Plans
ALTER TABLE public.audit_governance_action_plans
  ADD COLUMN IF NOT EXISTS care_home_id UUID REFERENCES public.care_homes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_audit_gov_ap_care_home_id ON public.audit_governance_action_plans(care_home_id);

-- 2. Clinical Action Plans
ALTER TABLE public.audit_clinical_action_plans
  ADD COLUMN IF NOT EXISTS care_home_id UUID REFERENCES public.care_homes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_audit_cln_ap_care_home_id ON public.audit_clinical_action_plans(care_home_id);

-- 3. Environment Action Plans
ALTER TABLE public.audit_environment_action_plans
  ADD COLUMN IF NOT EXISTS care_home_id UUID REFERENCES public.care_homes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_audit_env_ap_care_home_id ON public.audit_environment_action_plans(care_home_id);

-- 4. Resident Action Plans
ALTER TABLE public.audit_resident_action_plans
  ADD COLUMN IF NOT EXISTS care_home_id UUID REFERENCES public.care_homes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_audit_res_ap_care_home_id ON public.audit_resident_action_plans(care_home_id);

-- Backfill from team_id (which usually contains the care home UUID as string)
UPDATE public.audit_resident_action_plans
SET care_home_id = team_id::UUID
WHERE care_home_id IS NULL 
AND team_id IS NOT NULL 
AND team_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 5. Care File Action Plans
ALTER TABLE public.audit_care_file_action_plans
  ADD COLUMN IF NOT EXISTS care_home_id UUID REFERENCES public.care_homes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_audit_cf_ap_care_home_id ON public.audit_care_file_action_plans(care_home_id);

-- Backfill from team_id
UPDATE public.audit_care_file_action_plans
SET care_home_id = team_id::UUID
WHERE care_home_id IS NULL 
AND team_id IS NOT NULL 
AND team_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
