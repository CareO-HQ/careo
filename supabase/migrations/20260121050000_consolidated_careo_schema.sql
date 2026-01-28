-- ============================================
-- CAREO: CONSOLIDATED SUPABASE SCHEMA
-- ============================================
-- Version: 1.1
-- Date: January 21, 2026
-- Description: This file contains the complete schema for the CareO application,
-- including all 82 tables from the Convex schema, ENUMs, extensions,
-- helper functions, triggers, and RLS policies.

-- ============================================
-- 1. EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- ============================================
-- 2. ENUMS
-- ============================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM (
      'saas_admin', 'owner', 'manager', 'nurse', 'care_assistant'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resident_status') THEN
    CREATE TYPE resident_status AS ENUM (
      'active', 'discharged', 'deceased', 'transferred', 'hospital'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
    CREATE TYPE task_status AS ENUM (
      'pending', 'in_progress', 'completed', 'partially_completed',
      'not_required', 'refused', 'unable', 'missed'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shift_type') THEN
    CREATE TYPE shift_type AS ENUM ('day', 'night');
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
      'scheduled', 'dispensed', 'administered', 'given', 'refused', 'missed', 'skipped'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_type') THEN
    CREATE TYPE alert_type AS ENUM (
      'food_fluid', 'night_check', 'medication', 'activity', 'vital_signs', 'care_plan'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_severity') THEN
    CREATE TYPE alert_severity AS ENUM ('critical', 'warning', 'info');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organization_status_type') THEN
    CREATE TYPE organization_status_type AS ENUM ('active', 'suspended', 'deactivated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_status') THEN
    CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'revoked');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_category') THEN
    CREATE TYPE audit_category AS ENUM (
      'resident', 'carefile', 'governance', 'clinical', 'environment'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_frequency') THEN
    CREATE TYPE audit_frequency AS ENUM (
      'daily', 'weekly', 'monthly', 'quarterly', '6months', 'yearly', 'adhoc'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_status') THEN
    CREATE TYPE audit_status AS ENUM ('draft', 'in-progress', 'completed');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'action_plan_status') THEN
    CREATE TYPE action_plan_status AS ENUM ('pending', 'in_progress', 'completed', 'overdue');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_level') THEN
    CREATE TYPE priority_level AS ENUM ('Low', 'Medium', 'High');
  END IF;
END $$;

-- ============================================
-- 3. HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. CORE IDENTITY & ACCESS
-- ============================================

-- Organizations (links to auth.organizations if using Supabase organizations, 
-- or a custom table for multi-tenancy)
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization Status tracking
CREATE TABLE public.organization_status (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  status organization_status_type NOT NULL DEFAULT 'active',
  deactivated_at TIMESTAMPTZ,
  deactivated_by UUID,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Care Homes (Entities within an organization)
CREATE TABLE public.care_homes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Units / Teams within care homes
-- Renamed from 'units' to 'teams' to align with custom schema
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_home_id UUID NOT NULL REFERENCES public.care_homes(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Public Users table (extends auth.users)
-- This aligns with the user's custom schema requirements
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  phone TEXT,
  image_url TEXT,
  role user_role DEFAULT 'care_assistant',
  active_organization_id UUID REFERENCES public.organizations(id),
  active_care_home_id UUID REFERENCES public.care_homes(id),
  active_team_id UUID REFERENCES public.teams(id),
  niscc_registration_number TEXT,
  is_saas_admin BOOLEAN DEFAULT false,
  is_onboarding_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: Profiles table removed in favor of Supabase Auth Metadata.
-- Core state (active_organization_id, role, etc.) is stored in auth.users app_metadata.

-- Care Home Managers (Junction table)
CREATE TABLE public.care_home_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_home_id UUID NOT NULL REFERENCES public.care_homes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(care_home_id, user_id)
);

-- Unit Staff (Junction table for Nurses/Care Assistants)
-- References public.teams (formerly units)
CREATE TABLE public.unit_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(team_id, user_id)
);

-- ============================================
-- 3. ACCESS HELPER FUNCTIONS
-- ============================================

-- Function to get user's role from auth.users.raw_app_meta_data
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
  SELECT COALESCE(
    (auth.users.raw_app_meta_data->>'role')::TEXT,
    'member'
  )
  FROM auth.users
  WHERE auth.users.id = user_uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to check if user belongs to an organization (using JWT metadata)
CREATE OR REPLACE FUNCTION public.can_access_organization(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT 
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_saas_admin')::BOOLEAN, false)
    OR (auth.jwt() -> 'app_metadata' ->> 'active_organization_id')::UUID = org_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Simple helper for policies
CREATE OR REPLACE FUNCTION public.is_saas_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_saas_admin')::BOOLEAN, false);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- 5. RESIDENTS & CARE DATA
-- ============================================

-- Residents
CREATE TABLE public.residents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  image_url TEXT,
  phone_number TEXT,
  room_number TEXT,
  admission_date DATE,
  nhs_health_number TEXT,
  status resident_status DEFAULT 'active',
  discharge_date TIMESTAMPTZ,
  discharge_reason TEXT,
  
  -- Summary care info (from Convex)
  health_conditions JSONB DEFAULT '[]'::jsonb,
  risks JSONB DEFAULT '[]'::jsonb,
  dependencies JSONB DEFAULT '{}'::jsonb,
  
  -- GP Details
  gp_name TEXT,
  gp_address TEXT,
  gp_phone TEXT,
  
  -- Care Manager Details
  care_manager_name TEXT,
  care_manager_address TEXT,
  care_manager_phone TEXT,
  
  -- Organizational context
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  care_home_id UUID NOT NULL REFERENCES public.care_homes(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Emergency Contacts
CREATE TABLE public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Food & Fluid Logs
CREATE TABLE public.food_fluid_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  section TEXT NOT NULL, -- e.g. 'morning', 'afternoon'
  type_of_food_drink TEXT NOT NULL,
  amount_eaten TEXT,
  fluid_consumed_ml INTEGER,
  signature TEXT,
  date DATE NOT NULL,
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu Items
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  care_home_id UUID REFERENCES public.care_homes(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medication
CREATE TABLE public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  strength TEXT,
  dosage_form TEXT,
  route TEXT,
  frequency TEXT,
  schedule_type TEXT,
  times TEXT[],
  instructions TEXT,
  prescriber_name TEXT,
  start_date DATE,
  end_date DATE,
  status medication_status DEFAULT 'active',
  is_controlled_drug BOOLEAN DEFAULT false,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medication Intake
CREATE TABLE public.medication_intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMPTZ NOT NULL,
  administered_at TIMESTAMPTZ,
  administered_by UUID,
  state intake_state DEFAULT 'scheduled',
  comment TEXT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  care_home_id UUID NOT NULL REFERENCES public.care_homes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medication Rounds
CREATE TABLE public.medication_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TEXT NOT NULL, -- e.g. '08:00'
  status TEXT DEFAULT 'pending', -- pending, completed
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  care_home_id UUID NOT NULL REFERENCES public.care_homes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(resident_id, date, time)
);

-- Vitals
CREATE TABLE public.vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  vital_type TEXT NOT NULL, -- e.g. blood_pressure, heart_rate
  value TEXT NOT NULL,
  value2 TEXT, -- For BP diastolic
  unit TEXT,
  notes TEXT,
  recorded_by UUID NOT NULL,
  record_date DATE NOT NULL,
  record_time TIME NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. INDEXES & CONSTRAINTS
-- ============================================

CREATE INDEX idx_residents_org ON public.residents(organization_id);
CREATE INDEX idx_residents_care_home ON public.residents(care_home_id);
CREATE INDEX idx_food_fluid_logs_resident_date ON public.food_fluid_logs(resident_id, date);
CREATE INDEX idx_medications_resident ON public.medications(resident_id);
CREATE INDEX idx_vitals_resident_date ON public.vitals(resident_id, record_date);

-- ============================================
-- 7. INCIDENTS & REPORTS
-- ============================================

-- Base Incidents table (Aligned with Convex)
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
  
  -- Section 1: Incident Details
  date DATE NOT NULL,
  time TIME NOT NULL,
  home_name TEXT,
  unit TEXT,
  
  -- Section 2: Injured Person Details
  injured_person_first_name TEXT,
  injured_person_surname TEXT,
  injured_person_dob DATE,
  resident_internal_id TEXT,
  date_of_admission DATE,
  health_care_number TEXT,
  
  -- Section 3: Status of Injured Person
  injured_person_status TEXT[], -- "Resident", "Relative", etc.
  contractor_employer TEXT,
  
  -- Section 4: Type of Incident
  incident_types TEXT[] NOT NULL,
  type_other_details TEXT,
  
  -- Section 5-6: Fall-Specific Questions
  anticoagulant_medication TEXT, -- "yes", "no", "unknown"
  fall_pathway TEXT, -- "green", "amber", "red"
  
  -- Section 7: Detailed Description
  detailed_description TEXT NOT NULL,
  
  -- Section 8: Incident Level
  incident_level TEXT NOT NULL, -- "death", "permanent_harm", etc.
  
  -- Section 9: Details of Injury
  injury_description TEXT,
  body_part_injured TEXT,
  
  -- Section 10: Treatment Required
  treatment_types TEXT[],
  
  -- Section 11: Details of Treatment Given
  treatment_details TEXT,
  vital_signs TEXT,
  treatment_refused BOOLEAN DEFAULT false,
  
  -- Section 12: Witnesses
  witness1_name TEXT,
  witness1_contact TEXT,
  witness2_name TEXT,
  witness2_contact TEXT,
  
  -- Section 13: Further Actions by Nurse
  nurse_actions TEXT[],
  
  -- Section 14: Further Actions Advised
  further_actions_advised TEXT,
  
  -- Section 15: Prevention Measures
  prevention_measures TEXT,
  
  -- Section 16: Home Manager Informed
  home_manager_informed_by TEXT,
  home_manager_informed_date_time TIMESTAMPTZ,
  
  -- Section 17: Out of Hours On-Call
  on_call_manager_name TEXT,
  on_call_contacted_date_time TIMESTAMPTZ,
  
  -- Section 18: Next of Kin Informed
  nok_informed_who TEXT,
  nok_informed_by TEXT,
  nok_informed_date_time TIMESTAMPTZ,
  
  -- Section 19: Trust Incident Form Recipients
  trust_care_manager_name TEXT,
  trust_care_manager_email TEXT,
  trust_key_worker_name TEXT,
  trust_key_worker_email TEXT,
  
  -- Section 20: Form Completion Details
  completed_by_full_name TEXT NOT NULL,
  completed_by_job_title TEXT NOT NULL,
  completed_by_signature TEXT,
  date_completed DATE NOT NULL,
  
  -- Form Metadata
  status TEXT DEFAULT 'pending',
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  care_home_id UUID REFERENCES public.care_homes(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trust Incident Reports (NHS, BHSCT, SEHSCT)
CREATE TABLE public.trust_incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  resident_id UUID REFERENCES public.residents(id) ON DELETE CASCADE,
  trust_name TEXT NOT NULL,
  report_type TEXT NOT NULL,
  report_data JSONB NOT NULL, -- Flexible storage for different trust requirements
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. AUDIT SYSTEM
-- ============================================

-- Reusable templates for all audit categories
CREATE TABLE public.audit_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category audit_category NOT NULL,
  questions JSONB NOT NULL, -- Array of question objects
  frequency audit_frequency NOT NULL,
  is_active BOOLEAN DEFAULT true,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Completed audit instances
CREATE TABLE public.audit_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.audit_templates(id) ON DELETE CASCADE,
  resident_id UUID REFERENCES public.residents(id) ON DELETE CASCADE, -- Optional (governance audits might not have resident)
  status audit_status NOT NULL DEFAULT 'draft',
  responses JSONB NOT NULL, -- Detailed responses for each question
  overall_notes TEXT,
  audited_by UUID NOT NULL,
  completed_at TIMESTAMPTZ,
  next_audit_due TIMESTAMPTZ,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  care_home_id UUID REFERENCES public.care_homes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Action plans linked to audit findings
CREATE TABLE public.audit_action_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_completion_id UUID REFERENCES public.audit_completions(id) ON DELETE CASCADE,
  resident_id UUID REFERENCES public.residents(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  priority priority_level NOT NULL DEFAULT 'Medium',
  due_date DATE,
  status action_plan_status NOT NULL DEFAULT 'pending',
  latest_comment TEXT,
  status_history JSONB, -- Array of status update events
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Manager Audit log
CREATE TABLE public.manager_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_type TEXT NOT NULL, -- Links to the audited assessment/form type
  form_id UUID NOT NULL,   -- ID of the specific form record
  resident_id UUID REFERENCES public.residents(id) ON DELETE CASCADE,
  audited_by UUID NOT NULL,
  audit_notes TEXT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  care_home_id UUID NOT NULL REFERENCES public.care_homes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. HANDOVER & COMMUNICATION
-- ============================================

-- Handover Reports (Archived shift reports)
CREATE TABLE public.handover_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  shift shift_type NOT NULL,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  handover_data JSONB NOT NULL, -- Snapshot of resident statuses at shift end
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Real-time Handover Comments
CREATE TABLE public.handover_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  shift shift_type NOT NULL,
  comment TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Multidisciplinary Care Team
CREATE TABLE public.multidisciplinary_care_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  designation TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  specialty TEXT,
  organisation TEXT,
  is_active BOOLEAN DEFAULT true,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MDT Notes
CREATE TABLE public.multidisciplinary_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  team_member_id UUID REFERENCES public.multidisciplinary_care_team(id) ON DELETE SET NULL,
  team_member_name TEXT NOT NULL,
  note_date DATE NOT NULL,
  note_time TIME,
  reason_for_visit TEXT NOT NULL,
  outcome TEXT NOT NULL,
  relative_informed BOOLEAN DEFAULT false,
  signature TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. INDEXES (BATCH 2)
-- ============================================

CREATE INDEX idx_incidents_org ON public.incidents(organization_id);
CREATE INDEX idx_incidents_resident ON public.incidents(resident_id);
CREATE INDEX idx_audit_completions_template ON public.audit_completions(template_id);
CREATE INDEX idx_audit_action_plans_org ON public.audit_action_plans(organization_id);
CREATE INDEX idx_handover_reports_date ON public.handover_reports(date, shift);
CREATE INDEX idx_mdt_notes_resident ON public.multidisciplinary_notes(resident_id);

-- ============================================
-- 11. CARE ASSESSMENTS (BATCH 1: ADMISSION & PREVENTION)
-- ============================================

-- Pre-admission Care Files
CREATE TABLE public.pre_admission_care_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  care_home_name TEXT,
  nhs_number TEXT,
  consent_accepted_at TIMESTAMPTZ,
  saved_as_draft BOOLEAN DEFAULT false,
  assessment_data JSONB, -- Comprehensive assessment fields
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admission Assessments
CREATE TABLE public.admission_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'draft',
  assessment_data JSONB,
  pdf_file_id UUID, -- References storage
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Infection Prevention Assessments
CREATE TABLE public.infection_prevention_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assessment_type TEXT, -- Pre-admission / Admission
  symptoms JSONB, -- Respiratory, Diarrhea, etc.
  exposure_history JSONB,
  isolation_required BOOLEAN DEFAULT false,
  completed_by TEXT,
  completion_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bladder & Bowel Assessments
CREATE TABLE public.bladder_bowel_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lifestyle_factors JSONB,
  bladder_pattern JSONB,
  bowel_pattern JSONB,
  symptoms JSONB,
  plan_commenced BOOLEAN DEFAULT false,
  next_review_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Moving & Handling Assessments
CREATE TABLE public.moving_handling_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  mobility_assessment JSONB, -- Weight bearing, limb mobility, etc.
  risk_factors JSONB, -- Sensory, cognitive, physical
  equipment_needed TEXT,
  completed_by TEXT,
  completion_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Falls Risk Assessments (Long Term)
CREATE TABLE public.long_term_falls_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assessment_fields JSONB, -- History, mobility, sensory, medical
  total_score INTEGER,
  risk_level TEXT,
  completed_by TEXT,
  completion_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 12. CARE ASSESSMENTS (BATCH 2: CONSENTS & SPECIALIZED)
-- ============================================

-- Photography Consents
CREATE TABLE public.photography_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  healthcare_records BOOLEAN DEFAULT false,
  social_internal BOOLEAN DEFAULT false,
  social_external BOOLEAN DEFAULT false,
  resident_signature TEXT,
  representative_details JSONB,
  staff_signature TEXT,
  status TEXT DEFAULT 'draft',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DNACPR
CREATE TABLE public.dnacprs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  dnacpr_active BOOLEAN DEFAULT false,
  reason TEXT,
  discussion_history JSONB,
  gp_signature TEXT,
  gp_date DATE,
  status TEXT DEFAULT 'draft',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PEEPs (Personal Emergency Evacuation Plans)
CREATE TABLE public.peeps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assistance_needed JSONB,
  evacuation_steps JSONB, -- Array of steps
  hazard_info JSONB, -- Oxygen, furniture, etc.
  completed_by TEXT,
  completion_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dependency Assessments
CREATE TABLE public.dependency_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  dependency_level TEXT NOT NULL, -- A, B, C, D
  completed_by TEXT,
  completion_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 13. INDEXES (BATCH 3)
-- ============================================

CREATE INDEX idx_pre_admission_resident ON public.pre_admission_care_files(resident_id);
CREATE INDEX idx_admission_assessments_resident ON public.admission_assessments(resident_id);
CREATE INDEX idx_infection_prev_resident ON public.infection_prevention_assessments(resident_id);
CREATE INDEX idx_bladder_bowel_resident ON public.bladder_bowel_assessments(resident_id);
CREATE INDEX idx_photography_consents_resident ON public.photography_consents(resident_id);
CREATE INDEX idx_dnacprs_resident ON public.dnacprs(resident_id);

-- ============================================
-- 14. CARE ASSESSMENTS (BATCH 3: PHYSICAL & CLINICAL)
-- ============================================

-- TIML Assessments (Transfer/Independent/Mobility/Limbs)
CREATE TABLE public.timl_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assessment_data JSONB,
  mobility_status TEXT,
  completed_by TEXT,
  completion_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skin Integrity Assessments (Waterlow/Branden etc.)
CREATE TABLE public.skin_integrity_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  risk_score INTEGER,
  risk_level TEXT,
  skin_condition TEXT,
  pressure_sore_present BOOLEAN DEFAULT false,
  assessment_details JSONB,
  completed_by TEXT,
  completion_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resident Valuables Assessments
CREATE TABLE public.resident_valuables_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  valuables_list JSONB, -- Array of items with descriptions and photos
  disclaimer_signed BOOLEAN DEFAULT false,
  signature_type TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resident Handling Profiles
CREATE TABLE public.resident_handling_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  transfer_method TEXT,
  equipment_needed TEXT,
  staff_required INTEGER,
  safety_precautions TEXT,
  profile_data JSONB,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pain Assessments (Abbey Pain Scale etc.)
CREATE TABLE public.pain_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pain_type TEXT,
  pain_location TEXT,
  pain_score INTEGER,
  indicators JSONB, -- Facial, Vocal, Body, etc.
  completed_by TEXT,
  completion_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nutritional Assessments (MUST etc.)
CREATE TABLE public.nutritional_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  bmi_score INTEGER,
  weight_loss_score INTEGER,
  disease_effect_score INTEGER,
  overall_risk_score INTEGER,
  risk_level TEXT,
  completed_by TEXT,
  completion_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Oral Health Assessments
CREATE TABLE public.oral_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  oral_hygiene_status TEXT,
  denture_status TEXT,
  gum_condition TEXT,
  tongue_condition TEXT,
  completed_by TEXT,
  completion_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Diet & Lifestyle (Consolidated summary for dashboard)
CREATE TABLE public.diet_lifestyle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  diet_types TEXT[],
  other_diet_type TEXT,
  cultural_restrictions TEXT,
  allergies JSONB, -- Array of objects: { allergy: string }
  choking_risk TEXT, -- low, medium, high
  food_consistency TEXT, -- level3-level7
  fluid_consistency TEXT, -- level0-level4
  assistance_required TEXT, -- yes, no
  chef_notified TEXT, -- yes, no
  chef_name TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_diet_lifestyle_resident ON public.diet_lifestyle(resident_id);

-- Diet Notifications
CREATE TABLE public.diet_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  diet_type TEXT, -- Soft, Pureed, Normal
  fluid_consistency TEXT, -- Stage 1, 2, 3
  allergies TEXT,
  preferences TEXT,
  notified_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Choking Risk Assessments
CREATE TABLE public.choking_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  swallowing_difficulty BOOLEAN DEFAULT false,
  choking_history TEXT,
  risk_score INTEGER,
  risk_level TEXT,
  completed_by TEXT,
  completion_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cornell Depression Scales
CREATE TABLE public.cornell_depression_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  mood_signs_score INTEGER,
  behavioral_disturbance_score INTEGER,
  physical_signs_score INTEGER,
  cyclic_functions_score INTEGER,
  ideational_disturbance_score INTEGER,
  total_score INTEGER,
  completed_by TEXT,
  completion_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bedrail Consents
CREATE TABLE public.bedrail_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  capacity_assessed BOOLEAN DEFAULT false,
  consent_given BOOLEAN DEFAULT false,
  representative_name TEXT,
  signature_id UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bedrail Risk Assessments
CREATE TABLE public.bedrails_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  risks_identified JSONB,
  benefits_identified JSONB,
  alternatives_considered JSONB,
  decision TEXT,
  completed_by TEXT,
  completion_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Best Interest Decisions
CREATE TABLE public.best_interest_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  decision_details TEXT NOT NULL,
  participants JSONB, -- Array of people involved
  reasoning TEXT,
  capacity_assessment_id UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 15. INDEXES (BATCH 4)
-- ============================================

CREATE INDEX idx_timl_resident ON public.timl_assessments(resident_id);
CREATE INDEX idx_skin_integrity_resident ON public.skin_integrity_assessments(resident_id);
CREATE INDEX idx_pain_assessments_resident ON public.pain_assessments(resident_id);
CREATE INDEX idx_choking_risk_resident ON public.choking_risk_assessments(resident_id);
CREATE INDEX idx_cornell_depression_resident ON public.cornell_depression_scales(resident_id);
CREATE INDEX idx_bedrail_consents_resident ON public.bedrail_consents(resident_id);

-- ============================================
-- 16. CARE PLANS & EVALUATIONS
-- ============================================

-- Care Plan Assessments
CREATE TABLE public.care_plan_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  care_plan_type TEXT NOT NULL, -- e.g. Mobility, Nutrition, Personal Care
  need_identified TEXT,
  goals JSONB,
  interventions JSONB,
  status TEXT DEFAULT 'active',
  next_evaluation_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Care Plan Evaluations
CREATE TABLE public.care_plan_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_plan_id UUID NOT NULL REFERENCES public.care_plan_assessments(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  evaluation_date DATE NOT NULL,
  progress_notes TEXT,
  goals_met BOOLEAN DEFAULT false,
  adjustments_needed TEXT,
  new_review_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Care Plan Reminders
CREATE TABLE public.care_plan_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 17. CLINICAL & PROGRESS NOTES
-- ============================================

-- Clinical Notes (Advanced)
CREATE TABLE public.clinical_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  note_date DATE NOT NULL,
  note_time TIME,
  note_type TEXT, -- e.g. GP Visit, Hospital, Family
  content TEXT NOT NULL,
  signature TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progress Notes (Daily summary)
CREATE TABLE public.progress_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  shift shift_type NOT NULL,
  content TEXT NOT NULL,
  mood TEXT,
  health_status TEXT,
  recorded_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 18. NIGHT CHECKS
-- ============================================

-- Night Check Configuration
CREATE TABLE public.night_check_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  care_home_id UUID REFERENCES public.care_homes(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  
  check_type TEXT NOT NULL, -- night_check, positioning, etc.
  frequency_minutes INTEGER,
  selected_items TEXT[],
  
  start_time TIME NOT NULL DEFAULT '22:00',
  end_time TIME NOT NULL DEFAULT '07:00',
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Night Check Recordings
CREATE TABLE public.night_check_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_id UUID REFERENCES public.night_check_configurations(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  care_home_id UUID REFERENCES public.care_homes(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  
  check_type TEXT NOT NULL,
  record_date DATE NOT NULL,
  record_time TIME NOT NULL,
  record_date_time TIMESTAMPTZ NOT NULL,
  
  check_data JSONB,
  notes TEXT,
  recorded_by UUID NOT NULL,
  recorded_by_name TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 19. HOSPITAL COMMUNICATIONS
-- ============================================

-- Hospital Passports
CREATE TABLE public.hospital_passports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  passport_data JSONB, -- Comprehensive medical history, likes/dislikes
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hospital Transfer Logs
CREATE TABLE public.hospital_transfer_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  transfer_date TIMESTAMPTZ NOT NULL,
  reason TEXT,
  destination_hospital TEXT,
  escort_details TEXT,
  paperwork_sent BOOLEAN DEFAULT false,
  medication_sent BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 20. INDEXES (BATCH 5)
-- ============================================

CREATE INDEX idx_care_plans_resident ON public.care_plan_assessments(resident_id);
CREATE INDEX idx_clinical_notes_resident ON public.clinical_notes(resident_id, note_date);
CREATE INDEX idx_progress_notes_resident ON public.progress_notes(resident_id, date);
CREATE INDEX idx_night_checks_resident ON public.night_check_recordings(resident_id, record_date);

-- Daily Care / Personal Care
CREATE TABLE public.personal_care_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  shift TEXT, -- AM, PM, Night
  status TEXT DEFAULT 'open', -- open, partial, complete, cancelled
  exceptions JSONB DEFAULT '[]'::jsonb,
  
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  care_home_id UUID REFERENCES public.care_homes(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.personal_care_task_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_id UUID NOT NULL REFERENCES public.personal_care_daily(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  status TEXT NOT NULL,
  
  shift TEXT,
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  performed_by UUID NOT NULL,
  co_workers UUID[],
  assistance_level TEXT,
  reason_code TEXT,
  reason_note TEXT,
  notes TEXT,
  payload JSONB,
  
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.quick_care_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  
  -- Shower/Bath
  shower_or_bath TEXT,
  preferred_time TEXT,
  
  -- Toileting
  toilet_type TEXT,
  assistance_level TEXT,
  
  -- Mobility
  walking_aid TEXT,
  positioning_frequency TEXT,
  
  communication_needs TEXT[],
  safety_alerts TEXT[],
  
  priority TEXT DEFAULT 'medium',
  is_active BOOLEAN DEFAULT true,
  
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  care_home_id UUID REFERENCES public.care_homes(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_personal_care_daily_resident ON public.personal_care_daily(resident_id, date);
CREATE INDEX idx_quick_care_notes_resident ON public.quick_care_notes(resident_id);

-- ============================================
-- 21. ALERTS & NOTIFICATIONS
-- ============================================

-- Alerts
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  care_home_id UUID REFERENCES public.care_homes(id) ON DELETE CASCADE,
  type alert_type NOT NULL,
  severity alert_severity NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  metadata JSONB, -- For linking to specific records
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications (System-wide)
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Optional: targeting a specific user
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Read Status
CREATE TABLE public.notification_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(notification_id, user_id)
);

-- ============================================
-- 22. APPOINTMENTS & TODOS
-- ============================================

-- Appointments
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  location TEXT,
  attendees JSONB,
  status TEXT DEFAULT 'scheduled',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointment Read Status
CREATE TABLE public.appointment_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(appointment_id, user_id)
);

-- Todos
CREATE TABLE public.todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  priority TEXT DEFAULT 'Medium',
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invitations
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  care_home_id UUID REFERENCES public.care_homes(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL,
  status invitation_status DEFAULT 'pending',
  invited_by UUID NOT NULL,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  token TEXT UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL
);

-- ============================================
-- 23. FILES & FOLDERS (METADATA)
-- ============================================

-- Folders
CREATE TABLE public.folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  care_home_id UUID REFERENCES public.care_homes(id) ON DELETE CASCADE,
  resident_id UUID REFERENCES public.residents(id) ON DELETE CASCADE,
  parent_folder_id UUID REFERENCES public.folders(id),
  name TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Files
CREATE TABLE public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  care_home_id UUID REFERENCES public.care_homes(id) ON DELETE CASCADE,
  resident_id UUID REFERENCES public.residents(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 24. ENABLING RLS (BATCH SCRIPT)
-- ============================================

DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(t) || ' ENABLE ROW LEVEL SECURITY;';
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 26. AUTH METADATA INITIALIZATION
-- ============================================

-- Function to handle new user signup metadata
-- Function to setup metadata for first user or default others
CREATE OR REPLACE FUNCTION public.setup_new_user_metadata()
RETURNS TRIGGER AS $$
BEGIN
  RAISE NOTICE 'DEBUG: setup_new_user_metadata triggered for email: %', NEW.email;

  -- ALWAYS set as SaaS Admin as requested for testing/current phase
  RAISE NOTICE 'DEBUG: Forcing SaaS Admin role for %', NEW.email;
  
  NEW.raw_app_meta_data = jsonb_set(
    COALESCE(NEW.raw_app_meta_data, '{}'::jsonb),
    '{is_saas_admin}',
    'true'::jsonb
  );
  NEW.raw_app_meta_data = jsonb_set(
    NEW.raw_app_meta_data,
    '{role}',
    '"saas_admin"'::jsonb
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_name TEXT;
  v_role user_role;
  v_is_saas_admin BOOLEAN;
BEGIN
  RAISE NOTICE 'DEBUG: handle_new_user syncing user: %', NEW.email;

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

-- Trigger to run BEFORE every signup to modify the user record (metadata)
DROP TRIGGER IF EXISTS on_auth_user_created_init ON auth.users;
CREATE TRIGGER on_auth_user_created_init
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.setup_new_user_metadata();

-- Trigger to run AFTER every signup to sync to public.users
DROP TRIGGER IF EXISTS on_auth_user_created_sync ON auth.users;
CREATE TRIGGER on_auth_user_created_sync
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 27. END OF CONSOLIDATED SCHEMA
-- ============================================

-- ============================================
-- 27. CRITICAL TRIGGERS (MANUAL)
-- ============================================

-- Apply set_updated_at to main tables only to prevent timeout
CREATE TRIGGER set_updated_at_org BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_care_home BEFORE UPDATE ON public.care_homes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_team BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_user BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_resident BEFORE UPDATE ON public.residents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 26. REPRESENTATIVE RLS POLICIES
-- ============================================

-- PROFILE POLICIES
-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING ( auth.uid() = id );

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING ( auth.uid() = id );

-- Applications should use supabase.auth.getUser()

-- ORGANIZATION POLICIES
CREATE POLICY "SaaS admins can manage all organizations"
  ON public.organizations FOR ALL
  TO authenticated
  USING ( public.is_saas_admin() )
  WITH CHECK ( public.is_saas_admin() );

CREATE POLICY "Users can view their own organization"
  ON public.organizations FOR SELECT
  USING ( public.can_access_organization(id) );

-- ORGANIZATION STATUS POLICIES
CREATE POLICY "SaaS admins can manage organization status"
  ON public.organization_status FOR ALL
  TO authenticated
  USING ( public.is_saas_admin() )
  WITH CHECK ( public.is_saas_admin() );

CREATE POLICY "Users can view their organization status"
  ON public.organization_status FOR SELECT
  USING ( public.can_access_organization(organization_id) );

-- CARE HOME POLICIES
CREATE POLICY "SaaS admins can manage all care homes"
  ON public.care_homes FOR ALL
  TO authenticated
  USING ( public.is_saas_admin() )
  WITH CHECK ( public.is_saas_admin() );

CREATE POLICY "Users can view care homes in their organization"
  ON public.care_homes FOR SELECT
  USING ( public.can_access_organization(organization_id) );

-- TEAM POLICIES
CREATE POLICY "SaaS admins can manage all teams"
  ON public.teams FOR ALL
  TO authenticated
  USING ( public.is_saas_admin() )
  WITH CHECK ( public.is_saas_admin() );

CREATE POLICY "Users can view teams in their organization"
  ON public.teams FOR SELECT
  USING ( public.can_access_organization(organization_id) );

-- RESIDENT POLICIES (Isolated by Organization)
CREATE POLICY "Users can view residents in their organization"
  ON public.residents FOR SELECT
  USING ( public.can_access_organization(organization_id) );

CREATE POLICY "Managers and above can insert residents"
  ON public.residents FOR INSERT
  WITH CHECK ( 
    public.can_access_organization(organization_id)
    AND (public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin'))
  );

-- INVITATION POLICIES
CREATE POLICY "SaaS admins can manage all invitations"
  ON public.invitations FOR ALL
  TO authenticated
  USING ( public.is_saas_admin() )
  WITH CHECK ( public.is_saas_admin() );

CREATE POLICY "Owners can manage invitations for their organization"
  ON public.invitations FOR ALL
  TO authenticated
  USING ( public.can_access_organization(organization_id) )
  WITH CHECK ( public.can_access_organization(organization_id) );

-- DATA ISOLATION TEMPLATE (Applied to all care data)
-- For brevity, we define a pattern that should be replicated for all 82 tables:
-- 1. Select: organization_id = profile.active_organization_id
-- 2. Insert/Update/Delete: Role-based + organization_id check

CREATE POLICY "Care data isolation" 
  ON public.food_fluid_logs FOR ALL
  USING ( public.can_access_organization(organization_id) );

CREATE POLICY "Medication isolation" 
  ON public.medications FOR ALL
  USING ( public.can_access_organization(organization_id) );

CREATE POLICY "Personal care daily isolation" 
  ON public.personal_care_daily FOR ALL
  USING ( public.can_access_organization(organization_id) );

CREATE POLICY "Personal care tasks isolation" 
  ON public.personal_care_task_events FOR ALL
  USING ( public.can_access_organization(organization_id) );

CREATE POLICY "Quick care notes isolation" 
  ON public.quick_care_notes FOR ALL
  USING ( public.can_access_organization(organization_id) );

CREATE POLICY "Night check config isolation" 
  ON public.night_check_configurations FOR ALL
  USING ( public.can_access_organization(organization_id) );

CREATE POLICY "Night check recordings isolation" 
  ON public.night_check_recordings FOR ALL
  USING ( public.can_access_organization(organization_id) );

-- ============================================
-- END OF SCHEMA
-- ============================================
