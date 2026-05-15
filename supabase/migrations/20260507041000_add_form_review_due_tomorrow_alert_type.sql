DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_type') THEN
    ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'form_review_due_tomorrow';
  END IF;
END $$;
