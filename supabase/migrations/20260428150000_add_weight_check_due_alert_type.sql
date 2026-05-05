DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'alert_type'
      AND e.enumlabel = 'weight_check_due_tomorrow'
  ) THEN
    ALTER TYPE public.alert_type ADD VALUE 'weight_check_due_tomorrow';
  END IF;
END $$;
