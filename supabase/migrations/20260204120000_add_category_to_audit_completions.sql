-- Add missing category column to audit completion tables

-- 1. Care File Completions
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'audit_care_file_completions' AND COLUMN_NAME = 'category') THEN
        ALTER TABLE audit_care_file_completions ADD COLUMN category text DEFAULT 'carefile';
    END IF;
END $$;

-- 2. Governance Completions
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'audit_governance_completions' AND COLUMN_NAME = 'category') THEN
        ALTER TABLE audit_governance_completions ADD COLUMN category text DEFAULT 'governance';
    END IF;
END $$;

-- 3. Clinical Completions
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'audit_clinical_completions' AND COLUMN_NAME = 'category') THEN
        ALTER TABLE audit_clinical_completions ADD COLUMN category text DEFAULT 'clinical';
    END IF;
END $$;

-- 4. Environment Completions
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'audit_environment_completions' AND COLUMN_NAME = 'category') THEN
        ALTER TABLE audit_environment_completions ADD COLUMN category text DEFAULT 'environment';
    END IF;
END $$;
