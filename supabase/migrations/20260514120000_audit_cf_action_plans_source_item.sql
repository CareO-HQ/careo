-- Link care file audit action plans to the checklist item they were raised from.
ALTER TABLE public.audit_care_file_action_plans
  ADD COLUMN IF NOT EXISTS source_item_id TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_cf_ap_source_item_id
  ON public.audit_care_file_action_plans (source_item_id);
