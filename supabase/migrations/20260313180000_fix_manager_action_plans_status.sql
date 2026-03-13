-- Fix the status check constraint for manager action plans to be consistent with others
ALTER TABLE audit_manager_action_plans DROP CONSTRAINT IF EXISTS audit_manager_action_plans_status_check;
ALTER TABLE audit_manager_action_plans ADD CONSTRAINT audit_manager_action_plans_status_check 
    CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue'));

