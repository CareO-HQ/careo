-- ============================================
-- Sync medication_intakes to eMAR System
-- Migration: 20260323000001_sync_medication_intakes_to_emar.sql
-- Description: Creates trigger to automatically sync medication_intakes to emar_administrations
-- ============================================

-- ============================================
-- 1. FUNCTION: Sync medication_intakes to emar_administrations
-- ============================================

CREATE OR REPLACE FUNCTION public.sync_medication_intake_to_emar()
RETURNS TRIGGER AS $$
DECLARE
  v_sheet_id UUID;
  v_medication RECORD;
  v_scheduled_date DATE;
  v_scheduled_time TIME;
  v_month INTEGER;
  v_year INTEGER;
  v_status emar_admin_status;
BEGIN
  -- Get medication details
  SELECT * INTO v_medication
  FROM public.medications
  WHERE id = NEW.medication_id;

  -- Extract date and time from scheduled_time
  v_scheduled_date := DATE(NEW.scheduled_time AT TIME ZONE 'Europe/London');
  v_scheduled_time := (NEW.scheduled_time AT TIME ZONE 'Europe/London')::TIME;
  v_month := EXTRACT(MONTH FROM v_scheduled_date);
  v_year := EXTRACT(YEAR FROM v_scheduled_date);

  -- Map intake status to emar_admin_status
  v_status := CASE
    WHEN NEW.status = 'given' OR NEW.state = 'administered' THEN 'given'::emar_admin_status
    WHEN NEW.status = 'refused' THEN 'refused'::emar_admin_status
    WHEN NEW.status = 'missed' THEN 'omitted'::emar_admin_status
    WHEN NEW.status = 'skipped' THEN 'not_required'::emar_admin_status
    ELSE 'scheduled'::emar_admin_status
  END;

  -- Determine if PRN or scheduled medication
  IF v_medication.schedule_type = 'PRN (As Needed)' THEN
    -- PRN Medication: Get or create PRN MAR sheet
    SELECT id INTO v_sheet_id
    FROM public.emar_sheets
    WHERE resident_id = NEW.resident_id
      AND type = 'prn'
      AND month = v_month
      AND year = v_year
      AND status = 'active';

    -- Create sheet if doesn't exist
    IF v_sheet_id IS NULL THEN
      INSERT INTO public.emar_sheets (
        resident_id,
        month,
        year,
        type,
        status,
        organization_id,
        care_home_id
      ) VALUES (
        NEW.resident_id,
        v_month,
        v_year,
        'prn',
        'active',
        NEW.organization_id,
        NEW.care_home_id
      )
      RETURNING id INTO v_sheet_id;
    END IF;

    -- Insert or update PRN administration record
    INSERT INTO public.emar_administrations (
      emar_sheet_id,
      medication_id,
      administration_date,
      scheduled_time,
      status,
      administered_at,
      administered_by,
      notes,
      quantity,
      organization_id,
      care_home_id,
      prn_reason,
      prn_outcome,
      prn_dose_administered
    ) VALUES (
      v_sheet_id,
      NEW.medication_id,
      v_scheduled_date,
      NULL, -- PRN has no scheduled time
      v_status,
      NEW.administered_at,
      NEW.administered_by_id,
      NEW.comment,
      COALESCE(NEW.quantity, 1),
      NEW.organization_id,
      NEW.care_home_id,
      NEW.comment, -- Use comment as reason for now
      NULL, -- Outcome not captured in old system
      CONCAT(v_medication.strength, ' ', v_medication.strength_unit)
    )
    ON CONFLICT DO NOTHING; -- Prevent duplicates if record exists

  ELSE
    -- Scheduled Medication: Get or create Medication MAR sheet
    SELECT id INTO v_sheet_id
    FROM public.emar_sheets
    WHERE resident_id = NEW.resident_id
      AND type = 'medication'
      AND month = v_month
      AND year = v_year
      AND status = 'active';

    -- Create sheet if doesn't exist
    IF v_sheet_id IS NULL THEN
      INSERT INTO public.emar_sheets (
        resident_id,
        month,
        year,
        type,
        status,
        organization_id,
        care_home_id
      ) VALUES (
        NEW.resident_id,
        v_month,
        v_year,
        'medication',
        'active',
        NEW.organization_id,
        NEW.care_home_id
      )
      RETURNING id INTO v_sheet_id;
    END IF;

    -- Insert or update scheduled medication administration record
    INSERT INTO public.emar_administrations (
      emar_sheet_id,
      medication_id,
      administration_date,
      scheduled_time,
      status,
      administered_at,
      administered_by,
      witness_id,
      notes,
      quantity,
      organization_id,
      care_home_id
    ) VALUES (
      v_sheet_id,
      NEW.medication_id,
      v_scheduled_date,
      v_scheduled_time,
      v_status,
      NEW.administered_at,
      NEW.administered_by_id,
      NEW.witness_id,
      NEW.comment,
      COALESCE(NEW.quantity, 1),
      NEW.organization_id,
      NEW.care_home_id
    )
    ON CONFLICT (emar_sheet_id, medication_id, administration_date, scheduled_time)
    DO UPDATE SET
      status = EXCLUDED.status,
      administered_at = EXCLUDED.administered_at,
      administered_by = EXCLUDED.administered_by,
      witness_id = EXCLUDED.witness_id,
      notes = EXCLUDED.notes,
      quantity = EXCLUDED.quantity,
      updated_at = NOW();

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. TRIGGER: Auto-sync on INSERT/UPDATE
-- ============================================

