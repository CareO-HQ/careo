-- Add unique constraint to medication_intakes to prevent duplicate slots for the same medication at the same time
-- This helps prevent race conditions during auto-generation

-- First, cleanup any existing duplicates by keeping only one record per (medication_id, scheduled_time)
DELETE FROM public.medication_intakes a
USING public.medication_intakes b
WHERE a.id < b.id
  AND a.medication_id = b.medication_id
  AND a.scheduled_time = b.scheduled_time;

-- Now add the unique constraint
ALTER TABLE public.medication_intakes
ADD CONSTRAINT medication_intakes_medication_id_scheduled_time_key 
UNIQUE (medication_id, scheduled_time);
