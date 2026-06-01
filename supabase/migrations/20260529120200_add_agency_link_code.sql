-- ========================================================
-- ADD AGENCY LINK CODE AND LINKAGES FOR SECURITY ISOLATION
-- ========================================================

-- 1. Add agency_link_code column to care_homes (5 characters alphanumeric, unique)
ALTER TABLE public.care_homes 
ADD COLUMN IF NOT EXISTS agency_link_code VARCHAR(5) UNIQUE;

-- 2. Create linkages table to map care homes added to the agency portal
CREATE TABLE IF NOT EXISTS public.agency_linkages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_home_id UUID NOT NULL UNIQUE REFERENCES public.care_homes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row-Level Security
ALTER TABLE public.agency_linkages ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Supervisors can add/remove care home link codes
CREATE POLICY "Supervisors manage agency linkages" ON public.agency_linkages
  FOR ALL USING (
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_agency_staff')::BOOLEAN, false) 
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'supervisor'
  );

-- Any authenticated user can check/read links
CREATE POLICY "All authenticated users read agency linkages" ON public.agency_linkages
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );
