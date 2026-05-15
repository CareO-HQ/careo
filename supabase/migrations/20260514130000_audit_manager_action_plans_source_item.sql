-- Link manager audit action plans to the care file audit question they were raised from.
ALTER TABLE public.audit_manager_action_plans
  ADD COLUMN IF NOT EXISTS source_item_id TEXT;

-- Store assignee display name for manager action plans created from resident care file audits.
ALTER TABLE public.audit_manager_action_plans
  ADD COLUMN IF NOT EXISTS assigned_to_name TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_manager_ap_source_item_id
  ON public.audit_manager_action_plans (source_item_id);
