-- ============================================
-- FIX HOSPITAL TABLES MIGRATION
-- ============================================

-- 1. Fix hospital_passports
DO $$
BEGIN
    -- Add general_details if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hospital_passports' AND column_name = 'general_details') THEN
        ALTER TABLE public.hospital_passports ADD COLUMN general_details JSONB DEFAULT '{}'::jsonb NOT NULL;
    END IF;

    -- Add medical_care_needs
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hospital_passports' AND column_name = 'medical_care_needs') THEN
        ALTER TABLE public.hospital_passports ADD COLUMN medical_care_needs JSONB DEFAULT '{}'::jsonb NOT NULL;
    END IF;

    -- Add skin_medication_attachments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hospital_passports' AND column_name = 'skin_medication_attachments') THEN
        ALTER TABLE public.hospital_passports ADD COLUMN skin_medication_attachments JSONB DEFAULT '{}'::jsonb NOT NULL;
    END IF;

    -- Add sign_off
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hospital_passports' AND column_name = 'sign_off') THEN
        ALTER TABLE public.hospital_passports ADD COLUMN sign_off JSONB DEFAULT '{}'::jsonb NOT NULL;
    END IF;
END $$;

-- 2. Fix hospital_transfer_logs
DO $$
BEGIN
    -- Add date if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hospital_transfer_logs' AND column_name = 'date') THEN
        ALTER TABLE public.hospital_transfer_logs ADD COLUMN date DATE;
        -- Attempt to migrate data from transfer_date if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hospital_transfer_logs' AND column_name = 'transfer_date') THEN
            UPDATE public.hospital_transfer_logs SET date = transfer_date::DATE WHERE date IS NULL;
        END IF;
        -- Set NOT NULL after population
        ALTER TABLE public.hospital_transfer_logs ALTER COLUMN date SET DEFAULT CURRENT_DATE;
        ALTER TABLE public.hospital_transfer_logs ALTER COLUMN date SET NOT NULL;
    END IF;

    -- Add hospital_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hospital_transfer_logs' AND column_name = 'hospital_name') THEN
        ALTER TABLE public.hospital_transfer_logs ADD COLUMN hospital_name TEXT;
        -- Attempt to migrate from destination_hospital
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hospital_transfer_logs' AND column_name = 'destination_hospital') THEN
           UPDATE public.hospital_transfer_logs SET hospital_name = destination_hospital WHERE hospital_name IS NULL;
        END IF;
         ALTER TABLE public.hospital_transfer_logs ALTER COLUMN hospital_name SET NOT NULL;
    END IF;

    -- Add reason (might exist, check type/constraints if needed, but simple add if missing is safe)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hospital_transfer_logs' AND column_name = 'reason') THEN
        ALTER TABLE public.hospital_transfer_logs ADD COLUMN reason TEXT NOT NULL DEFAULT '';
    END IF;

    -- Add outcome
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hospital_transfer_logs' AND column_name = 'outcome') THEN
        ALTER TABLE public.hospital_transfer_logs ADD COLUMN outcome TEXT;
    END IF;

    -- Add follow_up
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hospital_transfer_logs' AND column_name = 'follow_up') THEN
        ALTER TABLE public.hospital_transfer_logs ADD COLUMN follow_up TEXT;
    END IF;

    -- Add files_changed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hospital_transfer_logs' AND column_name = 'files_changed') THEN
        ALTER TABLE public.hospital_transfer_logs ADD COLUMN files_changed JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- Add medication_changes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hospital_transfer_logs' AND column_name = 'medication_changes') THEN
        ALTER TABLE public.hospital_transfer_logs ADD COLUMN medication_changes JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;
