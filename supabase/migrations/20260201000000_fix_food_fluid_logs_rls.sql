-- Fix RLS policies for food_fluid_logs table
-- Migration: 20260201000000_fix_food_fluid_logs_rls.sql
-- 
-- Issues fixed:
-- 1. Missing WITH CHECK clause for INSERT operations
-- 2. Policy doesn't verify resident access - should check resident's organization
-- 3. Ensures proper access control through resident organization verification

-- Drop existing overly-simplistic policy
DROP POLICY IF EXISTS "Care data isolation" ON public.food_fluid_logs;

-- SELECT: Users can read food_fluid_logs for residents they can access
CREATE POLICY "Users can read food fluid logs"
  ON public.food_fluid_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = food_fluid_logs.resident_id
        AND public.can_access_organization(r.organization_id)
    )
  );

-- INSERT: Users can create food_fluid_logs for residents they can access
-- WITH CHECK ensures the inserted row passes the policy check
CREATE POLICY "Users can create food fluid logs"
  ON public.food_fluid_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = food_fluid_logs.resident_id
        AND public.can_access_organization(r.organization_id)
    )
  );

-- UPDATE: Users can update non-archived logs for residents they can access
-- USING checks existing row, WITH CHECK validates updated row
CREATE POLICY "Users can update non-archived logs"
  ON public.food_fluid_logs FOR UPDATE
  USING (
    is_archived = false
    AND EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = food_fluid_logs.resident_id
        AND public.can_access_organization(r.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = food_fluid_logs.resident_id
        AND public.can_access_organization(r.organization_id)
    )
  );
