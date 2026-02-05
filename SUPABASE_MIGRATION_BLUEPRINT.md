# CareO: Convex to Supabase Migration Blueprint

**Version:** 1.0  
**Date:** January 21, 2026  
**Status:** Planning Phase

---

## Executive Summary

This document provides a comprehensive migration blueprint for moving the CareO application from Convex (document database) to Supabase (PostgreSQL + Supabase Auth + RLS). The migration focuses on maintaining functional parity while improving security through Row Level Security (RLS) and leveraging PostgreSQL's relational capabilities.

**Key Constraints:**
- ✅ Must use Supabase Auth (no BetterAuth or third-party auth)
- ✅ Data loss acceptable (no production data exists)
- ✅ Follow Supabase best practices (Postgres-first, RLS-driven security)
- ✅ Maintain TypeScript codebase

---

## Table of Contents

1. [Current Convex Database Analysis](#1-current-convex-database-analysis)
2. [Supabase Postgres Schema Design](#2-supabase-postgres-schema-design)
3. [Authentication & Authorization Design](#3-authentication--authorization-design)
4. [Migration Strategy](#4-migration-strategy)
5. [Application Code Migration](#5-application-code-migration)
6. [Risks & Mitigation](#6-risks--mitigation)
7. [Validation & Rollout Checklist](#7-validation--rollout-checklist)

---

## 1. Current Convex Database Analysis

### 1.1 Schema Inventory

The CareO application uses **82 tables** in Convex. Below is a categorized inventory:

#### Core Identity & Access (5 tables)
- `users` - User profiles with Better Auth integration
- `passkey` - Passkey authentication records
- `teamMembers` - User-team relationships
- `invitationMetadata` - Invitation tracking
- `organizationStatus` - Organization lifecycle management

#### RBAC Hierarchy (4 tables)
- `careHomes` - Care home entities (belong to organizations)
- `careHomeManagers` - Manager assignments to care homes
- `units` - Units/teams within care homes
- `unitStaff` - Staff assignments to units (nurses/care assistants)

#### Residents & Care (8 tables)
- `residents` - Core resident records
- `emergencyContacts` - Resident emergency contacts
- `residentAuditLog` - Audit trail for resident data changes
- `personalCareDaily` - Daily care documentation
- `personalCareTaskEvents` - Task-level care events
- `dietInformation` - Resident dietary requirements
- `personalInterests` - Resident preferences
- `socialConnections` - Resident social network

#### Medication Management (3 tables)
- `medication` - Medication prescriptions
- `medicationIntake` - Medication administration tracking
- `medicationRound` - Round completion records

#### Food & Fluid (3 tables)
- `foodFluidLogs` - Food/fluid intake logs (with archival)
- `menuItems` - Menu item catalog
- `foodFluidAuditLog` - GDPR audit trail

#### Care Files & Assessments (20+ tables)
- `preAdmissionCareFiles` - Pre-admission assessments
- `admissionAssesments` - Admission assessments
- `infectionPreventionAssessments` - Infection control
- `bladderBowelAssessments` - Continence assessments
- `movingHandlingAssessments` - Moving & handling
- `longTermFallsRiskAssessments` - Falls risk
- `photographyConsents` - Photo consent forms
- `dnacprs` - DNACPR forms
- `peeps` - Personal Emergency Evacuation Plans
- `dependencyAssessments` - Dependency levels
- `timlAssessments` - This Is My Life assessments
- `skinIntegrityAssessments` - Skin integrity
- `residentValuablesAssessments` - Valuables tracking
- `residentHandlingProfileForm` - Handling profiles
- `painAssessments` - Pain assessments
- `nutritionalAssessments` - Nutritional assessments
- `oralAssessments` - Oral health assessments
- `dietNotifications` - Diet notifications
- `chokingRiskAssessments` - Choking risk
- `cornellDepressionScales` - Depression screening
- `bedrailConsents` - Bedrail consent
- `bedRailsRiskAssessments` - Bedrail risk
- `bestInterestDecisions` - Best interest decisions

#### Care Plans & Documentation (4 tables)
- `carePlanAssessments` - Care plan documents
- `carePlanReminders` - 30-day review reminders
- `carePlanEvaluations` - Care plan evaluations
- `careFilePdfs` - Uploaded PDF documents

#### Social & Activities (2 tables)
- `socialActivities` - Activity logging
- `socialConnections` - Social network

#### Appointments & Notes (4 tables)
- `appointments` - Appointment scheduling
- `appointmentNotes` - Appointment preparation notes
- `quickCareNotes` - Quick care notes
- `appointmentReadStatus` - Read tracking

#### Clinical & Health (3 tables)
- `clinicalNotes` - Clinical documentation
- `vitals` - Vital signs monitoring
- `healthMonitoring` - Health tracking

#### Incidents & Reports (5 tables)
- `incidents` - Incident reports
- `trustIncidentReports` - Trust incident reports
- `bhsctReports` - BHSCT reports
- `sehsctReports` - SEHSCT reports
- `nhsReports` - NHS reports

#### Handover & Communication (3 tables)
- `handoverReports` - Shift handover reports
- `handoverComments` - Handover comments
- `multidisciplinaryCareTeam` - MDT team members
- `multidisciplinaryNotes` - MDT notes

#### Night Check (2 tables)
- `nightCheckConfigurations` - Night check setup
- `nightCheckRecordings` - Night check logs

#### Audit System (12 tables)
- `residentAuditTemplates` - Resident audit templates
- `residentAuditCompletions` - Resident audit responses
- `residentAuditActionPlans` - Resident audit action plans
- `residentAuditItems` - Resident audit items
- `careFileAuditTemplates` - Care file audit templates
- `careFileAuditCompletions` - Care file audit responses
- `careFileAuditActionPlans` - Care file audit action plans
- `governanceAuditTemplates` - Governance audit templates
- `governanceAuditCompletions` - Governance audit responses
- `governanceAuditActionPlans` - Governance audit action plans
- `clinicalAuditTemplates` - Clinical audit templates
- `clinicalAuditCompletions` - Clinical audit responses
- `clinicalAuditActionPlans` - Clinical audit action plans
- `environmentAuditTemplates` - Environment audit templates
- `environmentAuditCompletions` - Environment audit responses
- `environmentAuditActionPlans` - Environment audit action plans
- `managerAudits` - Manager audit records

#### Notifications & Alerts (3 tables)
- `notifications` - Centralized notification system
- `notificationReadStatus` - Read status tracking
- `alerts` - Resident alerts (food/fluid, medication, etc.)

#### Files & Storage (3 tables)
- `files` - File metadata (references `_storage`)
- `folders` - Folder structure
- `labels` - File labels

#### Hospital & Transfer (2 tables)
- `hospitalPassports` - Hospital passport documents
- `hospitalTransferLogs` - Transfer logs

#### Progress Notes (2 tables)
- `progressNotes` - Progress note entries
- `progressNoteStats` - Progress note statistics

#### System & Utilities (2 tables)
- `invitations` - User invitations
- `todos` - Todo items

### 1.2 Key Relationships

```
Organization (Better Auth)
  ├── Care Homes (careHomes)
  │   ├── Units (units)
  │   │   └── Unit Staff (unitStaff)
  │   └── Care Home Managers (careHomeManagers)
  ├── Teams (Better Auth teams)
  │   └── Team Members (teamMembers)
  └── Residents (residents)
      ├── Emergency Contacts (emergencyContacts)
      ├── Medications (medication)
      │   └── Medication Intake (medicationIntake)
      ├── Food/Fluid Logs (foodFluidLogs)
      ├── Personal Care (personalCareDaily)
      │   └── Task Events (personalCareTaskEvents)
      ├── Care Files (20+ assessment tables)
      ├── Appointments (appointments)
      ├── Incidents (incidents)
      └── Alerts (alerts)
```

### 1.3 Access Patterns

#### Query Patterns
- **Organization-scoped:** All queries filter by `organizationId`
- **Team-scoped:** Many queries filter by `teamId` within organization
- **Unit-scoped:** Nurse/care assistant queries filter by `activeUnitId`
- **Resident-scoped:** Most care data filtered by `residentId`
- **Time-based:** Food/fluid logs, medication rounds, appointments use date/time filters
- **Status-based:** Many tables query by status (active, completed, draft, etc.)

#### Mutation Patterns
- **Create:** Most mutations insert with `organizationId`, `teamId`, `createdBy`, `createdAt`
- **Update:** Patches include `updatedBy`, `updatedAt`
- **Delete:** Soft deletes via `isActive` or status fields (hard deletes rare)

#### Real-time Subscriptions
- Convex uses reactive queries (`useQuery`) that auto-update on data changes
- No explicit `.subscribe()` calls - reactivity is built into `useQuery` hook
- Frontend components automatically re-render when Convex data changes

### 1.4 Current Authorization Rules

Authorization is enforced in Convex functions via:
1. **`resolveUser()` helper** - Gets user, role, organizationId, activeUnitId
2. **Role checks** - SaaS Admin, Owner, Manager, Nurse, Care Assistant
3. **Organization isolation** - All data scoped to `organizationId`
4. **Unit isolation** - Nurses/care assistants restricted to `activeUnitId`
5. **Care home isolation** - Managers restricted to assigned care homes

**Key Authorization Functions:**
- `canAccessOrganization()` - Organization-level access
- `canAccessCareHome()` - Care home access (managers only assigned homes)
- `canAccessUnit()` - Unit access (nurses/care assistants only active unit)
- `canInviteUser()` - Invitation hierarchy (Owner→Manager→Nurse/Care Assistant)
- `scopeByOrganization()` - Query scoping helper
- `scopeByUnit()` - Unit-scoped query helper

---

## 2. Supabase Postgres Schema Design

### 2.1 Schema Mapping Table

| Convex Collection | Supabase Table | Notes |
|------------------|----------------|-------|
| `users` | `public.profiles` | Links to `auth.users` via `user_id` |
| `passkey` | `auth.users` (via Supabase Auth) | Handled by Supabase Auth |
| `careHomes` | `public.care_homes` | FK to organizations |
| `careHomeManagers` | `public.care_home_managers` | Junction table |
| `units` | `public.units` | FK to care_homes, teams |
| `unitStaff` | `public.unit_staff` | Junction table |
| `teamMembers` | `public.team_members` | Junction table (Better Auth teams → Supabase) |
| `residents` | `public.residents` | Core resident records |
| `emergencyContacts` | `public.emergency_contacts` | FK to residents |
| `medication` | `public.medications` | FK to residents |
| `medicationIntake` | `public.medication_intakes` | FK to medications |
| `medicationRound` | `public.medication_rounds` | FK to residents |
| `foodFluidLogs` | `public.food_fluid_logs` | With archival fields |
| `menuItems` | `public.menu_items` | FK to teams |
| `personalCareDaily` | `public.personal_care_daily` | FK to residents |
| `personalCareTaskEvents` | `public.personal_care_task_events` | FK to personal_care_daily |
| `dietInformation` | `public.diet_information` | FK to residents |
| `socialActivities` | `public.social_activities` | FK to residents |
| `socialConnections` | `public.social_connections` | FK to residents |
| `appointments` | `public.appointments` | FK to residents |
| `appointmentNotes` | `public.appointment_notes` | FK to residents |
| `quickCareNotes` | `public.quick_care_notes` | FK to residents |
| `incidents` | `public.incidents` | FK to residents |
| `alerts` | `public.alerts` | FK to residents |
| `notifications` | `public.notifications` | User notifications |
| `files` | `public.files` | File metadata (references Supabase Storage) |
| `folders` | `public.folders` | Folder hierarchy |
| `labels` | `public.labels` | File labels |
| `invitations` | `public.invitations` | User invitations |
| `todos` | `public.todos` | Todo items |
| *Care File Tables (20+)* | `public.*_assessments` | One table per assessment type |
| *Audit Tables (12+)* | `public.*_audit_*` | Audit templates, completions, action plans |

### 2.2 Core Schema SQL

```sql
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
-- NOTE: Must be created FIRST as other tables depend on it

-- Note: Organizations are managed via Supabase Auth's organization plugin
-- We create a public.organizations table for RLS and denormalization

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
-- NOTE: Must be created before units and profiles

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
-- NOTE: Must be created before profiles (which references units)

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
-- NOTE: Created AFTER units and care_homes (which it references)

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
```

### 2.3 Schema Improvements

**Improvements over Convex:**
1. **Foreign Key Constraints** - Enforce referential integrity at database level
2. **ENUM Types** - Type-safe status/role fields instead of string unions
3. **CHECK Constraints** - Validate data at insert/update time
4. **Indexes** - Explicit indexes matching Convex query patterns
5. **Timestamps** - Use `TIMESTAMPTZ` for timezone-aware dates
6. **JSONB** - Flexible fields (health_conditions, risks, dependencies) use JSONB for queryability
7. **Helper Functions** - Reusable SQL functions for role/access checks

**Tradeoffs:**
- **More verbose** - Postgres schema requires explicit types vs Convex's flexible validators
- **Migration complexity** - Need to map Convex `v.union()` to ENUMs or CHECK constraints
- **JSONB vs columns** - Some flexible fields kept as JSONB (matches Convex `v.any()`)

---

## 3. Authentication & Authorization Design

### 3.1 Supabase Auth Configuration

**User Lifecycle:**
1. **Signup** - Supabase Auth handles email/password signup
2. **Profile Creation** - Trigger creates `public.profiles` record
3. **Organization Assignment** - Via invitations (see below)
4. **Role Assignment** - Stored in `auth.users.raw_app_meta_data.role`

**Session Management:**
- Supabase Auth handles sessions via JWT tokens
- `activeOrganizationId` stored in `auth.users.raw_app_meta_data.active_organization_id`
- Frontend uses `supabase.auth.getSession()` to get current user

### 3.2 Role Storage Strategy (Hybrid)

**In `auth.users.raw_app_meta_data`:**
```json
{
  "role": "owner" | "manager" | "nurse" | "care_assistant" | "saas_admin",
  "is_saas_admin": boolean,
  "active_organization_id": "uuid"
}
```

**In Public Tables:**
- `public.profiles` - User profile data, `active_unit_id`, `active_care_home_id`
- `public.care_home_managers` - Manager assignments
- `public.unit_staff` - Unit staff assignments
- `auth.members` (Supabase Auth) - Organization memberships with roles

**Rationale:**
- Role in `app_metadata` for quick access in RLS policies
- Organization/team/unit relations in tables for complex queries
- Denormalized for performance (avoid joins in RLS)

### 3.3 Row Level Security (RLS) Policies

#### 3.3.1 Enable RLS

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_fluid_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
-- ... enable for all tables
```

#### 3.3.2 Profiles RLS

```sql
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- SaaS Admins can read all profiles
CREATE POLICY "SaaS Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_saas_admin(auth.uid()));

-- Managers/Owners can read profiles in their organization
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
```

#### 3.3.3 Residents RLS

```sql
-- Read: Users in same organization can read residents
CREATE POLICY "Users can read residents in org"
  ON public.residents FOR SELECT
  USING (
    public.can_access_organization(
      auth.uid(),
      organization_id
    )
  );

-- Insert: Only authorized roles can create residents
CREATE POLICY "Authorized users can create residents"
  ON public.residents FOR INSERT
  WITH CHECK (
    public.can_access_organization(auth.uid(), organization_id)
    AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')
  );

-- Update: Only authorized roles can update residents
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

-- Delete: Only Owners can delete (soft delete via status)
CREATE POLICY "Owners can delete residents"
  ON public.residents FOR DELETE
  USING (
    public.get_user_role(auth.uid()) = 'owner'
    AND public.can_access_organization(auth.uid(), organization_id)
  );
```

#### 3.3.4 Medications RLS

```sql
-- Read: Users can read medications for residents they can access
CREATE POLICY "Users can read medications"
  ON public.medications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = medications.resident_id
        AND public.can_access_organization(auth.uid(), r.organization_id)
    )
  );

-- Insert: Nurses and above can create medications
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

-- Update: Nurses and above can update medications
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
```

#### 3.3.5 Food & Fluid Logs RLS

```sql
-- Read: All staff can read food/fluid logs for residents they can access
CREATE POLICY "Users can read food fluid logs"
  ON public.food_fluid_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = food_fluid_logs.resident_id
        AND public.can_access_organization(auth.uid(), r.organization_id)
    )
  );

-- Insert: All staff can create food/fluid logs
CREATE POLICY "Users can create food fluid logs"
  ON public.food_fluid_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = food_fluid_logs.resident_id
        AND public.can_access_organization(auth.uid(), r.organization_id)
    )
  );

-- Update: Only if not archived (read-only)
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
```

#### 3.3.6 Alerts RLS

```sql
-- Read: Users can read alerts based on role and target_roles
CREATE POLICY "Users can read relevant alerts"
  ON public.alerts FOR SELECT
  USING (
    public.can_access_organization(auth.uid(), organization_id)
    AND (
      -- Alert has no target_roles (all can see)
      target_roles IS NULL
      OR array_length(target_roles, 1) IS NULL
      -- User's role is in target_roles
      OR public.get_user_role(auth.uid()) = ANY(target_roles)
      -- Managers/Owners can see all alerts
      OR public.get_user_role(auth.uid()) IN ('owner', 'manager')
    )
  );
```

#### 3.3.7 Care Homes RLS

```sql
-- Read: Users can read care homes in their organization
CREATE POLICY "Users can read org care homes"
  ON public.care_homes FOR SELECT
  USING (public.can_access_organization(auth.uid(), organization_id));

-- Insert: Only Owners can create care homes
CREATE POLICY "Owners can create care homes"
  ON public.care_homes FOR INSERT
  WITH CHECK (
    public.get_user_role(auth.uid()) = 'owner'
    AND public.can_access_organization(auth.uid(), organization_id)
  );
```

#### 3.3.8 Units RLS

```sql
-- Read: Users can read units based on role
CREATE POLICY "Users can read accessible units"
  ON public.units FOR SELECT
  USING (
    public.can_access_organization(auth.uid(), organization_id)
    AND (
      -- Owner/Manager can see all units in org
      public.get_user_role(auth.uid()) IN ('owner', 'manager')
      OR public.can_access_unit(auth.uid(), id)
    )
  );

-- Insert: Only Managers can create units
CREATE POLICY "Managers can create units"
  ON public.units FOR INSERT
  WITH CHECK (
    public.get_user_role(auth.uid()) = 'manager'
    AND public.can_access_care_home(auth.uid(), care_home_id)
  );
```

### 3.4 Invitation Flow

**Current (Better Auth):**
1. Owner/Manager creates invitation via Better Auth
2. Invitation stored in `invitations` table
3. User accepts → Better Auth creates `member` record
4. Session updated with `activeOrganizationId`

**New (Supabase Auth):**
1. Owner/Manager creates invitation → Insert into `public.invitations`
2. Send email with token link
3. User clicks link → Frontend calls Supabase Auth signup/login
4. On signup/login → Trigger creates `public.profiles` record
5. Accept invitation → Create `auth.members` record (Supabase Auth organization plugin)
6. Update `auth.users.raw_app_meta_data.active_organization_id`

**SQL Trigger for Profile Creation:**
```sql
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
```

---

## 4. Migration Strategy

### 4.1 Pre-Migration Setup

**Step 1: Create Supabase Project**
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase project
supabase init

# Link to Supabase Cloud project
supabase link --project-ref <project-ref>
```

**Step 2: Configure Environment Variables**
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

**Step 3: Install Dependencies**
```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install @supabase/auth-ui-react @supabase/auth-ui-shared
```

### 4.2 Database Schema Migration

**Step 1: Create Migration Files**
```bash
supabase migration new create_careo_schema
```

**Step 2: Apply Schema**
- Copy SQL from Section 2.2 into migration file
- Run: `supabase db push`

**Step 3: Enable RLS**
- Apply RLS policies from Section 3.3
- Test policies with `supabase db reset` and manual queries

**Step 4: Create Helper Functions**
- Apply helper functions from Section 2.2
- Test with `SELECT public.get_user_role(auth.uid());`

### 4.3 Storage Migration

**Step 1: Create Storage Buckets**
```sql
-- In Supabase Dashboard → Storage
-- Create buckets:
-- - resident-files (private)
-- - care-file-pdfs (private)
-- - profile-images (public)
-- - organization-logos (public)
```

**Step 2: Set Storage Policies**
```sql
-- Resident files: Only org members can read/write
CREATE POLICY "Users can read resident files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'resident-files'
    AND public.can_access_organization(
      auth.uid(),
      (storage.foldername(name))[1]::UUID
    )
  );

CREATE POLICY "Users can upload resident files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'resident-files'
    AND public.can_access_organization(
      auth.uid(),
      (storage.foldername(name))[1]::UUID
    )
  );
```

**Step 3: Migrate Files (if any)**
- Export files from Convex Storage
- Upload to Supabase Storage via API
- Update `public.files` table with new storage paths

### 4.4 Auth Configuration

**Step 1: Configure Supabase Auth**
- Enable Email/Password auth
- Configure email templates
- Set up email provider (Resend/SendGrid)

**Step 2: Configure Organization Plugin**
- Install Supabase Auth organization plugin
- Configure roles: `owner`, `manager`, `nurse`, `care_assistant`
- Set up invitation flow

**Step 3: Create Auth Hooks**
- Database trigger for profile creation (see Section 3.4)
- Function to sync role to `app_metadata`

### 4.5 Incremental Cutover

**Phase 1: Parallel Run (Week 1-2)**
- Deploy Supabase schema
- Keep Convex running
- Migrate auth first (new signups go to Supabase)
- Test Supabase queries in parallel

**Phase 2: Read-Only Migration (Week 3)**
- Migrate read queries to Supabase
- Keep Convex mutations active
- Compare results between systems

**Phase 3: Write Migration (Week 4)**
- Migrate mutations to Supabase
- Keep Convex as backup
- Monitor for errors

**Phase 4: Full Cutover (Week 5)**
- Remove Convex dependencies
- Update all frontend code
- Decommission Convex project

---

## 5. Application Code Migration

### 5.1 Frontend Changes

#### 5.1.1 Replace Convex Client with Supabase Client

**Before (Convex):**
```typescript
// components/providers/ConvexClientProvider.tsx
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      {children}
    </ConvexBetterAuthProvider>
  );
}
```

**After (Supabase):**
```typescript
// lib/supabase/client.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const supabase = createClientComponentClient();

// components/providers/SupabaseProvider.tsx
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { supabase } from '@/lib/supabase/client';

export function SupabaseProvider({ children }: { children: ReactNode }) {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      {children}
    </SessionContextProvider>
  );
}
```

#### 5.1.2 Replace useQuery with Supabase Queries

**Before (Convex):**
```typescript
// app/(dashboard)/dashboard/residents/page.tsx
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function ResidentsPage() {
  const residents = useQuery(api.residents.list, {});
  
  if (!residents) return <div>Loading...</div>;
  
  return (
    <div>
      {residents.map(resident => (
        <div key={resident._id}>{resident.firstName}</div>
      ))}
    </div>
  );
}
```

**After (Supabase):**
```typescript
// app/(dashboard)/dashboard/residents/page.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useSession } from "@supabase/auth-helpers-react";

export default function ResidentsPage() {
  const session = useSession();
  const [residents, setResidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!session) return;
    
    async function fetchResidents() {
      const { data, error } = await supabase
        .from('residents')
        .select('*')
        .eq('organization_id', session.user.app_metadata.active_organization_id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching residents:', error);
        return;
      }
      
      setResidents(data || []);
      setLoading(false);
    }
    
    fetchResidents();
    
    // Subscribe to changes
    const subscription = supabase
      .channel('residents-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'residents',
        filter: `organization_id=eq.${session.user.app_metadata.active_organization_id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setResidents(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setResidents(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
        } else if (payload.eventType === 'DELETE') {
          setResidents(prev => prev.filter(r => r.id !== payload.old.id));
        }
      })
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [session]);
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {residents.map(resident => (
        <div key={resident.id}>{resident.first_name}</div>
      ))}
    </div>
  );
}
```

#### 5.1.3 Replace useMutation with Supabase Mutations

**Before (Convex):**
```typescript
// components/residents/forms/CreateResidentForm.tsx
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function CreateResidentForm() {
  const createResident = useMutation(api.residents.create);
  
  async function handleSubmit(data: FormData) {
    await createResident({
      firstName: data.get('firstName'),
      lastName: data.get('lastName'),
      // ...
    });
  }
}
```

**After (Supabase):**
```typescript
// components/residents/forms/CreateResidentForm.tsx
import { supabase } from "@/lib/supabase/client";
import { useSession } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";

