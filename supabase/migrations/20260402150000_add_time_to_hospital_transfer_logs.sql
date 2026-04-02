-- Add time column to hospital_transfer_logs
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hospital_transfer_logs' AND column_name = 'time') THEN
        ALTER TABLE public.hospital_transfer_logs ADD COLUMN time TEXT;
    END IF;
END $$;
