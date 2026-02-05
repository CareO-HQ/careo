-- ============================================
-- CareO: Complete Supabase Migration Schema
-- ============================================
-- This file contains SQL for ALL tables needed for Supabase migration
-- Generated based on SUPABASE_MIGRATION_BLUEPRINT.md and existing schema
-- ============================================

-- ============================================
-- EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- ENUMS
-- ============================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM (
      'saas_admin',
      'owner',
      'manager',
      'nurse',
      'care_assistant'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resident_status') THEN
    CREATE TYPE resident_status AS ENUM (
      'active',
      'discharged',
      'deceased',
      'transferred',
      'hospital'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
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
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shift_type') THEN
    CREATE TYPE shift_type AS ENUM ('AM', 'PM', 'Night');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'medication_status') THEN
    CREATE TYPE medication_status AS ENUM ('active', 'completed', 'cancelled');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'intake_state') THEN
    CREATE TYPE intake_state AS ENUM (
      'scheduled',
      'dispensed',
      'administered',
      'given',
      'refused',
      'missed',
      'skipped'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_type') THEN
    CREATE TYPE alert_type AS ENUM (
      'food_fluid',
      'night_check',
      'medication',
      'activity',
      'vital_signs',
      'care_plan'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_severity') THEN
    CREATE TYPE alert_severity AS ENUM ('critical', 'warning', 'info');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organization_status') THEN
    CREATE TYPE organization_status AS ENUM ('active', 'suspended', 'deactivated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_status') THEN
    CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'revoked');
  END IF;
END $$;

-- ============================================
-- ORGANIZATIONS
-- ============================================

CREATE TABLE public.organizations (
  id UUID PRIMARY KEY,
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
-- UNITS
-- ============================================

CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  care_home_id UUID NOT NULL REFERENCES public.care_homes(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  team_id UUID NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_units_care_home ON public.units(care_home_id);
CREATE INDEX idx_units_org ON public.units(organization_id);
CREATE INDEX idx_units_team ON public.units(team_id);

-- ============================================
-- PROFILES
-- ============================================

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
-- TEAM MEMBERS
-- ============================================

CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT,
  email TEXT,
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
  health_conditions JSONB,
  risks JSONB,
  dependencies JSONB,
  
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,
  team_name TEXT,
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
  dosage_form TEXT NOT NULL CHECK (
    dosage_form IN (
      'Tablet', 'Capsule', 'Liquid', 'Injection', 'Cream', 
      'Ointment', 'Patch', 'Inhaler'
    )
  ),
  route TEXT NOT NULL CHECK (
    route IN (
      'Oral', 'Topical', 'Intramuscular (IM)', 'Intravenous (IV)',
      'Subcutaneous', 'Inhalation', 'Rectal', 'Sublingual'
    )
  ),
  frequency TEXT NOT NULL CHECK (
    frequency IN (
      'Once daily (OD)', 'Twice daily (BD)', 'Three times daily (TD)',
      'Four times daily (QDS)', 'Four times daily (QIS)', 'As Needed (PRN)',
      'One time (STAT)', 'Weekly', 'Monthly'
    )
  ),
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('Scheduled', 'PRN (As Needed)')),
  times TEXT[],
  time_quantities JSONB,
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
  exact_time TEXT,
  type_of_food_drink TEXT NOT NULL,
  portion_served TEXT NOT NULL,
  amount_eaten TEXT CHECK (amount_eaten IN ('None', '1/4', '1/2', '3/4', 'All')),
  fluid_consumed_ml INTEGER,
  signature TEXT NOT NULL,
  date DATE NOT NULL,
  
  -- Archival and retention
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
  target_roles TEXT[],
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
  unit_ids UUID[],
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
-- PRE-ADMISSION CARE FILES
-- ============================================

CREATE TABLE public.pre_admission_care_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  saved_as_draft BOOLEAN NOT NULL DEFAULT false,
  
  -- Header information
  consent_accepted_at TIMESTAMPTZ NOT NULL,
  care_home_name TEXT NOT NULL,
  nhs_health_care_number TEXT NOT NULL,
  user_name TEXT NOT NULL,
  job_role TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  
  -- Resident information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  ethnicity TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female')),
  religion TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  
  -- Next of kin
  kin_first_name TEXT NOT NULL,
  kin_last_name TEXT NOT NULL,
  kin_relationship TEXT NOT NULL,
  kin_phone_number TEXT NOT NULL,
  
  -- Professional contacts
  care_manager_name TEXT NOT NULL,
  care_manager_phone_number TEXT NOT NULL,
  district_nurse_name TEXT NOT NULL,
  district_nurse_phone_number TEXT NOT NULL,
  general_practitioner_name TEXT NOT NULL,
  general_practitioner_phone_number TEXT NOT NULL,
  provider_healthcare_info_name TEXT NOT NULL,
  provider_healthcare_info_designation TEXT NOT NULL,
  
  -- Medical information
  allergies TEXT,
  medical_history TEXT,
  medication_prescribed TEXT,
  
  -- Assessment fields
  consent_capacity_rights TEXT,
  medication TEXT,
  mobility TEXT,
  nutrition TEXT,
  continence TEXT,
  hygiene_dressing TEXT,
  skin TEXT,
  cognition TEXT,
  infection TEXT,
  breathing TEXT,
  altered_state_of_consciousness TEXT,
  
  -- Palliative and End of life care
  dnacpr BOOLEAN NOT NULL,
  advanced_decision BOOLEAN NOT NULL,
  capacity BOOLEAN NOT NULL,
  advanced_care_plan BOOLEAN NOT NULL,
  comments TEXT,
  
  -- Preferences
  room_preferences TEXT,
  admission_contact TEXT,
  food_preferences TEXT,
  preferred_name TEXT,
  family_concerns TEXT,
  
  -- Other information
  other_health_care_professional TEXT,
  equipment TEXT,
  
  -- Financial
  attend_finances BOOLEAN NOT NULL,
  
  -- Additional considerations
  additional_considerations TEXT,
  
  -- Outcome
  outcome TEXT,
  planned_admission_date TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  pdf_file_id UUID
);

CREATE INDEX idx_pre_admission_resident ON public.pre_admission_care_files(resident_id);
CREATE INDEX idx_pre_admission_org ON public.pre_admission_care_files(organization_id);
CREATE INDEX idx_pre_admission_team ON public.pre_admission_care_files(team_id);

-- ============================================
-- ADMISSION ASSESSMENTS
-- ============================================

CREATE TABLE public.admission_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Resident information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth TIMESTAMPTZ NOT NULL,
  bedroom_number TEXT NOT NULL,
  admitted_from TEXT,
  religion TEXT,
  telephone_number TEXT,
  gender TEXT CHECK (gender IN ('MALE', 'FEMALE')),
  nhs_number TEXT NOT NULL,
  ethnicity TEXT,
  
  -- Next of kin
  kin_first_name TEXT NOT NULL,
  kin_last_name TEXT NOT NULL,
  kin_relationship TEXT NOT NULL,
  kin_telephone_number TEXT NOT NULL,
  kin_address TEXT NOT NULL,
  kin_email TEXT NOT NULL,
  
  -- Emergency contacts
  emergency_contact_name TEXT NOT NULL,
  emergency_contact_telephone_number TEXT NOT NULL,
  emergency_contact_relationship TEXT NOT NULL,
  emergency_contact_phone_number TEXT NOT NULL,
  
  -- Care manager
  care_manager_name TEXT,
  care_manager_telephone_number TEXT,
  care_manager_relationship TEXT,
  care_manager_phone_number TEXT,
  care_manager_address TEXT,
  care_manager_job_role TEXT,
  
  -- GP
  gp_name TEXT,
  gp_address TEXT,
  gp_phone_number TEXT,
  
  -- Medical
  allergies TEXT,
  medical_history TEXT,
  prescribed_medications TEXT,
  consent_capacity_rights TEXT,
  medication TEXT,
  
  -- Skin integrity
  skin_integrity_equipment TEXT,
  skin_integrity_wounds TEXT,
  
  -- Sleep
  bedtime_routine TEXT,
  
  -- Infection control
  current_infection TEXT,
  antibiotics_prescribed BOOLEAN NOT NULL,
  
  -- Breathing
  prescribed_breathing TEXT,
  
  -- Mobility
  mobility_independent BOOLEAN NOT NULL,
  assistance_required TEXT,
  equipment_required TEXT,
  
  -- Nutrition
  weight TEXT NOT NULL,
  height TEXT NOT NULL,
  iddsi_food TEXT NOT NULL,
  iddsi_fluid TEXT NOT NULL,
  diet_type TEXT NOT NULL,
  nutritional_supplements TEXT,
  nutritional_assistance_required TEXT,
  choking_risk BOOLEAN NOT NULL,
  additional_comments TEXT,
  
  -- Continence
  continence TEXT,
  
  -- Hygiene
  hygiene TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admission_assessments_resident ON public.admission_assessments(resident_id);
CREATE INDEX idx_admission_assessments_org ON public.admission_assessments(organization_id);
CREATE INDEX idx_admission_assessments_team ON public.admission_assessments(team_id);

-- ============================================
-- INFECTION PREVENTION ASSESSMENTS
-- ============================================

CREATE TABLE public.infection_prevention_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Person's details
  name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  home_address TEXT NOT NULL,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('Pre-admission', 'Admission')),
  information_provided_by TEXT,
  admitted_from TEXT,
  consultant_gp TEXT,
  reason_for_admission TEXT,
  date_of_admission DATE,
  
  -- Acute Respiratory Illness (ARI)
  new_continuous_cough BOOLEAN NOT NULL,
  worsening_cough BOOLEAN NOT NULL,
  temperature_high BOOLEAN NOT NULL,
  other_respiratory_symptoms TEXT,
  tested_for_covid19 BOOLEAN NOT NULL,
  tested_for_influenza_a BOOLEAN NOT NULL,
  tested_for_influenza_b BOOLEAN NOT NULL,
  tested_for_respiratory_screen BOOLEAN NOT NULL,
  influenza_b BOOLEAN NOT NULL,
  respiratory_screen BOOLEAN NOT NULL,
  exposure_to_patients_covid BOOLEAN NOT NULL,
  exposure_to_staff_covid BOOLEAN NOT NULL,
  isolation_required BOOLEAN NOT NULL,
  isolation_details TEXT,
  further_treatment_required BOOLEAN NOT NULL,
  
  -- Infective Diarrhoea / Vomiting
  diarrhea_vomiting_current_symptoms BOOLEAN NOT NULL,
  diarrhea_vomiting_contact_with_others BOOLEAN NOT NULL,
  diarrhea_vomiting_family_history_72h BOOLEAN NOT NULL,
  
  -- Clostridium Difficile
  clostridium_active BOOLEAN NOT NULL,
  clostridium_history BOOLEAN NOT NULL,
  clostridium_stool_count_72h TEXT,
  clostridium_last_positive_specimen_date DATE,
  clostridium_result TEXT,
  clostridium_treatment_received TEXT,
  clostridium_treatment_complete BOOLEAN,
  ongoing_details TEXT,
  ongoing_date_commenced DATE,
  ongoing_length_of_course TEXT,
  ongoing_follow_up_required TEXT,
  
  -- MRSA / MSSA
  mrsa_mssa_colonised BOOLEAN NOT NULL,
  mrsa_mssa_infected BOOLEAN NOT NULL,
  mrsa_mssa_last_positive_swab_date DATE,
  mrsa_mssa_sites_positive TEXT,
  mrsa_mssa_treatment_received TEXT,
  mrsa_mssa_treatment_complete TEXT,
  mrsa_mssa_details TEXT,
  mrsa_mssa_date_commenced DATE,
  mrsa_mssa_length_of_course TEXT,
  mrsa_mssa_follow_up_required TEXT,
  
  -- Multi-drug resistant organisms
  esbl BOOLEAN NOT NULL,
  vre_gre BOOLEAN NOT NULL,
  cpe BOOLEAN NOT NULL,
  other_multi_drug_resistance TEXT,
  relevant_information_multi_drug_resistance TEXT,
  
  -- Other Information
  awareness_of_infection BOOLEAN NOT NULL,
  last_flu_vaccination_date DATE,
  
  -- Assessment Completion
  completed_by TEXT NOT NULL,
  job_role TEXT NOT NULL,
  signature TEXT NOT NULL,
  completion_date DATE NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id),
  saved_as_draft BOOLEAN DEFAULT false,
  pdf_file_id UUID
);

