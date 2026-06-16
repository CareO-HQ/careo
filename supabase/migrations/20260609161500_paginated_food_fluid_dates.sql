-- Migration: Add paginated dates aggregation for Food & Fluid logs
-- Migration: 20260609161500_paginated_food_fluid_dates.sql

CREATE OR REPLACE FUNCTION public.get_paginated_food_fluid_dates(
  p_resident_id UUID,
  p_limit INT,
  p_offset INT,
  p_year INT DEFAULT NULL,
  p_month INT DEFAULT NULL,
  p_sort_order TEXT DEFAULT 'DESC'
)
RETURNS TABLE (
  log_date DATE,
  food_count INT,
  fluid_count INT,
  total_dates_count INT
) AS $$
DECLARE
  v_total_count INT;
BEGIN
  -- Compute total matching unique dates for pagination metadata (excluding archived logs)
  SELECT COUNT(DISTINCT date)::INT INTO v_total_count
  FROM public.food_fluid_logs
  WHERE resident_id = p_resident_id
    AND is_archived IS NOT TRUE
    AND (p_year IS NULL OR EXTRACT(YEAR FROM timestamp) = p_year)
    AND (p_month IS NULL OR EXTRACT(MONTH FROM timestamp) = p_month);

  RETURN QUERY
  SELECT 
    date::DATE as log_date,
    COUNT(CASE WHEN fluid_consumed_ml IS NULL THEN 1 END)::INT as food_count,
    COUNT(CASE WHEN fluid_consumed_ml IS NOT NULL THEN 1 END)::INT as fluid_count,
    v_total_count as total_dates_count
  FROM public.food_fluid_logs
  WHERE resident_id = p_resident_id
    AND is_archived IS NOT TRUE
    AND (p_year IS NULL OR EXTRACT(YEAR FROM timestamp) = p_year)
    AND (p_month IS NULL OR EXTRACT(MONTH FROM timestamp) = p_month)
  GROUP BY date
  ORDER BY 
    CASE WHEN p_sort_order = 'ASC' THEN date END ASC,
    CASE WHEN p_sort_order = 'DESC' THEN date END DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
