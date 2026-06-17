-- Migration: Add night_check_interval_overdue alert_type enum value
-- Migration ID: 20260611171000_add_night_check_interval_overdue_alert_type.sql

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_type') THEN
    ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'night_check_interval_overdue';
  END IF;
END $$;
