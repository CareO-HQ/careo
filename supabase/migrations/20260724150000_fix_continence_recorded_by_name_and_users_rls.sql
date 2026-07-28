-- Migration: 20260724150000_fix_continence_recorded_by_name_and_users_rls.sql
-- Description: Add recorded_by_name to continence_entries and update users SELECT policy for RQIA / staff roles

-- 1. Add recorded_by_name column to continence_entries table if it does not exist
ALTER TABLE public.continence_entries ADD COLUMN IF NOT EXISTS recorded_by_name TEXT;

-- 2. Backfill recorded_by_name from public.users for existing records
UPDATE public.continence_entries ce
SET recorded_by_name = u.name
FROM public.users u
WHERE ce.recorded_by = u.id
  AND (ce.recorded_by_name IS NULL OR ce.recorded_by_name = '');

-- 3. Update public.users SELECT policy to allow RQIA, MDT, and all organizational roles to read staff names
DROP POLICY IF EXISTS "Users visibility policy" ON public.users;
DROP POLICY IF EXISTS "Users can view staff assigned to their active care home" ON public.users;
DROP POLICY IF EXISTS "Users can view users in their organization" ON public.users;

CREATE POLICY "Users visibility policy"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    -- Self
    auth.uid() = id
    OR
    -- SaaS Admin
    public.is_saas_admin()
    OR
    -- Users within the same organization (including RQIA, MDT, Managers, Nurses, Care Assistants)
    (
      active_organization_id IS NOT NULL 
      AND active_organization_id = public.get_active_organization_id()
    )
    OR
    -- Users within an accessible organization
    public.can_access_organization(active_organization_id)
  );
