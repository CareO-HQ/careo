-- Fix action plan priority and status check constraints

-- 1. Resident Action Plans
alter table audit_resident_action_plans drop constraint if exists audit_resident_action_plans_priority_check;
alter table audit_resident_action_plans add constraint audit_resident_action_plans_priority_check 
    check (priority in ('low', 'medium', 'high', 'urgent', 'Low', 'Medium', 'High', 'Urgent'));

alter table audit_resident_action_plans drop constraint if exists audit_resident_action_plans_status_check;
alter table audit_resident_action_plans add constraint audit_resident_action_plans_status_check 
    check (status in ('pending', 'in_progress', 'completed', 'overdue'));

-- 2. Care File Action Plans
alter table audit_care_file_action_plans drop constraint if exists audit_care_file_action_plans_priority_check;
alter table audit_care_file_action_plans add constraint audit_care_file_action_plans_priority_check 
    check (priority in ('low', 'medium', 'high', 'urgent', 'Low', 'Medium', 'High', 'Urgent'));

alter table audit_care_file_action_plans drop constraint if exists audit_care_file_action_plans_status_check;
alter table audit_care_file_action_plans add constraint audit_care_file_action_plans_status_check 
    check (status in ('pending', 'in_progress', 'completed', 'overdue'));

-- 3. Governance Action Plans
alter table audit_governance_action_plans drop constraint if exists audit_governance_action_plans_priority_check;
alter table audit_governance_action_plans add constraint audit_governance_action_plans_priority_check 
    check (priority in ('low', 'medium', 'high', 'urgent', 'Low', 'Medium', 'High', 'Urgent'));

alter table audit_governance_action_plans drop constraint if exists audit_governance_action_plans_status_check;
alter table audit_governance_action_plans add constraint audit_governance_action_plans_status_check 
    check (status in ('pending', 'in_progress', 'completed', 'overdue'));

-- 4. Clinical Action Plans
alter table audit_clinical_action_plans drop constraint if exists audit_clinical_action_plans_priority_check;
alter table audit_clinical_action_plans add constraint audit_clinical_action_plans_priority_check 
    check (priority in ('low', 'medium', 'high', 'urgent', 'Low', 'Medium', 'High', 'Urgent'));

alter table audit_clinical_action_plans drop constraint if exists audit_clinical_action_plans_status_check;
alter table audit_clinical_action_plans add constraint audit_clinical_action_plans_status_check 
    check (status in ('pending', 'in_progress', 'completed', 'overdue'));

-- 5. Environment Action Plans
alter table audit_environment_action_plans drop constraint if exists audit_environment_action_plans_priority_check;
alter table audit_environment_action_plans add constraint audit_environment_action_plans_priority_check 
    check (priority in ('low', 'medium', 'high', 'urgent', 'Low', 'Medium', 'High', 'Urgent'));

alter table audit_environment_action_plans drop constraint if exists audit_environment_action_plans_status_check;
alter table audit_environment_action_plans add constraint audit_environment_action_plans_status_check 
    check (status in ('pending', 'in_progress', 'completed', 'overdue'));
