-- Migration: Add 'shift_reassigned' to rota_audit_logs action_type CHECK constraint
-- This value is used by swapOrMoveShiftAction when moving a staff member to an unassigned slot

ALTER TABLE public.rota_audit_logs 
DROP CONSTRAINT IF EXISTS rota_audit_logs_action_type_check;

ALTER TABLE public.rota_audit_logs 
ADD CONSTRAINT rota_audit_logs_action_type_check 
CHECK (action_type IN (
  'rota_created', 'rota_edited', 'rota_published', 
  'shift_added', 'shift_removed', 'shift_swapped', 'shift_reassigned',
  'leave_requested', 'leave_approved', 'leave_rejected', 
  'manager_approved_nurse_granted', 'manager_approved_nurse_revoked', 
  'staffing_rule_changed', 'shift_template_created', 
  'shift_template_edited', 'shift_template_deleted'
));
