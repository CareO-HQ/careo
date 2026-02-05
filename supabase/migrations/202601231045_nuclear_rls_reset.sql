-- ============================================
-- NUCLEAR RLS RESET & ROBUST OWNER POLICY
-- ============================================
-- This migration drops ALL policies on care_homes and re-implements the owner-only policy
-- in a more robust way to avoid any potential scope or conflict issues.

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'care_homes' AND schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.care_homes', pol.policyname);
    END LOOP;
END $$;

-- 1. STRICT CARE HOME POLICIES (Owner Only)
CREATE POLICY "Strict Owner Insert"
  ON public.care_homes FOR INSERT
  TO authenticated
  WITH CHECK ( 
    EXISTS (
      SELECT 1 
      FROM public.users u
      WHERE u.id = auth.uid() 
      AND u.role = 'owner'
      -- Robust check: Compare owner's organization if they have one
      AND (
        u.active_organization_id IS NULL 
        OR u.active_organization_id = organization_id
      )
    )
  );

CREATE POLICY "Strict Owner Select"
  ON public.care_homes FOR SELECT
  TO authenticated
  USING (
    public.is_saas_admin() 
    OR EXISTS (
      SELECT 1 
      FROM public.users u
      WHERE u.id = auth.uid() 
      AND u.active_organization_id = organization_id
    )
  );

CREATE POLICY "Strict Owner Update"
  ON public.care_homes FOR UPDATE
  TO authenticated
  USING ( 
    EXISTS (
      SELECT 1 
      FROM public.users u
      WHERE u.id = auth.uid() 
      AND u.role = 'owner'
      AND u.active_organization_id = organization_id
    )
  )
  WITH CHECK ( 
    EXISTS (
      SELECT 1 
      FROM public.users u
      WHERE u.id = auth.uid() 
      AND u.role = 'owner'
      AND u.active_organization_id = organization_id
    )
  );

CREATE POLICY "Strict Owner Delete"
  ON public.care_homes FOR DELETE
  TO authenticated
  USING ( 
    EXISTS (
      SELECT 1 
      FROM public.users u
      WHERE u.id = auth.uid() 
      AND u.role = 'owner'
      AND u.active_organization_id = organization_id
    )
  );
