-- Migration: Comprehensive Medication Stock Management System
-- Description: Adds stock receiving, adjustments, discontinuation tracking, and audit trails

-- ============================================================================
-- 1. Add discontinuation tracking fields to medications table
-- ============================================================================

ALTER TABLE public.medications
ADD COLUMN IF NOT EXISTS discontinued_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS discontinued_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS discontinuation_reason TEXT,
ADD COLUMN IF NOT EXISTS discontinuation_notes TEXT;

-- Add index for discontinued_at queries
CREATE INDEX IF NOT EXISTS idx_medications_discontinued_at ON public.medications(discontinued_at);

-- ============================================================================
-- 2. Create medication_stock_receipts table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.medication_stock_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Medication reference
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,

  -- Receipt details
  quantity_received INTEGER NOT NULL CHECK (quantity_received > 0),
  batch_number TEXT,
  expiry_date DATE,
  supplier_name TEXT,
  prescription_reference TEXT,

  -- Stock tracking
  stock_before INTEGER NOT NULL DEFAULT 0,
  stock_after INTEGER NOT NULL,

  -- Metadata
  received_by UUID NOT NULL REFERENCES public.users(id),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,

  -- Organization tracking
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  care_home_id UUID REFERENCES public.care_homes(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for stock receipts
CREATE INDEX IF NOT EXISTS idx_stock_receipts_medication_id ON public.medication_stock_receipts(medication_id);
CREATE INDEX IF NOT EXISTS idx_stock_receipts_resident_id ON public.medication_stock_receipts(resident_id);
CREATE INDEX IF NOT EXISTS idx_stock_receipts_received_at ON public.medication_stock_receipts(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_receipts_expiry_date ON public.medication_stock_receipts(expiry_date);

-- ============================================================================
-- 3. Create medication_stock_adjustments table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.medication_stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Medication reference
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,

  -- Adjustment details
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('manual_correction', 'damaged', 'expired', 'lost', 'returned_to_pharmacy', 'other')),
  quantity_change INTEGER NOT NULL, -- Can be positive or negative

  -- Stock tracking
  stock_before INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,

  -- Justification
  reason TEXT NOT NULL,
  notes TEXT,

  -- Metadata
  adjusted_by UUID NOT NULL REFERENCES public.users(id),
  adjusted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Organization tracking
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  care_home_id UUID REFERENCES public.care_homes(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for stock adjustments
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_medication_id ON public.medication_stock_adjustments(medication_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_resident_id ON public.medication_stock_adjustments(resident_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_adjusted_at ON public.medication_stock_adjustments(adjusted_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_type ON public.medication_stock_adjustments(adjustment_type);

-- ============================================================================
-- 4. Create medication_stock_history view
-- ============================================================================

CREATE OR REPLACE VIEW public.medication_stock_history AS
SELECT
  'receipt' AS transaction_type,
  r.id,
  r.medication_id,
  r.resident_id,
  r.quantity_received AS quantity,
  NULL::INTEGER AS quantity_change,
  r.stock_before,
  r.stock_after,
  r.received_by AS performed_by,
  r.received_at AS performed_at,
  CONCAT('Stock received: ', r.quantity_received,
         CASE WHEN r.supplier_name IS NOT NULL THEN ' from ' || r.supplier_name ELSE '' END,
         CASE WHEN r.batch_number IS NOT NULL THEN ' (Batch: ' || r.batch_number || ')' ELSE '' END
  ) AS description,
  r.notes,
  r.organization_id,
  r.care_home_id,
  r.created_at
FROM public.medication_stock_receipts r

UNION ALL

SELECT
  'adjustment' AS transaction_type,
  a.id,
  a.medication_id,
  a.resident_id,
  NULL::INTEGER AS quantity,
  a.quantity_change,
  a.stock_before,
  a.stock_after,
  a.adjusted_by AS performed_by,
  a.adjusted_at AS performed_at,
  CONCAT('Stock adjustment (', a.adjustment_type, '): ',
         CASE WHEN a.quantity_change > 0 THEN '+' ELSE '' END,
         a.quantity_change::TEXT,
         ' - ', a.reason
  ) AS description,
  a.notes,
  a.organization_id,
  a.care_home_id,
  a.created_at
FROM public.medication_stock_adjustments a

ORDER BY performed_at DESC;

-- ============================================================================
-- 5. Enable RLS on new tables
-- ============================================================================

ALTER TABLE public.medication_stock_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_stock_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for medication_stock_receipts
CREATE POLICY "Users can view stock receipts in their organization"
  ON public.medication_stock_receipts
  FOR SELECT
  USING (
    organization_id IN (
      SELECT active_organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert stock receipts in their organization"
  ON public.medication_stock_receipts
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT active_organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update stock receipts in their organization"
  ON public.medication_stock_receipts
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT active_organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- RLS Policies for medication_stock_adjustments
CREATE POLICY "Users can view stock adjustments in their organization"
  ON public.medication_stock_adjustments
  FOR SELECT
  USING (
    organization_id IN (
      SELECT active_organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert stock adjustments in their organization"
  ON public.medication_stock_adjustments
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT active_organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update stock adjustments in their organization"
  ON public.medication_stock_adjustments
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT active_organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- 6. Create trigger functions for updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_medication_stock_receipts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_medication_stock_adjustments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS tr_medication_stock_receipts_updated_at ON public.medication_stock_receipts;
CREATE TRIGGER tr_medication_stock_receipts_updated_at
  BEFORE UPDATE ON public.medication_stock_receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_medication_stock_receipts_updated_at();

DROP TRIGGER IF EXISTS tr_medication_stock_adjustments_updated_at ON public.medication_stock_adjustments;
CREATE TRIGGER tr_medication_stock_adjustments_updated_at
  BEFORE UPDATE ON public.medication_stock_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION update_medication_stock_adjustments_updated_at();

-- ============================================================================
-- 7. Function to receive medication stock
-- ============================================================================

CREATE OR REPLACE FUNCTION receive_medication_stock(
  p_medication_id UUID,
  p_resident_id UUID,
  p_quantity_received INTEGER,
  p_batch_number TEXT DEFAULT NULL,
  p_expiry_date DATE DEFAULT NULL,
  p_supplier_name TEXT DEFAULT NULL,
  p_prescription_reference TEXT DEFAULT NULL,
  p_received_by UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_care_home_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_current_stock INTEGER;
  v_new_stock INTEGER;
  v_receipt_id UUID;
  v_result JSON;
BEGIN
  -- Get current stock
  SELECT COALESCE(total_count, 0) INTO v_current_stock
  FROM public.medications
  WHERE id = p_medication_id;

  -- Calculate new stock
  v_new_stock := v_current_stock + p_quantity_received;

  -- Update medication total_count
  UPDATE public.medications
  SET total_count = v_new_stock,
      updated_at = NOW()
  WHERE id = p_medication_id;

  -- Insert stock receipt record
  INSERT INTO public.medication_stock_receipts (
    medication_id,
    resident_id,
    quantity_received,
    batch_number,
    expiry_date,
    supplier_name,
    prescription_reference,
    stock_before,
    stock_after,
    received_by,
    notes,
    organization_id,
    care_home_id
  ) VALUES (
    p_medication_id,
    p_resident_id,
    p_quantity_received,
    p_batch_number,
    p_expiry_date,
    p_supplier_name,
    p_prescription_reference,
    v_current_stock,
    v_new_stock,
    COALESCE(p_received_by, auth.uid()),
    p_notes,
    p_organization_id,
    p_care_home_id
  ) RETURNING id INTO v_receipt_id;

  -- Return result
  SELECT json_build_object(
    'success', TRUE,
    'receipt_id', v_receipt_id,
    'stock_before', v_current_stock,
    'stock_after', v_new_stock,
    'quantity_received', p_quantity_received
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. Function to adjust medication stock
-- ============================================================================

CREATE OR REPLACE FUNCTION adjust_medication_stock(
  p_medication_id UUID,
  p_resident_id UUID,
  p_adjustment_type TEXT,
  p_quantity_change INTEGER,
  p_reason TEXT,
  p_notes TEXT DEFAULT NULL,
  p_adjusted_by UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_care_home_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_current_stock INTEGER;
  v_new_stock INTEGER;
  v_adjustment_id UUID;
  v_result JSON;
BEGIN
  -- Get current stock
  SELECT COALESCE(total_count, 0) INTO v_current_stock
  FROM public.medications
  WHERE id = p_medication_id;

  -- Calculate new stock (ensure it doesn't go negative)
  v_new_stock := GREATEST(0, v_current_stock + p_quantity_change);

  -- Update medication total_count
  UPDATE public.medications
  SET total_count = v_new_stock,
      updated_at = NOW()
  WHERE id = p_medication_id;

  -- Insert stock adjustment record
  INSERT INTO public.medication_stock_adjustments (
    medication_id,
    resident_id,
    adjustment_type,
    quantity_change,
    stock_before,
    stock_after,
    reason,
    notes,
    adjusted_by,
    organization_id,
    care_home_id
  ) VALUES (
    p_medication_id,
    p_resident_id,
    p_adjustment_type,
    p_quantity_change,
    v_current_stock,
    v_new_stock,
    p_reason,
    p_notes,
    COALESCE(p_adjusted_by, auth.uid()),
    p_organization_id,
    p_care_home_id
  ) RETURNING id INTO v_adjustment_id;

  -- Return result
  SELECT json_build_object(
    'success', TRUE,
    'adjustment_id', v_adjustment_id,
    'stock_before', v_current_stock,
    'stock_after', v_new_stock,
    'quantity_change', p_quantity_change
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. Comments for documentation
-- ============================================================================

COMMENT ON TABLE public.medication_stock_receipts IS 'Tracks all medication stock received from pharmacies/suppliers';
COMMENT ON TABLE public.medication_stock_adjustments IS 'Tracks manual stock adjustments (corrections, damages, losses, etc.)';
COMMENT ON VIEW public.medication_stock_history IS 'Unified view of all stock movements (receipts and adjustments)';
COMMENT ON FUNCTION receive_medication_stock IS 'Function to receive medication stock and create audit record';
COMMENT ON FUNCTION adjust_medication_stock IS 'Function to adjust medication stock and create audit record';

COMMENT ON COLUMN public.medications.discontinued_at IS 'Timestamp when medication was discontinued';
COMMENT ON COLUMN public.medications.discontinued_by IS 'User who discontinued the medication';
COMMENT ON COLUMN public.medications.discontinuation_reason IS 'Reason for discontinuation (e.g., Treatment complete, Side effects, etc.)';
COMMENT ON COLUMN public.medications.discontinuation_notes IS 'Additional notes about discontinuation';
