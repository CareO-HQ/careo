-- ============================================
-- CareO Supabase Migration Schema
-- Created: 2026-01-21
-- ============================================
-- IMPORTANT: Tables are created in dependency order
-- 1. Organizations (no dependencies)
-- 2. Care Homes (depends on organizations)
-- 3. Units (depends on care_homes and organizations)
-- 4. Profiles (depends on units and care_homes)
-- 5. All other tables follow

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM (
  'saas_admin',
  'owner',
  'manager',
  'nurse',
  'care_assistant'
);

CREATE TYPE resident_status AS ENUM (
  'active',
  'discharged',
  'deceased',
  'transferred',
  'hospital'
);

CREATE TYPE task_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'partially_completed',
  'not_required',
  'refused',
  'unable',
  'missed'
);

CREATE TYPE shift_type AS ENUM ('AM', 'PM', 'Night');

CREATE TYPE medication_status AS ENUM ('active', 'completed', 'cancelled');

CREATE TYPE intake_state AS ENUM (
  'scheduled',
  'dispensed',
  'administered',
  'given',
  'refused',
  'missed',
  'skipped'
);

CREATE TYPE alert_type AS ENUM (
  'food_fluid',
  'night_check',
  'medication',
  'activity',
  'vital_signs',
  'care_plan'
);

CREATE TYPE alert_severity AS ENUM ('critical', 'warning', 'info');

CREATE TYPE organization_status AS ENUM ('active', 'suspended', 'deactivated');

CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'revoked');

-- ============================================
-- EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- ============================================
-- ORGANIZATIONS (Supabase Auth teams → organizations)
-- ============================================
-- Created FIRST - no dependencies