CREATE INDEX idx_infection_prevention_resident ON public.infection_prevention_assessments(resident_id);
CREATE INDEX idx_infection_prevention_team ON public.infection_prevention_assessments(team_id);
CREATE INDEX idx_infection_prevention_org ON public.infection_prevention_assessments(organization_id);
CREATE INDEX idx_infection_prevention_type ON public.infection_prevention_assessments(assessment_type);
CREATE INDEX idx_infection_prevention_completion_date ON public.infection_prevention_assessments(completion_date);

-- ============================================
-- BLADDER BOWEL ASSESSMENTS
-- ============================================

CREATE TABLE public.bladder_bowel_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Section 1 - Resident info
  resident_name TEXT NOT NULL,
  date_of_birth TIMESTAMPTZ NOT NULL,
  bedroom_number TEXT NOT NULL,
  information_obtained_from TEXT NOT NULL,
  
  -- Section 2 - Infections
  hepatitis_ab BOOLEAN,
  blood_borne_viruses BOOLEAN,
  mrsa BOOLEAN,
  esbl BOOLEAN,
  other TEXT,
  
  -- Section 3 - Urinalysis on Admission
  ph BOOLEAN,
  nitrates BOOLEAN,
  protein BOOLEAN,
  leucocytes BOOLEAN,
  glucose BOOLEAN,
  blood_result BOOLEAN,
  mssu_date TIMESTAMPTZ,
  
  -- Section 4 - Prescribed medication
  anti_hypertensives BOOLEAN,
  anti_parkinson_drugs BOOLEAN,
  iron_supplement BOOLEAN,
  laxatives BOOLEAN,
  diuretics BOOLEAN,
  histamine BOOLEAN,
  anti_depressants BOOLEAN,
  cholinergic BOOLEAN,
  sedatives_hypnotic BOOLEAN,
  anti_psychotic BOOLEAN,
  antihistamines BOOLEAN,
  narcotic_analgesics BOOLEAN,
  
  -- Section 5 - Lifestyle
  caffeine_mls_24h INTEGER,
  caffeine_frequency TEXT,
  caffeine_time_of_day TEXT,
  exercise_type TEXT,
  exercise_frequency TEXT,
  exercise_time_of_day TEXT,
  alcohol_amount_24h INTEGER,
  alcohol_frequency TEXT,
  alcohol_time_of_day TEXT,
  smoking TEXT NOT NULL CHECK (smoking IN ('SMOKER', 'NON-SMOKER', 'EX-SMOKER')),
  weight TEXT NOT NULL CHECK (weight IN ('NORMAL', 'OBESE', 'UNDERWEIGHT')),
  skin_condition TEXT NOT NULL CHECK (skin_condition IN ('HEALTHY', 'RED', 'EXCORIATED', 'BROKEN')),
  constipation_history BOOLEAN,
  mental_state TEXT NOT NULL CHECK (mental_state IN ('ALERT', 'CONFUSED', 'LEARNING-DISABLED', 'COGNITIVELY-IMPAIRED')),
  mobility_issues TEXT NOT NULL CHECK (mobility_issues IN ('INDEPENDENT', 'ASSISTANCE', 'HOISTED')),
  history_recurrent_utis BOOLEAN,
  
  -- Section 6 - Urinary continence
  incontinence TEXT NOT NULL CHECK (incontinence IN ('NONE', 'ONE', '1-2DAY', '3DAY', 'NIGHT', 'DAYANDNIGHT')),
  volume TEXT NOT NULL CHECK (volume IN ('ENTIRE-BLADDER', 'SMALL-VOL', 'UNABLE-DETERMINE')),
  onset TEXT NOT NULL CHECK (onset IN ('SUDDEN', 'GRADUAL')),
  duration TEXT NOT NULL CHECK (duration IN ('LESS-6M', '6M-1Y', 'MORE-1Y')),
  symptoms_last_six TEXT NOT NULL CHECK (symptoms_last_six IN ('STABLE', 'WORSENING', 'IMPROVING', 'FLUCTUATING')),
  physician_consulted BOOLEAN,
  
  -- Section 7 - Bowel pattern
  bowel_state TEXT NOT NULL CHECK (bowel_state IN ('NORMAL', 'CONSTIPATION', 'DIARRHOEA', 'STOMA', 'FAECAL-INCONTINENCE', 'IRRITABLE-BOWEL')),
  bowel_frequency TEXT NOT NULL,
  usual_time_of_day TEXT NOT NULL,
  amount_and_stool_type TEXT NOT NULL,
  liquid_feeds TEXT NOT NULL,
  other_factors TEXT NOT NULL,
  other_remedies TEXT NOT NULL,
  medical_officer_consulted BOOLEAN,
  
  -- Section 8 - Current toileting pattern
  day_pattern TEXT NOT NULL CHECK (day_pattern IN ('TOILET', 'COMMODE', 'BED-PAN', 'URINAL')),
  evening_pattern TEXT NOT NULL CHECK (evening_pattern IN ('TOILET', 'COMMODE', 'BED-PAN', 'URINAL')),
  night_pattern TEXT NOT NULL CHECK (night_pattern IN ('TOILET', 'COMMODE', 'BED-PAN', 'URINAL')),
  types_of_pads TEXT NOT NULL,
  
  -- Section 9 - Symptoms
  leak_cough_laugh BOOLEAN,
  leak_standing_up BOOLEAN,
  leak_upstairs_downhill BOOLEAN,
  passes_urine_frequently BOOLEAN,
  desire_pass_urine BOOLEAN,
  leaks_before_toilet BOOLEAN,
  more_than_twice_at_night BOOLEAN,
  anxiety BOOLEAN,
  difficulty_starting BOOLEAN,
  hesitancy BOOLEAN,
  dribbles BOOLEAN,
  feels_full BOOLEAN,
  recurrent_tract_infections BOOLEAN,
  limited_mobility BOOLEAN,
  unable_on_time BOOLEAN,
  not_hold_urinal_or_seat BOOLEAN,
  not_use_call_bell BOOLEAN,
  poor_vision BOOLEAN,
  assisted_transfer BOOLEAN,
  pain BOOLEAN,
  
  -- Section 10
  bladder_continent BOOLEAN,
  bladder_incontinent BOOLEAN,
  bladder_incontinent_type TEXT CHECK (bladder_incontinent_type IN ('STRESS', 'URGE', 'MIXED', 'FUNCTIONAL')),
  bladder_plan_commenced BOOLEAN,
  bladder_referral_required TEXT CHECK (bladder_referral_required IN ('DIETICIAN', 'GP', 'OT', 'PHYSIOTHERAPIST', 'CONTINENCE-NURSE', 'NONE')),
  bladder_plan_followed TEXT CHECK (bladder_plan_followed IN ('STRESS', 'URGE', 'MIXED', 'RETENTION-OVERFLOW')),
  bowel_continent BOOLEAN,
  bowel_incontinent BOOLEAN,
  bowel_plan_commenced BOOLEAN,
  bowel_record_commenced BOOLEAN,
  bowel_referral_required TEXT CHECK (bowel_referral_required IN ('DIETICIAN', 'GP', 'OT', 'PHYSIOTHERAPIST', 'NONE')),
  
  -- Section 11
  signature_completing_assessment TEXT NOT NULL,
  signature_resident TEXT,
  date_next_review TIMESTAMPTZ NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id),
  saved_as_draft BOOLEAN DEFAULT false,
  pdf_file_id UUID
);

