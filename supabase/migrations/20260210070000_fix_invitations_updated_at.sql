-- ============================================
-- Fix: Add missing updated_at column to invitations table
-- ============================================
-- The invitations table has a BEFORE UPDATE trigger (set_updated_at_invitation)
-- that calls update_updated_at_column(), which sets NEW.updated_at = NOW().
-- If the column doesn't exist on the actual table, this trigger fails with:
--   'record "new" has no field "updated_at"'
-- This migration ensures the column exists.

-- Add updated_at column if missing
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Re-create the trigger (idempotent)
DROP TRIGGER IF EXISTS set_updated_at_invitation ON public.invitations;
CREATE TRIGGER set_updated_at_invitation
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
