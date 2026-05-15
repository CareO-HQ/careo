-- Store assignee display name for common action plans (avoids relying on roster joins in the UI).
ALTER TABLE public.care_home_common_action_plans
  ADD COLUMN IF NOT EXISTS assigned_to_name TEXT;