CREATE INDEX idx_bladder_bowel_resident ON public.bladder_bowel_assessments(resident_id);

-- ============================================
-- MOVING & HANDLING ASSESSMENTS
-- ============================================

CREATE TABLE public.moving_handling_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Section 1: Resident information
  resident_name TEXT NOT NULL,
  date_of_birth TIMESTAMPTZ NOT NULL,
  bedroom_number TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  height NUMERIC NOT NULL,
  history_of_falls BOOLEAN NOT NULL,
  
  -- Section 2: Mobility Assessment
  independent_mobility BOOLEAN NOT NULL,
  can_weight_bear TEXT NOT NULL CHECK (can_weight_bear IN ('FULLY', 'PARTIALLY', 'WITH-AID', 'NO-WEIGHTBEARING')),
  limb_upper_right TEXT NOT NULL CHECK (limb_upper_right IN ('FULLY', 'PARTIALLY', 'NONE')),
  limb_upper_left TEXT NOT NULL CHECK (limb_upper_left IN ('FULLY', 'PARTIALLY', 'NONE')),
  limb_lower_right TEXT NOT NULL CHECK (limb_lower_right IN ('FULLY', 'PARTIALLY', 'NONE')),
  limb_lower_left TEXT NOT NULL CHECK (limb_lower_left IN ('FULLY', 'PARTIALLY', 'NONE')),
  equipment_used TEXT,
  needs_risk_staff TEXT,
  
  -- Section 3-6: Risk Factors
  deafness_state TEXT NOT NULL CHECK (deafness_state IN ('ALWAYS', 'SOMETIMES', 'NEVER')),
  deafness_comments TEXT,
  blindness_state TEXT NOT NULL CHECK (blindness_state IN ('ALWAYS', 'SOMETIMES', 'NEVER')),
  blindness_comments TEXT,
  unpredictable_behaviour_state TEXT NOT NULL CHECK (unpredictable_behaviour_state IN ('ALWAYS', 'SOMETIMES', 'NEVER')),
  unpredictable_behaviour_comments TEXT,
  uncooperative_behaviour_state TEXT NOT NULL CHECK (uncooperative_behaviour_state IN ('ALWAYS', 'SOMETIMES', 'NEVER')),
  uncooperative_behaviour_comments TEXT,
  distressed_reaction_state TEXT NOT NULL CHECK (distressed_reaction_state IN ('ALWAYS', 'SOMETIMES', 'NEVER')),
  distressed_reaction_comments TEXT,
  disorientated_state TEXT NOT NULL CHECK (disorientated_state IN ('ALWAYS', 'SOMETIMES', 'NEVER')),
  disorientated_comments TEXT,
  unconscious_state TEXT NOT NULL CHECK (unconscious_state IN ('ALWAYS', 'SOMETIMES', 'NEVER')),
  unconscious_comments TEXT,
  unbalance_state TEXT NOT NULL CHECK (unbalance_state IN ('ALWAYS', 'SOMETIMES', 'NEVER')),
  unbalance_comments TEXT,
  spasms_state TEXT NOT NULL CHECK (spasms_state IN ('ALWAYS', 'SOMETIMES', 'NEVER')),
  spasms_comments TEXT,
  stiffness_state TEXT NOT NULL CHECK (stiffness_state IN ('ALWAYS', 'SOMETIMES', 'NEVER')),
  stiffness_comments TEXT,
  catheters_state TEXT NOT NULL CHECK (catheters_state IN ('ALWAYS', 'SOMETIMES', 'NEVER')),
  catheters_comments TEXT,
  incontinence_state TEXT NOT NULL CHECK (incontinence_state IN ('ALWAYS', 'SOMETIMES', 'NEVER')),
  incontinence_comments TEXT,
  localised_pain TEXT NOT NULL CHECK (localised_pain IN ('ALWAYS', 'SOMETIMES', 'NEVER')),
  localised_pain_comments TEXT,
  other_state TEXT NOT NULL CHECK (other_state IN ('ALWAYS', 'SOMETIMES', 'NEVER')),
  other_comments TEXT,
  
  -- Section 7: Assessment Completion
  completed_by TEXT NOT NULL,
  job_role TEXT NOT NULL,
  signature TEXT NOT NULL,
  completion_date DATE NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id),
  saved_as_draft BOOLEAN DEFAULT false,
  pdf_file_id UUID
);

