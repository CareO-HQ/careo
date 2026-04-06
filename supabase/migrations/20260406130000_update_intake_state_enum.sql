-- Update intake_state enum to include new administration statuses
DO $$ BEGIN
  -- Check and add 'taken'
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'intake_state' AND e.enumlabel = 'taken') THEN
    ALTER TYPE intake_state ADD VALUE 'taken';
  END IF;

  -- Check and add 'hospitalised'
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'intake_state' AND e.enumlabel = 'hospitalised') THEN
    ALTER TYPE intake_state ADD VALUE 'hospitalised';
  END IF;

  -- Check and add 'social_leave'
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'intake_state' AND e.enumlabel = 'social_leave') THEN
    ALTER TYPE intake_state ADD VALUE 'social_leave';
  END IF;

  -- Check and add 'refused_destroyed'
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'intake_state' AND e.enumlabel = 'refused_destroyed') THEN
    ALTER TYPE intake_state ADD VALUE 'refused_destroyed';
  END IF;

  -- Check and add 'made_available'
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'intake_state' AND e.enumlabel = 'made_available') THEN
    ALTER TYPE intake_state ADD VALUE 'made_available';
  END IF;

  -- Check and add 'not_required'
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'intake_state' AND e.enumlabel = 'not_required') THEN
    ALTER TYPE intake_state ADD VALUE 'not_required';
  END IF;
END $$;

-- Migrate any existing 'administered' or 'given' to 'taken' for medication_intakes (optional but consistent)
-- UPDATE public.medication_intakes SET status = 'taken' WHERE status IN ('administered', 'given');