CREATE TABLE public.organizations (
  id UUID PRIMARY KEY, -- References auth.organizations.id
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.organization_status (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  status organization_status NOT NULL DEFAULT 'active',
  deactivated_at TIMESTAMPTZ,
  deactivated_by UUID REFERENCES auth.users(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_org_status_org_id ON public.organization_status(organization_id);
CREATE INDEX idx_org_status_status ON public.organization_status(status);

-- ============================================
-- CARE HOMES
-- ============================================
-- Created SECOND - depends on organizations

CREATE TABLE public.care_homes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_care_homes_org ON public.care_homes(organization_id);
CREATE INDEX idx_care_homes_created_by ON public.care_homes(created_by);

-- ============================================
-- CARE HOME MANAGERS
-- ============================================

CREATE TABLE public.care_home_managers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  care_home_id UUID NOT NULL REFERENCES public.care_homes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE(care_home_id, user_id)
);

CREATE INDEX idx_care_home_managers_care_home ON public.care_home_managers(care_home_id);
CREATE INDEX idx_care_home_managers_user ON public.care_home_managers(user_id);

-- ============================================
-- UNITS (linked to Supabase Auth teams)
-- ============================================
-- Created THIRD - depends on care_homes and organizations

CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  care_home_id UUID NOT NULL REFERENCES public.care_homes(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  team_id UUID NOT NULL, -- References auth.teams.id (Supabase Auth)
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_units_care_home ON public.units(care_home_id);
CREATE INDEX idx_units_org ON public.units(organization_id);
CREATE INDEX idx_units_team ON public.units(team_id);

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
-- Created FOURTH - depends on units and care_homes

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  image_url TEXT,
  phone TEXT,
  is_onboarding_complete BOOLEAN DEFAULT false,
  active_team_id UUID,
  active_unit_id UUID REFERENCES public.units(id),
  active_care_home_id UUID REFERENCES public.care_homes(id),
  is_saas_admin BOOLEAN DEFAULT false,
  
  -- Staff details
  address TEXT,
  date_of_join DATE,
  work_permit_status TEXT CHECK (work_permit_status IN ('citizen', 'work_permit')),
  visa_expiry_date DATE,
  right_to_work_status TEXT CHECK (right_to_work_status IN ('verified', 'pending', 'expired', 'not_verified')),
  
  -- Professional registration
  niscc_registration_number TEXT,
  niscc_expiry_date DATE,
  rn_number TEXT,
  
  -- Next of kin
  next_of_kin_name TEXT,
  next_of_kin_relationship TEXT,
  next_of_kin_phone TEXT,
  next_of_kin_email TEXT,
  next_of_kin_address TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_active_team ON public.profiles(active_team_id);
CREATE INDEX idx_profiles_active_unit ON public.profiles(active_unit_id);
CREATE INDEX idx_profiles_active_care_home ON public.profiles(active_care_home_id);
CREATE INDEX idx_profiles_saas_admin ON public.profiles(is_saas_admin) WHERE is_saas_admin = true;

-- ============================================
-- UNIT STAFF
-- ============================================

CREATE TABLE public.unit_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL CHECK (role IN ('nurse', 'care_assistant')),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE(unit_id, user_id)
);

CREATE INDEX idx_unit_staff_unit ON public.unit_staff(unit_id);
CREATE INDEX idx_unit_staff_user ON public.unit_staff(user_id);

-- ============================================
-- TEAM MEMBERS (junction table)
-- ============================================

CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL, -- References auth.teams.id
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT, -- Denormalized from auth.members.role
  email TEXT, -- Fallback lookup
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE(user_id, team_id)
);

CREATE INDEX idx_team_members_user ON public.team_members(user_id);
CREATE INDEX idx_team_members_team ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_team ON public.team_members(user_id, team_id);
CREATE INDEX idx_team_members_org ON public.team_members(organization_id);

-- ============================================
-- RESIDENTS
-- ============================================

CREATE TABLE public.residents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  image_url TEXT,
  phone_number TEXT,
  room_number TEXT,
  admission_date DATE NOT NULL,
  nhs_health_number TEXT,
  
  status resident_status DEFAULT 'active',
  discharge_date TIMESTAMPTZ,
  discharge_reason TEXT,
  data_retention_until TIMESTAMPTZ,
  
  -- GP Details
  gp_name TEXT,
  gp_address TEXT,
  gp_phone TEXT,
  
  -- Care Manager Details
  care_manager_name TEXT,
  care_manager_address TEXT,
  care_manager_phone TEXT,
  
  -- Health Information (JSONB for flexibility)
  health_conditions JSONB, -- Array of strings or objects
  risks JSONB, -- Array of strings or objects with level
  dependencies JSONB, -- Object or array of strings
  
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id UUID NOT NULL, -- References auth.teams.id
  team_name TEXT, -- Denormalized
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_residents_org ON public.residents(organization_id);
CREATE INDEX idx_residents_team ON public.residents(team_id);
CREATE INDEX idx_residents_created_by ON public.residents(created_by);
CREATE INDEX idx_residents_room ON public.residents(room_number);
CREATE INDEX idx_residents_full_name ON public.residents(first_name, last_name);
CREATE INDEX idx_residents_active ON public.residents(is_active);
CREATE INDEX idx_residents_status ON public.residents(status);
CREATE INDEX idx_residents_team_status ON public.residents(team_id, status);

-- ============================================
-- EMERGENCY CONTACTS
-- ============================================

CREATE TABLE public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  relationship TEXT NOT NULL,
  address TEXT,
  is_primary BOOLEAN DEFAULT false,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_emergency_contacts_resident ON public.emergency_contacts(resident_id);
CREATE INDEX idx_emergency_contacts_org ON public.emergency_contacts(organization_id);
CREATE INDEX idx_emergency_contacts_primary ON public.emergency_contacts(is_primary) WHERE is_primary = true;

-- ============================================
-- MEDICATIONS
-- ============================================

CREATE TABLE public.medications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resident_id UUID REFERENCES public.residents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  strength TEXT NOT NULL,
  strength_unit TEXT NOT NULL CHECK (strength_unit IN ('mg', 'g')),
  total_count INTEGER NOT NULL,
  dosage_form TEXT NOT NULL CHECK (dosage_form IN (
    'Tablet', 'Capsule', 'Liquid', 'Injection', 'Cream', 
    'Ointment', 'Patch', 'Inhaler'
  )),
  route TEXT NOT NULL CHECK (route IN (
    'Oral', 'Topical', 'Intramuscular (IM)', 'Intravenous (IV)',
    'Subcutaneous', 'Inhalation', 'Rectal', 'Sublingual'
  )),
  frequency TEXT NOT NULL CHECK (frequency IN (
    'Once daily (OD)', 'Twice daily (BD)', 'Three times daily (TD)',
    'Four times daily (QDS)', 'Four times daily (QIS)', 'As Needed (PRN)',
    'One time (STAT)', 'Weekly', 'Monthly'
  )),
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('Scheduled', 'PRN (As Needed)')),
  times TEXT[], -- Array of time strings
  time_quantities JSONB, -- Record of time -> quantity
  instructions TEXT,
  prescriber_name TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  status medication_status NOT NULL DEFAULT 'active',
  
  -- Controlled Drug fields
  is_controlled_drug BOOLEAN DEFAULT false,
  controlled_drug_schedule TEXT CHECK (controlled_drug_schedule IN ('2', '3', '4', '5')),
  
  -- PRN Safety Limits
  min_interval_hours INTEGER,
  max_daily_dose NUMERIC,
  max_daily_dose_unit TEXT,
  
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  team_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_medications_team ON public.medications(team_id);
CREATE INDEX idx_medications_resident ON public.medications(resident_id);
CREATE INDEX idx_medications_status ON public.medications(status);
CREATE INDEX idx_medications_org ON public.medications(organization_id);

