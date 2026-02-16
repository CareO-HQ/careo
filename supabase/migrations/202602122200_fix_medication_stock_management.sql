-- ============================================
-- Fix Medication Stock Management: Deduct on Pop Out, Not on "Given"
-- Migration: 202602122200_fix_medication_stock_management.sql
-- Description: Changes the stock deduction trigger to fire when a medication
--              is popped out (popped_out_at transitions from NULL to non-NULL),
--              rather than when the status is changed to 'given'.
-- ============================================

-- 1. Replace the stock management trigger function
CREATE OR REPLACE FUNCTION public.handle_medication_stock_management()
RETURNS TRIGGER AS $$
BEGIN
  -- Deduct stock when medication is POPPED OUT (popped_out_at changes from NULL to non-NULL)
  IF (TG_OP = 'UPDATE') THEN
    IF (NEW.popped_out_at IS NOT NULL AND (OLD.popped_out_at IS NULL)) THEN
      UPDATE public.medications
      SET total_count = GREATEST(0, total_count - COALESCE(NEW.quantity, 1)),
          updated_at = NOW()
      WHERE id = NEW.medication_id;
    END IF;
  END IF;

  -- For INSERTs (PRN medications created directly as administered),
  -- deduct stock if popped_out_at is set on creation
  IF (TG_OP = 'INSERT') THEN
    IF (NEW.popped_out_at IS NOT NULL) THEN
      UPDATE public.medications
      SET total_count = GREATEST(0, total_count - COALESCE(NEW.quantity, 1)),
          updated_at = NOW()
      WHERE id = NEW.medication_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Re-attach triggers (drop and recreate to ensure they use the updated function)
DROP TRIGGER IF EXISTS tr_medication_stock_management ON public.medication_intakes;
CREATE TRIGGER tr_medication_stock_management
  AFTER UPDATE ON public.medication_intakes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_medication_stock_management();

DROP TRIGGER IF EXISTS tr_medication_stock_management_insert ON public.medication_intakes;
CREATE TRIGGER tr_medication_stock_management_insert
  AFTER INSERT ON public.medication_intakes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_medication_stock_management();
