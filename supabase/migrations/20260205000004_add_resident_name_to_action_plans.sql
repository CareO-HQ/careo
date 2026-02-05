-- Migration: Add missing resident_name columns to all action plan tables and ensure priority casing is correct
-- Date: February 5, 2026

-- Add resident_name to audit_resident_action_plans
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_resident_action_plans' AND column_name = 'resident_name') THEN
        ALTER TABLE public.audit_resident_action_plans ADD COLUMN resident_name TEXT;
    END IF;
END $$;

-- Add resident_name to audit_care_file_action_plans
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_care_file_action_plans' AND column_name = 'resident_name') THEN
        ALTER TABLE public.audit_care_file_action_plans ADD COLUMN resident_name TEXT;
    END IF;
END $$;

-- Add resident_name to audit_governance_action_plans
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_governance_action_plans' AND column_name = 'resident_name') THEN
        ALTER TABLE public.audit_governance_action_plans ADD COLUMN resident_name TEXT;
    END IF;
END $$;

-- Add resident_name to audit_clinical_action_plans
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_clinical_action_plans' AND column_name = 'resident_name') THEN
        ALTER TABLE public.audit_clinical_action_plans ADD COLUMN resident_name TEXT;
    END IF;
END $$;

-- Add resident_name to audit_environment_action_plans
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_environment_action_plans' AND column_name = 'resident_name') THEN
        ALTER TABLE public.audit_environment_action_plans ADD COLUMN resident_name TEXT;
    END IF;
END $$;

-- Ensure priority check constraints use PascalCase across all tables
-- Note: Migration 20260205000003_fix_action_plan_constraints.sql should have handled this, 
-- but we repeat here for complete safety.

ALTER TABLE public.audit_resident_action_plans DROP CONSTRAINT IF EXISTS audit_resident_action_plans_priority_check;
ALTER TABLE public.audit_resident_action_plans ADD CONSTRAINT audit_resident_action_plans_priority_check CHECK (priority IN ('Low', 'Medium', 'High'));

ALTER TABLE public.audit_care_file_action_plans DROP CONSTRAINT IF EXISTS audit_care_file_action_plans_priority_check;
ALTER TABLE public.audit_care_file_action_plans ADD CONSTRAINT audit_care_file_action_plans_priority_check CHECK (priority IN ('Low', 'Medium', 'High'));

ALTER TABLE public.audit_governance_action_plans DROP CONSTRAINT IF EXISTS audit_governance_action_plans_priority_check;
ALTER TABLE public.audit_governance_action_plans ADD CONSTRAINT audit_governance_action_plans_priority_check CHECK (priority IN ('Low', 'Medium', 'High'));

ALTER TABLE public.audit_clinical_action_plans DROP CONSTRAINT IF EXISTS audit_clinical_action_plans_priority_check;
ALTER TABLE public.audit_clinical_action_plans ADD CONSTRAINT audit_clinical_action_plans_priority_check CHECK (priority IN ('Low', 'Medium', 'High'));

ALTER TABLE public.audit_environment_action_plans DROP CONSTRAINT IF EXISTS audit_environment_action_plans_priority_check;
ALTER TABLE public.audit_environment_action_plans ADD CONSTRAINT audit_environment_action_plans_priority_check CHECK (priority IN ('Low', 'Medium', 'High'));
