-- Add fluid_target to residents table allowing integer values for daily fluid goals (ml)
ALTER TABLE residents ADD COLUMN IF NOT EXISTS fluid_target INTEGER;
