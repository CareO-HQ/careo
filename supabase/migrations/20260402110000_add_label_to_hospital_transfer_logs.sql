-- Add label column to hospital_transfer_logs
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hospital_transfer_logs' AND column_name = 'label') THEN
        ALTER TABLE public.hospital_transfer_logs ADD COLUMN label TEXT;
    END IF;
END $$;