CREATE INDEX idx_moving_handling_resident ON public.moving_handling_assessments(resident_id);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS for all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_home_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_fluid_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_admission_care_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infection_prevention_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bladder_bowel_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moving_handling_assessments ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
  SELECT COALESCE(
    (auth.users.raw_app_meta_data->>'role')::TEXT,
    'member'
  )
  FROM auth.users
  WHERE auth.users.id = user_uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_active_organization_id(user_uuid UUID)
RETURNS UUID AS $$
  SELECT (auth.users.raw_app_meta_data->>'active_organization_id')::UUID
  FROM auth.users
  WHERE auth.users.id = user_uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_saas_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (auth.users.raw_app_meta_data->>'is_saas_admin')::BOOLEAN,
    false
  )
  FROM auth.users
  WHERE auth.users.id = user_uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_active_unit_id(user_uuid UUID)
RETURNS UUID AS $$
  SELECT p.active_unit_id
  FROM public.profiles p
  WHERE p.id = user_uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.can_access_organization(
  user_uuid UUID,
  org_uuid UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  IF public.is_saas_admin(user_uuid) THEN
    RETURN true;
  END IF;
  
  RETURN EXISTS (
    SELECT 1
    FROM auth.members m
    WHERE m.user_id = user_uuid
      AND m.organization_id = org_uuid::TEXT
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

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
  IF public.is_saas_admin(user_uuid) THEN
    RETURN true;
  END IF;
  
  user_role_val := public.get_user_role(user_uuid);
  org_uuid := public.get_active_organization_id(user_uuid);
  
  SELECT organization_id INTO care_home_org
  FROM public.care_homes
  WHERE id = care_home_uuid;
  
  IF org_uuid != care_home_org THEN
    RETURN false;
  END IF;
  
  IF user_role_val = 'owner' THEN
    RETURN true;
  END IF;
  
  IF user_role_val = 'manager' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.care_home_managers chm
      WHERE chm.care_home_id = care_home_uuid
        AND chm.user_id = user_uuid
    );
  END IF;
  
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
  IF public.is_saas_admin(user_uuid) THEN
    RETURN true;
  END IF;
  
  user_role_val := public.get_user_role(user_uuid);
  org_uuid := public.get_active_organization_id(user_uuid);
  
  SELECT organization_id INTO unit_org
  FROM public.units
  WHERE id = unit_uuid;
  
  IF org_uuid != unit_org THEN
    RETURN false;
  END IF;
  
  IF user_role_val IN ('owner', 'manager') THEN
    RETURN true;
  END IF;
  
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

-- RLS Policies for core tables
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

CREATE POLICY "Users can read residents in org"
  ON public.residents FOR SELECT
  USING (
    public.can_access_organization(
      auth.uid(),
      organization_id
    )
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

CREATE POLICY "Owners can delete residents"
  ON public.residents FOR DELETE
  USING (
    public.get_user_role(auth.uid()) = 'owner'
    AND public.can_access_organization(auth.uid(), organization_id)
  );

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

CREATE POLICY "Authorized users can update medications"
  ON public.medications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = medications.resident_id
        AND public.can_access_organization(auth.uid(), r.organization_id)
    )
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')
  );

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

