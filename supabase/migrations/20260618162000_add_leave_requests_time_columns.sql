-- Migration to add start_time and end_time columns to leave_requests
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time TIME;