-- ============================================
-- MEDICATION INTAKES
-- ============================================

CREATE TABLE public.medication_intakes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMPTZ NOT NULL,
  popped_out_at TIMESTAMPTZ,
  popped_out_by_user_id UUID REFERENCES auth.users(id),
  state intake_state NOT NULL DEFAULT 'scheduled',
  state_modified_by_user_id UUID REFERENCES auth.users(id),
  state_modified_at TIMESTAMPTZ,
  witness_by_user_id UUID REFERENCES auth.users(id),
  witness_at TIMESTAMPTZ,
  second_witness_by_user_id UUID REFERENCES auth.users(id),
  second_witness_at TIMESTAMPTZ,
  administrator_user_id UUID REFERENCES auth.users(id),
  administrator_at TIMESTAMPTZ,
  is_destroyed BOOLEAN DEFAULT false,
  destruction_witness_user_id UUID REFERENCES auth.users(id),
  destruction_reason TEXT,
  destruction_at TIMESTAMPTZ,
  notes TEXT,
  team_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_medication_intakes_medication ON public.medication_intakes(medication_id);
CREATE INDEX idx_medication_intakes_resident ON public.medication_intakes(resident_id);
CREATE INDEX idx_medication_intakes_scheduled_time ON public.medication_intakes(scheduled_time);
CREATE INDEX idx_medication_intakes_state ON public.medication_intakes(state);
CREATE INDEX idx_medication_intakes_team ON public.medication_intakes(team_id);
CREATE INDEX idx_medication_intakes_org ON public.medication_intakes(organization_id);
CREATE INDEX idx_medication_intakes_popped_out_by ON public.medication_intakes(popped_out_by_user_id);
CREATE INDEX idx_medication_intakes_state_modified_by ON public.medication_intakes(state_modified_by_user_id);

-- ============================================
-- FOOD & FLUID LOGS
-- ============================================

