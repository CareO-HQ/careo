DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_type') THEN
    ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'bowel_not_recorded_3_days';
  END IF;
END $$;
