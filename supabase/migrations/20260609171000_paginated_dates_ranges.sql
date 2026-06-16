-- Migration: Update paginated date functions to support optional start/end date filters
-- Migration ID: 20260609171000_paginated_dates_ranges.sql

-- 1. Night Checks Date Pagination
CREATE OR REPLACE FUNCTION public.get_paginated_night_check_dates(
  p_resident_id UUID,
  p_limit INT,
  p_offset INT,
  p_year INT DEFAULT NULL,
  p_month INT DEFAULT NULL,
  p_sort_order TEXT DEFAULT 'DESC',
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  log_date DATE,
  record_count INT,
  total_dates_count INT
) AS $$
DECLARE
  v_total_count INT;
BEGIN
  SELECT COUNT(DISTINCT record_date)::INT INTO v_total_count
  FROM public.night_check_recordings
  WHERE resident_id = p_resident_id
    AND (p_year IS NULL OR EXTRACT(YEAR FROM record_date) = p_year)
    AND (p_month IS NULL OR EXTRACT(MONTH FROM record_date) = p_month)
    AND (p_start_date IS NULL OR record_date >= p_start_date)
    AND (p_end_date IS NULL OR record_date <= p_end_date);

  RETURN QUERY
  SELECT 
    record_date::DATE as log_date,
    COUNT(*)::INT as record_count,
    v_total_count as total_dates_count
  FROM public.night_check_recordings
  WHERE resident_id = p_resident_id
    AND (p_year IS NULL OR EXTRACT(YEAR FROM record_date) = p_year)
    AND (p_month IS NULL OR EXTRACT(MONTH FROM record_date) = p_month)
    AND (p_start_date IS NULL OR record_date >= p_start_date)
    AND (p_end_date IS NULL OR record_date <= p_end_date)
  GROUP BY record_date
  ORDER BY 
    CASE WHEN p_sort_order = 'ASC' THEN record_date END ASC,
    CASE WHEN p_sort_order = 'DESC' THEN record_date END DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Continence Date Pagination
CREATE OR REPLACE FUNCTION public.get_paginated_continence_dates(
  p_resident_id UUID,
  p_limit INT,
  p_offset INT,
  p_year INT DEFAULT NULL,
  p_month INT DEFAULT NULL,
  p_sort_order TEXT DEFAULT 'DESC',
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  log_date DATE,
  bowel_count INT,
  urine_count INT,
  total_dates_count INT
) AS $$
DECLARE
  v_total_count INT;
BEGIN
  SELECT COUNT(DISTINCT date)::INT INTO v_total_count
  FROM public.continence_entries
  WHERE resident_id = p_resident_id
    AND (p_year IS NULL OR EXTRACT(YEAR FROM date) = p_year)
    AND (p_month IS NULL OR EXTRACT(MONTH FROM date) = p_month)
    AND (p_start_date IS NULL OR date >= p_start_date)
    AND (p_end_date IS NULL OR date <= p_end_date);

  RETURN QUERY
  SELECT 
    date::DATE as log_date,
    COUNT(CASE WHEN entry_type = 'bowel' THEN 1 END)::INT as bowel_count,
    COUNT(CASE WHEN entry_type = 'urine' THEN 1 END)::INT as urine_count,
    v_total_count as total_dates_count
  FROM public.continence_entries
  WHERE resident_id = p_resident_id
    AND (p_year IS NULL OR EXTRACT(YEAR FROM date) = p_year)
    AND (p_month IS NULL OR EXTRACT(MONTH FROM date) = p_month)
    AND (p_start_date IS NULL OR date >= p_start_date)
    AND (p_end_date IS NULL OR date <= p_end_date)
  GROUP BY date
  ORDER BY 
    CASE WHEN p_sort_order = 'ASC' THEN date END ASC,
    CASE WHEN p_sort_order = 'DESC' THEN date END DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Daily Care Date Pagination
CREATE OR REPLACE FUNCTION public.get_paginated_daily_care_dates(
  p_resident_id UUID,
  p_limit INT,
  p_offset INT,
  p_year INT DEFAULT NULL,
  p_month INT DEFAULT NULL,
  p_sort_order TEXT DEFAULT 'DESC',
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  log_date DATE,
  personal_care_count INT,
  activity_record_count INT,
  total_dates_count INT
) AS $$
DECLARE
  v_total_count INT;
BEGIN
  SELECT COUNT(DISTINCT date)::INT INTO v_total_count
  FROM public.personal_care_daily
  WHERE resident_id = p_resident_id
    AND (p_year IS NULL OR EXTRACT(YEAR FROM date) = p_year)
    AND (p_month IS NULL OR EXTRACT(MONTH FROM date) = p_month)
    AND (p_start_date IS NULL OR date >= p_start_date)
    AND (p_end_date IS NULL OR date <= p_end_date);

  RETURN QUERY
  SELECT 
    d.date::DATE as log_date,
    COUNT(CASE WHEN t.task_type != 'daily_activity_record' THEN 1 END)::INT as personal_care_count,
    COUNT(CASE WHEN t.task_type = 'daily_activity_record' THEN 1 END)::INT as activity_record_count,
    v_total_count as total_dates_count
  FROM public.personal_care_daily d
  LEFT JOIN public.personal_care_task_events t ON t.daily_id = d.id
  WHERE d.resident_id = p_resident_id
    AND (p_year IS NULL OR EXTRACT(YEAR FROM d.date) = p_year)
    AND (p_month IS NULL OR EXTRACT(MONTH FROM d.date) = p_month)
    AND (p_start_date IS NULL OR d.date >= p_start_date)
    AND (p_end_date IS NULL OR d.date <= p_end_date)
  GROUP BY d.date
  ORDER BY 
    CASE WHEN p_sort_order = 'ASC' THEN d.date END ASC,
    CASE WHEN p_sort_order = 'DESC' THEN d.date END DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