CREATE POLICY "Users can read org care homes"
  ON public.care_homes FOR SELECT
  USING (public.can_access_organization(auth.uid(), organization_id));

CREATE POLICY "Owners can create care homes"
  ON public.care_homes FOR INSERT
  WITH CHECK (
    public.get_user_role(auth.uid()) = 'owner'
    AND public.can_access_organization(auth.uid(), organization_id)
  );

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

-- RLS Policies for care file tables
CREATE POLICY "Users can read pre-admission files"
  ON public.pre_admission_care_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = pre_admission_care_files.resident_id
        AND public.can_access_organization(auth.uid(), r.organization_id)
    )
  );

CREATE POLICY "Authorized users can create pre-admission files"
  ON public.pre_admission_care_files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = pre_admission_care_files.resident_id
        AND public.can_access_organization(auth.uid(), r.organization_id)
    )
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')
  );

CREATE POLICY "Users can read admission assessments"
  ON public.admission_assessments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = admission_assessments.resident_id
        AND public.can_access_organization(auth.uid(), r.organization_id)
    )
  );

CREATE POLICY "Authorized users can create admission assessments"
  ON public.admission_assessments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = admission_assessments.resident_id
        AND public.can_access_organization(auth.uid(), r.organization_id)
    )
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')
  );

