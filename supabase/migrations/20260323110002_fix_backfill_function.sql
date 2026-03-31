-- Fix backfill function to properly sync existing data

CREATE OR REPLACE FUNCTION public.backfill_emar_from_medication_intakes()
RETURNS TABLE (
  total_processed INTEGER,
  scheduled_synced INTEGER,
  prn_synced INTEGER,
  errors INTEGER
) AS $$
DECLARE
  v_total INTEGER := 0;
  v_scheduled INTEGER := 0;
  v_prn INTEGER := 0;
  v_errors INTEGER := 0;
BEGIN
  -- Process all medication intakes directly via INSERT
  WITH intake_data AS (
    SELECT
      mi.*,
      m.schedule_type,
      m.strength,
      m.strength_unit,
      DATE(mi.scheduled_time AT TIME ZONE 'Europe/London') as intake_date,
      (mi.scheduled_time AT TIME ZONE 'Europe/London')::TIME as intake_time,
      EXTRACT(MONTH FROM DATE(mi.scheduled_time AT TIME ZONE 'Europe/London')) as intake_month,
      EXTRACT(YEAR FROM DATE(mi.scheduled_time AT TIME ZONE 'Europe/London')) as intake_year,
      CASE
        WHEN mi.status = 'given' OR mi.state = 'administered' THEN 'given'::emar_admin_status
        WHEN mi.status = 'refused' THEN 'refused'::emar_admin_status
        WHEN mi.status = 'missed' THEN 'omitted'::emar_admin_status
        WHEN mi.status = 'skipped' THEN 'not_required'::emar_admin_status
        ELSE 'scheduled'::emar_admin_status
      END as emar_status
    FROM public.medication_intakes mi
    JOIN public.medications m ON m.id = mi.medication_id
    WHERE mi.status IN ('given', 'refused', 'missed', 'skipped')
       OR mi.state IN ('administered', 'given', 'refused', 'missed', 'skipped')
  ),
  created_sheets AS (
    -- Create all needed MAR sheets
    INSERT INTO public.emar_sheets (
      resident_id,
      month,
      year,
      type,
      status,
      organization_id,
      care_home_id
    )
    SELECT DISTINCT
      resident_id,
      intake_month::INTEGER,
      intake_year::INTEGER,
      CASE
        WHEN schedule_type = 'PRN (As Needed)' THEN 'prn'::emar_sheet_type
        ELSE 'medication'::emar_sheet_type
      END,
      'active'::emar_sheet_status,
      organization_id,
      care_home_id
    FROM intake_data
    ON CONFLICT DO NOTHING
    RETURNING *
  )
  -- Insert administration records
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
    care_home_id,
    prn_reason,
    prn_dose_administered
  )
  SELECT
    es.id,
    id.medication_id,
    id.intake_date,
    CASE WHEN id.schedule_type != 'PRN (As Needed)' THEN id.intake_time ELSE NULL END,
    id.emar_status,
    id.administered_at,
    id.administered_by_id,
    id.witness_id,
    id.comment,
    COALESCE(id.quantity, 1),
    id.organization_id,
    id.care_home_id,
    CASE WHEN id.schedule_type = 'PRN (As Needed)' THEN id.comment ELSE NULL END,
    CASE WHEN id.schedule_type = 'PRN (As Needed)' THEN CONCAT(id.strength, ' ', id.strength_unit) ELSE NULL END
  FROM intake_data id
  JOIN public.emar_sheets es ON
    es.resident_id = id.resident_id
    AND es.month = id.intake_month::INTEGER
    AND es.year = id.intake_year::INTEGER
    AND es.type = CASE WHEN id.schedule_type = 'PRN (As Needed)' THEN 'prn'::emar_sheet_type ELSE 'medication'::emar_sheet_type END
    AND es.status = 'active'
  ON CONFLICT DO NOTHING;

  -- Count results
  SELECT COUNT(*) INTO v_total
  FROM public.medication_intakes mi
  WHERE mi.status IN ('given', 'refused', 'missed', 'skipped')
     OR mi.state IN ('administered', 'given', 'refused', 'missed', 'skipped');

  SELECT COUNT(*) INTO v_scheduled
  FROM public.emar_administrations ea
  WHERE ea.scheduled_time IS NOT NULL;

  SELECT COUNT(*) INTO v_prn
  FROM public.emar_administrations ea
  WHERE ea.scheduled_time IS NULL;

  total_processed := v_total;
  scheduled_synced := v_scheduled;
  prn_synced := v_prn;
  errors := 0;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