CREATE TABLE public.food_fluid_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('midnight-7am', '7am-12pm', '12pm-5pm', '5pm-midnight')),
  exact_time TEXT, -- HH:MM format
  type_of_food_drink TEXT NOT NULL,
  portion_served TEXT NOT NULL,
  amount_eaten TEXT CHECK (amount_eaten IN ('None', '1/4', '1/2', '3/4', 'All')),
  fluid_consumed_ml INTEGER,
  signature TEXT NOT NULL,
  date DATE NOT NULL, -- For easier querying
  
  -- Archival and retention (UK Healthcare: 7 years)
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  retention_period_years INTEGER DEFAULT 7,
  scheduled_deletion_at TIMESTAMPTZ,
  is_read_only BOOLEAN DEFAULT false,
  
  -- Schema versioning
  schema_version INTEGER DEFAULT 1,
  
  -- GDPR compliance
  consent_to_store BOOLEAN,
  data_processing_basis TEXT,
  
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_food_fluid_logs_resident ON public.food_fluid_logs(resident_id);
CREATE INDEX idx_food_fluid_logs_resident_date ON public.food_fluid_logs(resident_id, date);
CREATE INDEX idx_food_fluid_logs_date_archived ON public.food_fluid_logs(date, is_archived);
CREATE INDEX idx_food_fluid_logs_org ON public.food_fluid_logs(organization_id);
CREATE INDEX idx_food_fluid_logs_section ON public.food_fluid_logs(section);
CREATE INDEX idx_food_fluid_logs_signature ON public.food_fluid_logs(signature);
CREATE INDEX idx_food_fluid_logs_resident_timestamp ON public.food_fluid_logs(resident_id, timestamp);
CREATE INDEX idx_food_fluid_logs_resident_archived ON public.food_fluid_logs(resident_id, is_archived, timestamp);
CREATE INDEX idx_food_fluid_logs_org_date ON public.food_fluid_logs(organization_id, date);
CREATE INDEX idx_food_fluid_logs_archived_date ON public.food_fluid_logs(is_archived, archived_at);
CREATE INDEX idx_food_fluid_logs_scheduled_deletion ON public.food_fluid_logs(scheduled_deletion_at);
CREATE INDEX idx_food_fluid_logs_retention ON public.food_fluid_logs(retention_period_years, created_at);

-- ============================================
-- ALERTS
-- ============================================

CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  alert_type alert_type NOT NULL,
  severity alert_severity NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_period TEXT CHECK (time_period IN ('morning', 'afternoon', 'evening', 'night')),
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_note TEXT,
  auto_resolved BOOLEAN DEFAULT false,
  metadata JSONB,
  target_roles TEXT[], -- Array of roles that should see this alert
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_resident ON public.alerts(resident_id);
CREATE INDEX idx_alerts_type ON public.alerts(alert_type);
CREATE INDEX idx_alerts_severity ON public.alerts(severity);
CREATE INDEX idx_alerts_resolved ON public.alerts(is_resolved);
CREATE INDEX idx_alerts_timestamp ON public.alerts(timestamp);
CREATE INDEX idx_alerts_resident_type ON public.alerts(resident_id, alert_type);
CREATE INDEX idx_alerts_resident_resolved ON public.alerts(resident_id, is_resolved);
CREATE INDEX idx_alerts_org ON public.alerts(organization_id);
CREATE INDEX idx_alerts_team ON public.alerts(team_id);

-- ============================================
-- INVITATIONS
-- ============================================

CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  role user_role NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  care_home_id UUID REFERENCES public.care_homes(id),
  unit_ids UUID[], -- Array of unit IDs
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  status invitation_status NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_org ON public.invitations(organization_id);
CREATE INDEX idx_invitations_expires_at ON public.invitations(expires_at);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get user's role from auth.users.app_metadata
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
  SELECT COALESCE(
    (auth.users.raw_app_meta_data->>'role')::TEXT,
    'member'
  )
  FROM auth.users
  WHERE auth.users.id = user_uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to get user's active organization from session
CREATE OR REPLACE FUNCTION public.get_active_organization_id(user_uuid UUID)
RETURNS UUID AS $$
  SELECT (auth.users.raw_app_meta_data->>'active_organization_id')::UUID
  FROM auth.users
  WHERE auth.users.id = user_uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to check if user is SaaS Admin
CREATE OR REPLACE FUNCTION public.is_saas_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (auth.users.raw_app_meta_data->>'is_saas_admin')::BOOLEAN,
    false
  )
  FROM auth.users
  WHERE auth.users.id = user_uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to get user's active unit ID
CREATE OR REPLACE FUNCTION public.get_active_unit_id(user_uuid UUID)
RETURNS UUID AS $$
  SELECT p.active_unit_id
  FROM public.profiles p
  WHERE p.id = user_uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to check if user can access organization
