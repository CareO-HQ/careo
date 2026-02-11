-- ============================================
-- Add Quantity to Medication Intakes and Stock Management
-- Migration: 202602111100_add_quantity_to_medication_intakes.sql
-- Description: Adds quantity column to medication_intakes and trigger to decrease medication total_count
-- ============================================

-- 1. Add quantity column to medication_intakes
ALTER TABLE public.medication_intakes
  ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;

-- 2. Create stock management trigger function
CREATE OR REPLACE FUNCTION public.handle_medication_stock_management()
RETURNS TRIGGER AS $$
BEGIN
  -- When an intake is marked as 'given'
  IF (NEW.status = 'given' AND (OLD.status IS NULL OR OLD.status != 'given')) THEN
    UPDATE public.medications
    SET total_count = GREATEST(0, total_count - NEW.quantity),
        updated_at = NOW()
    WHERE id = NEW.medication_id;
  END IF;

  -- Optional: If an intake was 'given' but is corrected back to something else, restore stock?
  -- For now, we only handle the decrease to match the requirement "currently the total count is not decreasing"
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach trigger to medication_intakes
DROP TRIGGER IF EXISTS tr_medication_stock_management ON public.medication_intakes;
CREATE TRIGGER tr_medication_stock_management
  AFTER UPDATE ON public.medication_intakes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_medication_stock_management();

-- Also apply to INSERT for PRN medications that are created directly with status 'given'
DROP TRIGGER IF EXISTS tr_medication_stock_management_insert ON public.medication_intakes;
CREATE TRIGGER tr_medication_stock_management_insert
  AFTER INSERT ON public.medication_intakes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_medication_stock_management();
