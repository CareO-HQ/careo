-- ============================================
-- FIX SECURITY DEFINER VIEW
-- Recreate medication_stock_history view with
-- security_invoker = true so RLS policies of
-- the querying user are enforced, not those of
-- the view owner.
-- ============================================

CREATE OR REPLACE VIEW public.medication_stock_history
WITH (security_invoker = true)
AS
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

COMMENT ON VIEW public.medication_stock_history IS 'Unified view of all stock movements (receipts and adjustments). Uses security_invoker to enforce RLS of the querying user.';
