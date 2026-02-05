-- Fix food_fluid_logs and diet_lifestyle schema issues
-- Migration: 20260201010000_fix_food_fluid_schema_issues.sql
--
-- Issues fixed:
-- 1. Add missing 'portion_served' column to food_fluid_logs table
-- 2. Add unique constraint on diet_lifestyle.resident_id for upsert operations

-- Add portion_served column to food_fluid_logs if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'food_fluid_logs' 
    AND column_name = 'portion_served'
  ) THEN
    ALTER TABLE public.food_fluid_logs 
    ADD COLUMN portion_served TEXT;
  END IF;
END $$;

-- Add exact_time column if it doesn't exist (for consistency with full schema)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'food_fluid_logs' 
    AND column_name = 'exact_time'
  ) THEN
    ALTER TABLE public.food_fluid_logs 
    ADD COLUMN exact_time TEXT;
  END IF;
END $$;

-- Add unique constraint on diet_lifestyle.resident_id for upsert operations
-- This allows ON CONFLICT (resident_id) to work properly
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'diet_lifestyle_resident_id_key'
  ) THEN
    ALTER TABLE public.diet_lifestyle 
    ADD CONSTRAINT diet_lifestyle_resident_id_key UNIQUE (resident_id);
  END IF;
END $$;