CREATE OR REPLACE FUNCTION public.can_access_organization(
  user_uuid UUID,
  org_uuid UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- SaaS Admin can access all
  IF public.is_saas_admin(user_uuid) THEN
    RETURN true;
  END IF;
  
  -- Check if user is a member of this organization
  RETURN EXISTS (
    SELECT 1
    FROM auth.members m
    WHERE m.user_id = user_uuid
      AND m.organization_id = org_uuid::TEXT
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user can access care home
CREATE OR REPLACE FUNCTION public.can_access_care_home(
  user_uuid UUID,
  care_home_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role_val TEXT;
  org_uuid UUID;
  care_home_org UUID;
BEGIN
  -- SaaS Admin can access all
  IF public.is_saas_admin(user_uuid) THEN
    RETURN true;
  END IF;
  
  user_role_val := public.get_user_role(user_uuid);
  org_uuid := public.get_active_organization_id(user_uuid);
  
  -- Get care home's organization
  SELECT organization_id INTO care_home_org
  FROM public.care_homes
  WHERE id = care_home_uuid;
  
  -- Must be in same organization
  IF org_uuid != care_home_org THEN
    RETURN false;
  END IF;
  
  -- Owner can access all care homes in org
  IF user_role_val = 'owner' THEN
    RETURN true;
  END IF;
  
  -- Manager can only access assigned care homes
  IF user_role_val = 'manager' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.care_home_managers chm
      WHERE chm.care_home_id = care_home_uuid
        AND chm.user_id = user_uuid
    );
  END IF;
  
  -- Nurse/Care Assistant can access if their unit belongs to this care home
  IF user_role_val IN ('nurse', 'care_assistant') THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.units u ON u.id = p.active_unit_id
      WHERE p.id = user_uuid
        AND u.care_home_id = care_home_uuid
    );
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user can access unit
CREATE OR REPLACE FUNCTION public.can_access_unit(
  user_uuid UUID,
  unit_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role_val TEXT;
  org_uuid UUID;
  unit_org UUID;
BEGIN
  -- SaaS Admin can access all
  IF public.is_saas_admin(user_uuid) THEN
    RETURN true;
  END IF;
  
  user_role_val := public.get_user_role(user_uuid);
  org_uuid := public.get_active_organization_id(user_uuid);
  
  -- Get unit's organization
  SELECT organization_id INTO unit_org
  FROM public.units
  WHERE id = unit_uuid;
  
  -- Must be in same organization
  IF org_uuid != unit_org THEN
    RETURN false;
  END IF;
  
  -- Owner can access all units in org
  IF user_role_val = 'owner' THEN
    RETURN true;
  END IF;
  
  -- Manager can access units in care homes they manage
  IF user_role_val = 'manager' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.units u
      JOIN public.care_home_managers chm ON chm.care_home_id = u.care_home_id
      WHERE u.id = unit_uuid
        AND chm.user_id = user_uuid
    );
  END IF;
  
  -- Nurse/Care Assistant can only access their active unit
  IF user_role_val IN ('nurse', 'care_assistant') THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = user_uuid
        AND p.active_unit_id = unit_uuid
    );
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_residents_updated_at
  BEFORE UPDATE ON public.residents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_medication_intakes_updated_at
  BEFORE UPDATE ON public.medication_intakes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_food_fluid_logs_updated_at
  BEFORE UPDATE ON public.food_fluid_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_fluid_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "SaaS Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_saas_admin(auth.uid()));

CREATE POLICY "Managers can read org profiles"
  ON public.profiles FOR SELECT
  USING (
    public.get_user_role(auth.uid()) IN ('owner', 'manager')
    AND EXISTS (
      SELECT 1 FROM auth.members m
      WHERE m.user_id = auth.uid()
        AND m.organization_id = public.get_active_organization_id(auth.uid())::TEXT
    )
  );

-- Organizations RLS
CREATE POLICY "Users can read own organizations"
  ON public.organizations FOR SELECT
  USING (
    public.can_access_organization(auth.uid(), id)
    OR public.is_saas_admin(auth.uid())
  );

-- Care Homes RLS
CREATE POLICY "Users can read org care homes"
  ON public.care_homes FOR SELECT
  USING (public.can_access_organization(auth.uid(), organization_id));

CREATE POLICY "Owners can create care homes"
  ON public.care_homes FOR INSERT
  WITH CHECK (
    public.get_user_role(auth.uid()) = 'owner'
    AND public.can_access_organization(auth.uid(), organization_id)
  );

