-- ============================================
-- BREAK RLS INFINITE RECURSION CHAIN FOR AGENCY
-- ============================================

-- 1. Create a SECURITY DEFINER helper function to query agency_staff
-- Running with security definer bypasses Row-Level Security checks for the query inside,
-- preventing recursion when evaluated in other table policies.
CREATE OR REPLACE FUNCTION public.is_own_agency_staff(staff_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE id = staff_id
    AND auth_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 2. Drop old looping policies on agency_requests and agency_shifts
DROP POLICY IF EXISTS "Agency staff view requests for themselves" ON public.agency_requests;
DROP POLICY IF EXISTS "Agency staff view own shifts" ON public.agency_shifts;
DROP POLICY IF EXISTS "Agency staff check-in/out of assigned shifts" ON public.agency_shifts;

-- 3. Re-create policies using the recursion-safe helper
CREATE POLICY "Agency staff view requests for themselves" ON public.agency_requests
  FOR SELECT USING ( public.is_own_agency_staff(agency_staff_id) );

CREATE POLICY "Agency staff view own shifts" ON public.agency_shifts
  FOR SELECT USING ( public.is_own_agency_staff(agency_staff_id) );

CREATE POLICY "Agency staff check-in/out of assigned shifts" ON public.agency_shifts
  FOR UPDATE USING ( public.is_own_agency_staff(agency_staff_id) );