export function CreateResidentForm() {
  const session = useSession();
  const router = useRouter();
  
  async function handleSubmit(data: FormData) {
    if (!session) return;
    
    const { data: resident, error } = await supabase
      .from('residents')
      .insert({
        first_name: data.get('firstName'),
        last_name: data.get('lastName'),
        organization_id: session.user.app_metadata.active_organization_id,
        team_id: session.user.app_metadata.active_team_id,
        created_by: session.user.id,
        // ...
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating resident:', error);
      return;
    }
    
    router.push(`/dashboard/residents/${resident.id}`);
  }
}
```

### 5.2 Backend Changes (Server Actions)

**Create Server Actions for Complex Operations:**

```typescript
// app/actions/residents.ts
'use server';

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function createResident(formData: FormData) {
  const supabase = createServerComponentClient({ cookies });
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  const { data, error } = await supabase
    .from('residents')
    .insert({
      first_name: formData.get('firstName'),
      last_name: formData.get('lastName'),
      organization_id: session.user.app_metadata.active_organization_id,
      team_id: session.user.app_metadata.active_team_id,
      created_by: session.user.id,
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data;
}
```

### 5.3 Real-time Subscriptions

**Replace Convex Reactive Queries with Supabase Realtime:**

```typescript
// hooks/use-residents.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@supabase/auth-helpers-react';

export function useResidents() {
  const session = useSession();
  const [residents, setResidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!session) return;
    
    const orgId = session.user.app_metadata.active_organization_id;
    
    // Initial fetch
    supabase
      .from('residents')
      .select('*')
      .eq('organization_id', orgId)
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching residents:', error);
          return;
        }
        setResidents(data || []);
        setLoading(false);
      });
    
    // Subscribe to changes
    const channel = supabase
      .channel('residents')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'residents',
        filter: `organization_id=eq.${orgId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setResidents(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setResidents(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
        } else if (payload.eventType === 'DELETE') {
          setResidents(prev => prev.filter(r => r.id !== payload.old.id));
        }
      })
      .subscribe();
    
    return () => {
      channel.unsubscribe();
    };
  }, [session]);
  
  return { residents, loading };
}
```

### 5.4 Error Handling Differences

**Convex:**
- Errors thrown in queries/mutations are caught by Convex
- Frontend receives error objects automatically

**Supabase:**
- Errors returned in `{ data, error }` pattern
- Must explicitly check `error` field
- Use try/catch for async operations

**Migration Pattern:**
```typescript
// Before (Convex)
try {
  await createResident({ ... });
} catch (error) {
  console.error(error);
}

// After (Supabase)
const { data, error } = await supabase.from('residents').insert({ ... });
if (error) {
  console.error(error);
  // Handle error
}
```

### 5.5 Transaction Boundaries

**Convex:**
- Mutations are atomic transactions
- Multiple operations in one mutation are transactional

**Supabase:**
- Use `rpc()` for stored procedures (transactional)
- Or use `begin()`, `commit()`, `rollback()` for explicit transactions

**Example:**
```typescript
// Create resident + emergency contact atomically
const { data, error } = await supabase.rpc('create_resident_with_contact', {
  resident_data: { ... },
  contact_data: { ... }
});
```

---

## 6. Risks & Mitigation

### 6.1 Security Risks

**Risk: RLS Policy Bypass**
- **Mitigation:** Test all RLS policies with different roles. Use Supabase's policy testing tools. Audit logs for unauthorized access.

**Risk: SQL Injection**
- **Mitigation:** Use Supabase client (parameterized queries). Never use raw SQL with user input. Validate all inputs.

**Risk: Session Hijacking**
- **Mitigation:** Use Supabase Auth's secure session management. Enable HTTPS only. Set secure cookie flags.

### 6.2 Data Modeling Risks

**Risk: Data Loss During Migration**
- **Mitigation:** Run parallel systems initially. Export Convex data before migration. Test migration scripts on staging.

**Risk: Performance Degradation**
- **Mitigation:** Create indexes matching query patterns. Use connection pooling. Monitor query performance. Use `EXPLAIN ANALYZE` for slow queries.

**Risk: Schema Mismatches**
- **Mitigation:** Map all Convex validators to Postgres types. Test edge cases (nulls, empty arrays, large JSONB). Use migration rollback scripts.

### 6.3 Developer Workflow Risks

**Risk: Learning Curve**
- **Mitigation:** Provide training on Supabase/Postgres. Create migration guide with examples. Pair programming sessions.

**Risk: Breaking Changes**
- **Mitigation:** Incremental migration. Feature flags for Supabase vs Convex. Comprehensive testing before cutover.

**Risk: Real-time Subscriptions Complexity**
- **Mitigation:** Create reusable hooks for subscriptions. Document subscription patterns. Test reconnection logic.

---

## 7. Validation & Rollout Checklist

### 7.1 Pre-Migration Checklist

- [ ] Supabase project created and configured
- [ ] Database schema created and tested
- [ ] RLS policies written and tested
- [ ] Helper functions created and tested
- [ ] Storage buckets created with policies
- [ ] Auth configuration complete
- [ ] Environment variables set
- [ ] Dependencies installed

### 7.2 Functional Parity Checklist

- [ ] User signup/login works
- [ ] Profile creation works
- [ ] Organization creation works (SaaS Admin)
- [ ] Care home creation works (Owner)
- [ ] Unit creation works (Manager)
- [ ] Resident CRUD works
- [ ] Medication management works
- [ ] Food/fluid logging works
- [ ] Care file forms work
- [ ] Audit system works
- [ ] Notifications work
- [ ] File uploads work
- [ ] Real-time updates work

### 7.3 Security Validation Checklist

- [ ] RLS policies prevent cross-organization access
- [ ] RLS policies enforce role-based access
- [ ] Unit isolation works (nurse/care assistant)
- [ ] Care home isolation works (manager)
- [ ] SaaS Admin can access all data
- [ ] Invitation flow works securely
- [ ] Session management works correctly
- [ ] File access is restricted by organization

### 7.4 Performance Baseline Checklist

- [ ] Query performance acceptable (< 100ms for common queries)
- [ ] Real-time subscriptions perform well
- [ ] File uploads perform well
- [ ] Indexes are being used (check `EXPLAIN ANALYZE`)
- [ ] Connection pooling configured
- [ ] No N+1 query problems

### 7.5 Developer Experience Checklist

- [ ] Migration guide complete
- [ ] Code examples provided
- [ ] Error handling patterns documented
- [ ] Testing utilities created
- [ ] Local development setup works
- [ ] TypeScript types generated (`supabase gen types typescript`)

### 7.6 Rollout Plan

**Week 1: Infrastructure**
- Day 1-2: Set up Supabase project, create schema
- Day 3-4: Write and test RLS policies
- Day 5: Set up storage and auth

**Week 2: Core Features**
- Day 1-2: Migrate auth and user management
- Day 3-4: Migrate residents and care homes
- Day 5: Migrate medications and food/fluid

**Week 3: Advanced Features**
- Day 1-2: Migrate care files and assessments
- Day 3-4: Migrate audit system
- Day 5: Migrate notifications and alerts

**Week 4: Testing & Polish**
- Day 1-2: End-to-end testing
- Day 3: Performance testing
- Day 4: Security audit
- Day 5: Documentation and training

**Week 5: Cutover**
- Day 1: Deploy to staging
- Day 2-3: User acceptance testing
- Day 4: Deploy to production
- Day 5: Monitor and fix issues

---

## Appendix A: Complete Table List

[Full list of 82 tables with field mappings - see Section 1.1]

## Appendix B: SQL Migration Scripts

[Complete SQL for all tables - see Section 2.2]

## Appendix C: RLS Policy Examples

[Complete RLS policies for all tables - see Section 3.3]

## Appendix D: Code Migration Examples

[Additional code examples - see Section 5]

---

**Document Status:** Draft  
**Last Updated:** January 21, 2026  
**Next Review:** After initial implementation
