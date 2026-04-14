-- ============================================
-- FIX SECURITY DEFINER VIEW
-- ============================================

ALTER VIEW public.medication_stock_history SET (security_invoker = true);
