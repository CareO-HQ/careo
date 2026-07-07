-- Migration to add sort_order to shift_templates
ALTER TABLE public.shift_templates ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Backfill sort_order based on start_time within each team
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY team_id ORDER BY start_time ASC, name ASC) - 1 as seq
  FROM public.shift_templates
)
UPDATE public.shift_templates st
SET sort_order = r.seq
FROM ranked r
WHERE st.id = r.id;
