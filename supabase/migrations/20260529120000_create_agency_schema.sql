-- ============================================
-- CAREO: AGENCY STAFFING PORTAL SCHEMA
-- ============================================
-- Migration: Create tables for agency staff coordination and update roles
-- Date: May 29, 2026

-- 1. Add roles to user_role ENUM (run as separate statements to avoid transaction limitations)
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'agency_nurse';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'agency_care_assistant';

-- 2. Create Agency Staff table
CREATE TABLE IF NOT EXISTS public.agency_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID, -- References auth.users(id) - can be NULL until they signup
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('supervisor', 'nurse', 'care_assistant')),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'pending_approval', 'approved', 'declined', 'active', 'offboarded')),
  phone TEXT,
  skills TEXT[] DEFAULT '{}',
  certifications TEXT[] DEFAULT '{}',
  compliance_documents JSONB DEFAULT '[]'::jsonb,
  availability JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Agency Requests table (assignments from supervisor to care homes)
CREATE TABLE IF NOT EXISTS public.agency_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_staff_id UUID NOT NULL REFERENCES public.agency_staff(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  care_home_id UUID NOT NULL REFERENCES public.care_homes(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'active', 'offboarded')),
  notes TEXT,
  compliance_documents JSONB DEFAULT '[]'::jsonb,
  activation_sent BOOLEAN DEFAULT FALSE,
  activation_token UUID DEFAULT gen_random_uuid(),
  activated_at TIMESTAMPTZ,
  offboarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Agency Shifts table (for scheduling & attendance)
CREATE TABLE IF NOT EXISTS public.agency_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_staff_id UUID NOT NULL REFERENCES public.agency_staff(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  care_home_id UUID NOT NULL REFERENCES public.care_homes(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'completed', 'cancelled')),
  attendance_status TEXT NOT NULL DEFAULT 'pending' CHECK (attendance_status IN ('pending', 'checked_in', 'checked_out', 'missed')),
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Add triggers for updated_at column
CREATE TRIGGER update_agency_staff_updated_at BEFORE UPDATE ON public.agency_staff FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agency_requests_updated_at BEFORE UPDATE ON public.agency_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agency_shifts_updated_at BEFORE UPDATE ON public.agency_shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Modify public.handle_new_user() trigger to skip automatic public.users creation for agency staff
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_name TEXT;
  v_role user_role;
  v_is_saas_admin BOOLEAN;
  v_is_agency_staff BOOLEAN;
BEGIN
  RAISE NOTICE 'DEBUG: handle_new_user syncing user: %', NEW.email;

  -- Read is_agency_staff flag from metadata
  v_is_agency_staff := COALESCE((NEW.raw_app_meta_data->>'is_agency_staff')::BOOLEAN, false);

  -- If it's agency staff logging in/registering, skip inserting into public.users
  -- Their public.users profile is created only when onboarding is accepted.
  IF v_is_agency_staff THEN
    RAISE NOTICE 'DEBUG: Skipping public.users sync for agency staff: %', NEW.email;
    
    -- Link user in agency_staff table if matched by email
    UPDATE public.agency_staff
    SET auth_user_id = NEW.id
    WHERE email = NEW.email AND auth_user_id IS NULL;
    
    RETURN NEW;
  END IF;

  v_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name');
  v_is_saas_admin := COALESCE((NEW.raw_app_meta_data->>'is_saas_admin')::BOOLEAN, false);
  
  -- Use a safe cast for role
  BEGIN
    v_role := (NEW.raw_app_meta_data->>'role')::user_role;
  EXCEPTION WHEN OTHERS THEN
    v_role := 'care_assistant'::user_role;
  END;

  INSERT INTO public.users (id, email, name, is_saas_admin, role)
  VALUES (
    NEW.id,
    NEW.email,
    v_name,
    v_is_saas_admin,
    v_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    is_saas_admin = EXCLUDED.is_saas_admin,
    role = EXCLUDED.role;
  
  RAISE NOTICE 'DEBUG: Sync complete for user: %', NEW.id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'DEBUG: handle_new_user failed for email %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper to prevent RLS recursion loops
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

-- 7. Add Row Level Security (RLS) Policies
ALTER TABLE public.agency_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_shifts ENABLE ROW LEVEL SECURITY;

-- Agency Staff policies
CREATE POLICY "Supervisors manage agency staff" ON public.agency_staff FOR ALL USING (
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_agency_staff')::BOOLEAN, false) 
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'supervisor'
);

CREATE POLICY "Agency staff read own details" ON public.agency_staff FOR SELECT USING (
  auth.uid() = auth_user_id
);

CREATE POLICY "Agency staff update own details" ON public.agency_staff FOR UPDATE USING (
  auth.uid() = auth_user_id
);

CREATE POLICY "Care homes view agency staff profiles assigned to them" ON public.agency_staff FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.agency_requests req
    WHERE req.agency_staff_id = public.agency_staff.id
    AND req.care_home_id = (auth.jwt() -> 'app_metadata' ->> 'active_care_home_id')::UUID
  )
);

-- Agency Requests policies
CREATE POLICY "Supervisors manage agency requests" ON public.agency_requests FOR ALL USING (
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_agency_staff')::BOOLEAN, false) 
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'supervisor'
);

CREATE POLICY "Care homes view/update their requests" ON public.agency_requests FOR ALL USING (
  care_home_id = (auth.jwt() -> 'app_metadata' ->> 'active_care_home_id')::UUID
);

CREATE POLICY "Agency staff view requests for themselves" ON public.agency_requests FOR SELECT USING (
  public.is_own_agency_staff(agency_staff_id)
);

-- Agency Shifts policies
CREATE POLICY "Supervisors manage agency shifts" ON public.agency_shifts FOR ALL USING (
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_agency_staff')::BOOLEAN, false) 
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'supervisor'
);

CREATE POLICY "Care homes view shifts assigned to them" ON public.agency_shifts FOR SELECT USING (
  care_home_id = (auth.jwt() -> 'app_metadata' ->> 'active_care_home_id')::UUID
);

CREATE POLICY "Agency staff view own shifts" ON public.agency_shifts FOR SELECT USING (
  public.is_own_agency_staff(agency_staff_id)
);

CREATE POLICY "Agency staff check-in/out of assigned shifts" ON public.agency_shifts FOR UPDATE USING (
  public.is_own_agency_staff(agency_staff_id)
);
