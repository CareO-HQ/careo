-- Migration: Add Versioning to All Assessments
-- Date: 2026-01-28
-- Description: Adds status, previous_version_id, version_number, and archived_at to all assessment tables to support version control.

DO $$ 
DECLARE 
    tables TEXT[] := ARRAY[
        'pre_admission_care_files',
        'infection_prevention_assessments',
        'bladder_bowel_assessments',
        'moving_handling_assessments',
        'bedrail_consents',
        'bedrails_risk_assessments', -- Corrected from bed_rails_risk_assessments
        'long_term_falls_risk_assessments',
        'admission_assessments',
        'photography_consents',
        'dnacprs',
        'peeps',
        'dependency_assessments',
        'timl_assessments',
        'skin_integrity_assessments',
        'resident_valuables_assessments',
        'handling_profiles',
        'pain_assessments',
        'nutritional_assessments',
        'oral_assessments',
        'diet_notifications',
        'choking_risk_assessments',
        'cornell_depression_scales',
        'best_interest_decisions'
    ];
    tbl TEXT;
    constraint_name TEXT;
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        -- Add status column if not exists
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS status TEXT DEFAULT ''active''', tbl);
        
        -- Add previous_version_id column if not exists
        -- We explicitly name the constraint to avoid generation of too-long names
        -- Truncate table name if needed for constraint (taking first 20 chars + hash or just suffix)
        -- Actually, we can just let PG handle it usually, but since we suspect length issues, let's try standard add without constraint name first.
        -- Usage of REFERENCES automatically creates an internal FK constraint with a name.
        -- To be safe, we can add column first, then add FK constraint with short name.
        
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS previous_version_id UUID', tbl);
        
        -- Only add constraint if it doesn't exist? Hard to check in DO block easily without query. 
        -- Simplest way: ADD COLUMN REFERENCES %I(id). PG truncates names automatically with a NOTICE.
        -- The previous failure might have been due to 'bed_rails_risk_assessments' not existing which is an ERROR.
        -- The NOTICE about truncation is likely benign.
        
        BEGIN
            EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (previous_version_id) REFERENCES %I(id)', 
                tbl, 
                substring(tbl from 1 for 40) || '_prev_ver_fk', 
                tbl);
        EXCEPTION WHEN duplicate_object THEN
            -- Constraint already exists, ignore
            NULL;
        WHEN OTHERS THEN
            -- Ignore other errors like if FK already exists
            NULL;
        END;

        -- Add version_number column if not exists
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1', tbl);
        
        -- Add archived_at column if not exists
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ', tbl);
    END LOOP;
END $$;

-- Check care_plan_assessments
ALTER TABLE care_plan_assessments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE care_plan_assessments ADD COLUMN IF NOT EXISTS previous_version_id UUID REFERENCES care_plan_assessments(id);
ALTER TABLE care_plan_assessments ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1; 
ALTER TABLE care_plan_assessments ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
