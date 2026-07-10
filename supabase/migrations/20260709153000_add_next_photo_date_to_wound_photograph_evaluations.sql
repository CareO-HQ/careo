-- Add next_photo_date column to wound_photograph_evaluations
ALTER TABLE public.wound_photograph_evaluations
ADD COLUMN IF NOT EXISTS next_photo_date DATE;