CREATE POLICY "Users can read infection prevention assessments"
  ON public.infection_prevention_assessments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = infection_prevention_assessments.resident_id
        AND public.can_access_organization(auth.uid(), r.organization_id)
    )
  );

CREATE POLICY "Authorized users can create infection prevention assessments"
  ON public.infection_prevention_assessments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = infection_prevention_assessments.resident_id
        AND public.can_access_organization(auth.uid(), r.organization_id)
    )
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')
  );

CREATE POLICY "Users can read bladder bowel assessments"
  ON public.bladder_bowel_assessments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = bladder_bowel_assessments.resident_id
        AND public.can_access_organization(auth.uid(), r.organization_id)
    )
  );

CREATE POLICY "Authorized users can create bladder bowel assessments"
  ON public.bladder_bowel_assessments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = bladder_bowel_assessments.resident_id
        AND public.can_access_organization(auth.uid(), r.organization_id)
    )
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')
  );

CREATE POLICY "Users can read moving handling assessments"
  ON public.moving_handling_assessments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = moving_handling_assessments.resident_id
        AND public.can_access_organization(auth.uid(), r.organization_id)
    )
  );

CREATE POLICY "Authorized users can create moving handling assessments"
  ON public.moving_handling_assessments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = moving_handling_assessments.resident_id
        AND public.can_access_organization(auth.uid(), r.organization_id)
    )
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')
  );

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
-- AUTH TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, image_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();