DROP TRIGGER IF EXISTS tr_sync_medication_intake_to_emar ON public.medication_intakes;

CREATE TRIGGER tr_sync_medication_intake_to_emar
  AFTER INSERT OR UPDATE ON public.medication_intakes
  FOR EACH ROW
  WHEN (NEW.status IS NOT NULL OR NEW.state IS NOT NULL)
  EXECUTE FUNCTION public.sync_medication_intake_to_emar();

-- ============================================
-- 3. ADD UNIQUE CONSTRAINT to emar_administrations
-- ============================================

-- Add unique constraint to prevent duplicates for scheduled medications
CREATE UNIQUE INDEX IF NOT EXISTS idx_emar_admin_unique_scheduled
  ON public.emar_administrations (emar_sheet_id, medication_id, administration_date, scheduled_time)
  WHERE scheduled_time IS NOT NULL;

-- ============================================
-- 4. BACKFILL FUNCTION: Sync existing data
-- ============================================

CREATE OR REPLACE FUNCTION public.backfill_emar_from_medication_intakes()
RETURNS TABLE (
  total_processed INTEGER,
  scheduled_synced INTEGER,
  prn_synced INTEGER,
  errors INTEGER
) AS $$
DECLARE
  v_intake RECORD;
  v_total INTEGER := 0;
  v_scheduled INTEGER := 0;
  v_prn INTEGER := 0;
  v_errors INTEGER := 0;
BEGIN
  -- Process all medication intakes that have been administered
  FOR v_intake IN
    SELECT mi.*
    FROM public.medication_intakes mi
    WHERE mi.status IN ('given', 'refused', 'missed', 'skipped')
       OR mi.state IN ('administered', 'given', 'refused', 'missed', 'skipped')
    ORDER BY mi.scheduled_time DESC
  LOOP
    BEGIN
      v_total := v_total + 1;

      -- Trigger the sync function
      PERFORM public.sync_medication_intake_to_emar() FROM (SELECT v_intake.*) AS NEW;

      -- Count by type
      IF EXISTS (
        SELECT 1 FROM public.medications
        WHERE id = v_intake.medication_id
          AND schedule_type = 'PRN (As Needed)'
      ) THEN
        v_prn := v_prn + 1;
      ELSE
        v_scheduled := v_scheduled + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      RAISE NOTICE 'Error syncing intake %: %', v_intake.id, SQLERRM;
    END;
  END LOOP;

  total_processed := v_total;
  scheduled_synced := v_scheduled;
  prn_synced := v_prn;
  errors := v_errors;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. COMMENTS
-- ============================================

COMMENT ON FUNCTION public.sync_medication_intake_to_emar() IS 'Automatically syncs medication_intakes to emar_administrations when medications are administered';
COMMENT ON FUNCTION public.backfill_emar_from_medication_intakes() IS 'Backfills existing medication_intakes data into emar_administrations table';
COMMENT ON TRIGGER tr_sync_medication_intake_to_emar ON public.medication_intakes IS 'Trigger to sync medication administrations to eMAR system';

-- ============================================
-- 6. RUN BACKFILL (Optional - uncomment to run immediately)
-- ============================================

-- SELECT * FROM public.backfill_emar_from_medication_intakes();
