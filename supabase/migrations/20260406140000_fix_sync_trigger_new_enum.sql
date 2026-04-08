-- ============================================
-- Fix sync trigger to use updated emar_admin_status enum values
-- Description: The enum was updated to replace 'given' with 'taken' and add new statuses,
-- but the sync trigger still referenced the old 'given' value.
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

  -- Map intake status to emar_admin_status (updated for new enum values)
  v_status := CASE
    WHEN NEW.status = 'taken' OR NEW.status = 'given' OR NEW.state = 'administered' THEN 'taken'::emar_admin_status
    WHEN NEW.status = 'refused' THEN 'refused'::emar_admin_status
    WHEN NEW.status = 'refused_destroyed' THEN 'refused_destroyed'::emar_admin_status
    WHEN NEW.status = 'hospitalised' THEN 'hospitalised'::emar_admin_status
    WHEN NEW.status = 'social_leave' THEN 'social_leave'::emar_admin_status
    WHEN NEW.status = 'made_available' THEN 'made_available'::emar_admin_status
    WHEN NEW.status = 'missed' OR NEW.status = 'omitted' THEN 'not_required'::emar_admin_status
    WHEN NEW.status = 'skipped' OR NEW.status = 'not_required' THEN 'not_required'::emar_admin_status
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

    -- For PRN, always INSERT (multiple doses per day allowed)
    BEGIN
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
        v_scheduled_time,
        v_status,
        NEW.administered_at,
        NEW.administered_by_id,
        NEW.comment,
        COALESCE(NEW.quantity, 1),
        NEW.organization_id,
        NEW.care_home_id,
        NEW.comment,
        NULL,
        CONCAT(v_medication.strength, ' ', v_medication.strength_unit)
      );
    EXCEPTION WHEN unique_violation THEN
      -- If duplicate, update the existing record
      UPDATE public.emar_administrations
      SET
        status = v_status,
        administered_at = NEW.administered_at,
        administered_by = NEW.administered_by_id,
        notes = NEW.comment,
        quantity = COALESCE(NEW.quantity, 1),
        updated_at = NOW()
      WHERE emar_sheet_id = v_sheet_id
        AND medication_id = NEW.medication_id
        AND administration_date = v_scheduled_date
        AND scheduled_time = v_scheduled_time;
    END;

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
    ON CONFLICT (emar_sheet_id, medication_id, administration_date, COALESCE(scheduled_time, '00:00:00'::TIME))
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

COMMENT ON FUNCTION public.sync_medication_intake_to_emar() IS 'Syncs medication_intakes to emar_administrations - Updated for new emar_admin_status enum values';
