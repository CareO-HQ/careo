-- Add RLS policies for diet_lifestyle table
-- Migration: 20260201020000_add_diet_lifestyle_rls.sql
--
-- Issues fixed:
-- 1. Enable RLS on diet_lifestyle table
-- 2. Create SELECT, INSERT, UPDATE policies that verify resident organization access

-- Enable RLS on diet_lifestyle
ALTER TABLE public.diet_lifestyle ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can read diet_lifestyle for residents they can access
CREATE POLICY "Users can read diet lifestyle"
  ON public.diet_lifestyle FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = diet_lifestyle.resident_id
        AND public.can_access_organization(r.organization_id)
    )
  );

-- INSERT: Users can create diet_lifestyle for residents they can access
-- WITH CHECK ensures the inserted row passes the policy check
CREATE POLICY "Users can create diet lifestyle"
  ON public.diet_lifestyle FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = diet_lifestyle.resident_id
        AND public.can_access_organization(r.organization_id)
    )
  );

-- UPDATE: Users can update diet_lifestyle for residents they can access
-- USING checks existing row, WITH CHECK validates updated row
CREATE POLICY "Users can update diet lifestyle"
  ON public.diet_lifestyle FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = diet_lifestyle.resident_id
        AND public.can_access_organization(r.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = diet_lifestyle.resident_id
        AND public.can_access_organization(r.organization_id)
    )
  );
