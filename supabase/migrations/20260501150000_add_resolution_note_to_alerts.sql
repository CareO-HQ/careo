-- Add resolution_note column to alerts table
-- This column was missing in previous migrations but referenced by triggers.
ALTER TABLE public.alerts 
ADD COLUMN IF NOT EXISTS resolution_note TEXT;