-- Units RLS
CREATE POLICY "Users can read accessible units"
  ON public.units FOR SELECT
  USING (
    public.can_access_organization(auth.uid(), organization_id)
    AND (
      public.get_user_role(auth.uid()) IN ('owner', 'manager')
      OR public.can_access_unit(auth.uid(), id)
    )
  );

CREATE POLICY "Managers can create units"
  ON public.units FOR INSERT
  WITH CHECK (
    public.get_user_role(auth.uid()) = 'manager'
    AND public.can_access_care_home(auth.uid(), care_home_id)
  );

-- Residents RLS
CREATE POLICY "Users can read residents in org"
  ON public.residents FOR SELECT
  USING (
    public.can_access_organization(auth.uid(), organization_id)
  );

CREATE POLICY "Authorized users can create residents"
  ON public.residents FOR INSERT
  WITH CHECK (
    public.can_access_organization(auth.uid(), organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')
  );

CREATE POLICY "Authorized users can update residents"
  ON public.residents FOR UPDATE
  USING (
    public.can_access_organization(auth.uid(), organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager')
  )
  WITH CHECK (
    public.can_access_organization(auth.uid(), organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager')
  );

-- Medications RLS
CREATE POLICY "Users can read medications"
  ON public.medications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = medications.resident_id
        AND public.can_access_organization(auth.uid(), r.organization_id)
    )
  );

CREATE POLICY "Authorized users can create medications"
  ON public.medications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = medications.resident_id
        AND public.can_access_organization(auth.uid(), r.organization_id)
    )
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')
  );

-- Medication Intakes RLS
CREATE POLICY "Users can read medication intakes"
  ON public.medication_intakes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = medication_intakes.resident_id
        AND public.can_access_organization(auth.uid(), r.organization_id)
    )
  );

CREATE POLICY "Authorized users can create medication intakes"
  ON public.medication_intakes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = medication_intakes.resident_id
        AND public.can_access_organization(auth.uid(), r.organization_id)
    )
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')
  );

-- Food & Fluid Logs RLS
CREATE POLICY "Users can read food fluid logs"
  ON public.food_fluid_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = food_fluid_logs.resident_id
        AND public.can_access_organization(auth.uid(), r.organization_id)
    )
  );

CREATE POLICY "Users can create food fluid logs"
  ON public.food_fluid_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = food_fluid_logs.resident_id
        AND public.can_access_organization(auth.uid(), r.organization_id)
    )
  );

CREATE POLICY "Users can update non-archived logs"
  ON public.food_fluid_logs FOR UPDATE
  USING (
    is_read_only = false
    AND EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = food_fluid_logs.resident_id
        AND public.can_access_organization(auth.uid(), r.organization_id)
    )
  );

-- Alerts RLS
CREATE POLICY "Users can read relevant alerts"
  ON public.alerts FOR SELECT
  USING (
    public.can_access_organization(auth.uid(), organization_id)
    AND (
      target_roles IS NULL
      OR array_length(target_roles, 1) IS NULL
      OR public.get_user_role(auth.uid()) = ANY(target_roles)
      OR public.get_user_role(auth.uid()) IN ('owner', 'manager')
    )
  );

-- Emergency Contacts RLS
CREATE POLICY "Users can read emergency contacts"
  ON public.emergency_contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = emergency_contacts.resident_id
        AND public.can_access_organization(auth.uid(), r.organization_id)
    )
  );

CREATE POLICY "Authorized users can create emergency contacts"
  ON public.emergency_contacts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = emergency_contacts.resident_id
        AND public.can_access_organization(auth.uid(), r.organization_id)
    )
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')
  );

-- Invitations RLS
CREATE POLICY "Users can read org invitations"
  ON public.invitations FOR SELECT
  USING (
    public.can_access_organization(auth.uid(), organization_id)
    OR public.is_saas_admin(auth.uid())
  );

CREATE POLICY "Authorized users can create invitations"
  ON public.invitations FOR INSERT
  WITH CHECK (
    public.can_access_organization(auth.uid(), organization_id)
    AND public.get_user_role(auth.uid()) IN ('saas_admin', 'owner', 'manager')
  );
