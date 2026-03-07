
# CareO Application - Complete Feature List

## Overview

CareO is a comprehensive healthcare management platform built for UK care homes and healthcare providers. This document provides a complete inventory of all features, organized by category.

**Technology Stack**: Next.js 15, React 19, TypeScript, Supabase, Better Auth, shadcn/ui

---

## NAVIGATION STRUCTURE

### Main Navigation
1. **Management**: Home, Residents, Staff
2. **Operations**: Handover, Appointments, Incidents, Action Plans, Notifications
3. **Clinical**: Wounds
4. **Audit**: Care File Audit, CareO Audit, Manager Audit

---

## 1. RESIDENT MANAGEMENT

### 1.1 Core Resident Features
**Route**: `/dashboard/residents`

- **Resident Directory**
  - Searchable resident list with data tables
  - Advanced filtering and pagination
  - Resident profiles with comprehensive information
  - Avatar/photo management
  - Room number tracking
  - NHS health number tracking
  - Emergency contacts management

- **Resident Overview** (`/dashboard/residents/[id]/overview`)
  - Basic resident information
  - Health conditions summary
  - Risk assessments overview
  - Dependencies tracking
  - Alert system with dismissible notifications
  - Real-time status updates

---

### 1.2 Care File Management
**Route**: `/dashboard/residents/[id]/care-file-v2`

**Overview**: 46 care assessment forms across 18 categories

#### Care File V2 Structure (Current)
- Folder-based organization (18 categories)
- Document tracking with audit trails
- Version control for assessments
- Archived care plans and risk assessments
- Manager audit integration

#### Implemented Forms (29)

**Pre-Admission & Admission (4)**
1. Pre-Admission Assessment
2. Infection Prevention Control
3. Admission Assessment
4. Photography Consent

**Care Planning & Decision Making (2)**
5. Care Plan (with evaluations)
6. Best Interest Decision

**End of Life Care (1)**
7. DNACPR (Do Not Attempt CPR)

**Emergency Planning (1)**
8. PEEP (Personal Emergency Evacuation Plan)

**Dependency & Activity (2)**
9. Dependency Assessment
10. This Is My Life

**Mobility & Fall Risk (6)**
11. Moving & Handling Assessment
12. Long Term Fall Risk Assessment
13. Fall Risk Assessment
14. Resident Handling Profile
15. Bedrail Consent
16. Bed Rails Risk Assessment

**Nutrition & Hydration (4)**
17. Nutritional Assessment
18. Oral Assessment
19. Diet Notification
20. Choking Risk Assessment

**Continence (1)**
21. Bladder & Bowel Continence Assessment

**Skin & Wound Care (2)**
22. Skin Integrity / Tissue Viability Assessment
23. Braden Risk Assessment

**Medication & Pain (1)**
24. Pain Assessment

**Psychological & Mental Health (1)**
25. Cornell Scale for Depression in Dementia

**Personal Property (1)**
26. Resident Valuables and Personal Property

**Safety & Restraints (2)**
27. Restraints Consent & Risk Assessment
28. Smoking Risk Assessment

**Specimen & Lab (1)**
29. Specimen Record Log

#### Coming Soon Forms (17)
30. Capacity and Consent
31. Night Observation Consent
32. General Risk Assessment
33. Social Assessment
34. Life Story Workbook
35. Abbey Pain Tool
36. MUST Assessment
37. Weight Chart
38. Body Map (Hygiene)
39. Skin Integrity / Dermatology Assessment
40. Body Map (Skin)
41. Wound Assessment
42. Confidential Documents Upload
43. Safeguarding Risk Assessment
44. Safeguarding Body Map
45. DoLS Application Form
46. Monthly Care Assistant Report

---

### 1.3 Medication Management
**Route**: `/dashboard/residents/[id]/medication`

- **Medication Tracking**
  - Prescription management
  - Medication schedules
  - Stock management with automatic tracking
  - Automated medication alerts
  - Unique constraint for intake tracking

- **Medication Administration** (`/medication`)
  - Medication rounds tracking
  - Dosage and quantity recording
  - MAR (Medication Administration Records)
  - Administration timestamps
  - Alert dismissal system

- **Medication History** (`/medication/history`)
  - Historical medication records
  - Prescription changes tracking
  - Audit trail

- **Medication Documents** (`/medication/docs`)
  - Medication-related documentation
  - Prescription images/PDFs
  - Supporting documents

---

### 1.4 Health Monitoring & Clinical
**Route**: `/dashboard/residents/[id]/`

- **Health Monitoring** (`/health-monitoring`)
  - Vital signs tracking (temperature, blood pressure, pulse, respiration, SpO2)
  - Health assessments
  - Trend analysis
  - Alert thresholds

- **Clinical Notes** (`/clinical`)
  - Clinical observations
  - Medical documentation
  - Healthcare professional notes

- **Continence Management** (`/continence`)
  - Bowel and bladder care tracking
  - Continence product usage
  - Pattern analysis
  - Continence entries logging

---

### 1.5 Wound Management
**Routes**: `/dashboard/residents/[id]/wounds` and `/dashboard/wounds`

- **Wound Tracking**
  - Wound folder organization per resident
  - Wound type classification:
    - Pressure ulcer
    - Surgical wound
    - Traumatic wound
    - Diabetic ulcer
    - Arterial ulcer
    - Venous ulcer
  - Stage tracking (especially for pressure ulcers)
  - Status tracking: active, healing, healed, deteriorating, infected
  - Body location mapping

- **Wound Assessment**
  - Detailed measurements (length, width, depth in cm)
  - Wound bed description
  - Exudate type and amount
  - Surrounding skin condition
  - Odor assessment
  - Pain level tracking (0-10 scale)
  - Signs of infection monitoring
  - Image documentation support
  - Progress photography

- **Wound Care Management**
  - Treatment plan documentation
  - Dressing type tracking
  - Dressing frequency scheduling
  - Progress notes
  - Review scheduling with expected dates
  - Reviewer tracking
  - Care team coordination

- **Wound Assessments History**
  - Historical wound progression
  - Assessment timeline
  - Photograph evaluations
  - Treatment evaluations
  - Outcome tracking

- **Wounds Dashboard** (`/dashboard/wounds`)
  - Organization-wide wound overview
  - Filter by status (active, healing, deteriorating, infected)
  - Filter by room/unit
  - Excludes healed wounds
  - Card-based display with resident information
  - Quick access to wound details

---

### 1.6 Daily Care & Monitoring
**Route**: `/dashboard/residents/[id]/`

- **Food & Fluid Tracking** (`/food-fluid`)
  - Nutrition logging
  - Hydration tracking
  - Menu items management
  - Meal intake recording
  - Diet information
  - Diet notifications
  - Diet lifestyle preferences
  - Portion size tracking
  - Dietary restrictions

- **Daily Care** (`/daily-care`)
  - Personal care daily tracking
  - Personal care task events
  - Care activities logging
  - Bathing/showering records
  - Grooming activities
  - Dependency tracking
  - Care completion timestamps

- **Progress Notes** (`/progress-notes`)
  - Daily nursing notes
  - Shift-based documentation
  - Progress tracking
  - Behavioral observations
  - Care interventions
  - Multi-disciplinary input

- **Night Check** (`/night-check`)
  - Night check configurations
  - Night monitoring logs
  - Sleep pattern tracking
  - Night observation recordings
  - Safety checks

---

### 1.7 Documentation & Records
**Route**: `/dashboard/residents/[id]/`

- **Documents** (`/documents`)
  - File storage system
  - Document management
  - Folder organization
  - Document categories
  - Version control
  - Secure access control

- **Appointments** (`/appointments`)
  - Medical appointments scheduling
  - Appointment calendar
  - Appointment notes
  - Read status tracking
  - Upcoming appointment notifications
  - Reminder system
  - Appointment history

- **Multidisciplinary Notes** (`/multidisciplinary-note`)
  - MDT (Multidisciplinary Team) tracking
  - Care team member documentation
  - Collaborative care notes
  - Professional input from:
    - GPs
    - Physiotherapists
    - Occupational therapists
    - Speech therapists
    - Dietitians
    - Social workers

---

### 1.8 Hospital & Emergency
**Route**: `/dashboard/residents/[id]/`

- **Hospital Transfer** (`/hospital-transfer`)
  - Hospital passport generation
  - Transfer logs and documentation
  - Emergency information compilation
  - Transfer coordination
  - A&E information packet
  - Medication reconciliation
  - Current health status summary

---

### 1.9 Social Care
**Route**: `/dashboard/residents/[id]/`

- **Lifestyle & Social** (`/lifestyle-social`)
  - Personal interests tracking
  - Social activities logging
  - Hobbies and preferences
  - Social connections management
  - Relationship tracking
  - Family involvement
  - Activity participation

- **Additional Information** (`/additional`)
  - Supplementary resident information
  - Custom fields
  - Additional notes

---

### 1.10 Incident Management (Resident-Specific)
**Route**: `/dashboard/residents/[id]/incidents`

- **Incident Reporting**
  - Incident folder organization
  - Multiple incident report types:
    - Comprehensive incident form
    - Simple incident form
    - NHS report form
    - SEHSCT (South Eastern Health and Social Care Trust) report
    - Trust incident reports
    - Restrictive practice forms
  - Incident viewer
  - Body map integration for injury documentation
  - Witness statements
  - Follow-up actions
  - Incident notifications
  - Root cause analysis

---

## 2. STAFF MANAGEMENT

**Route**: `/dashboard/staff`

### 2.1 Staff Directory
- Staff member profiles
- Staff listing with search and filters
- Contact information
- Employment details
- Professional registration numbers

### 2.2 Role Management
Five role hierarchy:
1. **SaaS Admin** - Platform super administrator
2. **Owner** - Organization owner
3. **Manager** - Care home manager
4. **Nurse** - Nursing staff
5. **Care Assistant** - Care staff

### 2.3 Staff Details
**Route**: `/dashboard/staff/[id]/overview`
- Individual staff member information
- Personal details
- Professional qualifications
- Employment history
- Contact details

### 2.4 Staff Training
**Route**: `/dashboard/staff/[id]/trainings`
- Training records management
- Mandatory training tracking
- Training completion dates
- Certification tracking
- Training expiry alerts
- Compliance monitoring

### 2.5 Team Management
- Unit/team assignments
- Care home managers
- Unit staff tracking
- Shift patterns
- Staff scheduling

---

## 3. OPERATIONS FEATURES

### 3.1 Handover
**Route**: `/dashboard/handover`

- **Handover Reports**
  - Shift handover documentation
  - Handover comments and notes
  - Report viewing by shift
  - Staff-to-staff communication
  - Key information transfer
  - Action items

- **Handover Documents** (`/dashboard/handover/documents`)
  - Document management for handovers
  - Report archive
  - Historical handover access
  - Template management

---

### 3.2 Appointments
**Route**: `/dashboard/appointment`

- **Appointment Management**
  - Appointment scheduling
  - Calendar view
  - Appointment types:
    - GP visits
    - Specialist consultations
    - Diagnostic tests
    - Therapy sessions
  - Notification types:
    - Upcoming appointments
    - Reminders
    - Cancellations
  - Unread appointment tracking
  - Badge notifications in sidebar
  - Read status management

---

### 3.3 Incidents
**Route**: `/dashboard/incidents`

- **Organization-wide Incident Dashboard**
  - All incidents across organization
  - Incident overview cards
  - Incident notifications
  - Unread incident tracking with badges
  - Dismissible incident notifications
  - Filter by:
    - Incident type
    - Severity
    - Status
    - Date range
    - Unit/team
  - Incident analytics
  - Trend analysis

---

### 3.4 Action Plans
**Route**: `/dashboard/action-plans`

- **Action Plan Management**
  - Action plan tracking across multiple audit types:
    - Resident audit action plans
    - Care file audit action plans
    - Governance audit action plans
    - Clinical audit action plans
    - Environment audit action plans
  - Priority levels: Low, Medium, High
  - Status tracking:
    - Pending
    - In Progress
    - Completed
    - Overdue
  - Assignment management
  - Due date tracking
  - Status history
  - Comments and notes
  - New action plan notifications with badges
  - Progress tracking
  - Completion verification

---

### 3.5 Notifications
**Route**: `/dashboard/notification`

- **Notification System**
  - System-wide notifications
  - Per-user notification read status
  - Notification dismissal tracking
  - Real-time updates via Supabase subscriptions
  - Notification types:
    - Incident notifications
    - Appointment notifications (upcoming, reminder, cancellation)
    - Action plan notifications
    - General system notifications
    - Medication alerts
    - Audit reminders
  - Badge counters in sidebar
  - Notification center
  - Mark all as read
  - Filter and search

---

## 4. CLINICAL FEATURES

### 4.1 Wounds (Organization-wide)
**Route**: `/dashboard/wounds`

See Section 1.5 for detailed wound management features. This dashboard provides organization-wide visibility of all active wounds across all residents.

---

## 5. AUDIT SYSTEM

### 5.1 Care File Audit
**Route**: `/dashboard/manager-audit/0` (ID: 0)

- **Resident-based Auditing**
  - Audit individual resident care files
  - Modified diet audit entries
  - Care file compliance tracking
  - Resident selection for audits
  - Audit history per resident
  - Documentation completeness checks
  - Quality assurance
  - Compliance verification

---

### 5.2 CareO Audit
**Route**: `/dashboard/careo-audit`

#### Multi-Category Audit System (5 categories)

**1. Resident Audit**
- Quality assessments
- Care standards compliance
- Resident satisfaction
- Person-centered care evaluation

**2. Care File Audit**
- Documentation compliance
- Completeness checks
- Accuracy verification
- Record keeping standards

**3. Governance Audit**
- Regulatory compliance
- Policy adherence
- Legal requirements
- CQC standards

**4. Clinical Audit**
- Clinical procedures quality
- Clinical governance
- Evidence-based practice
- Clinical outcomes

**5. Environment Audit**
- Facility safety checks
- Environmental standards
- Health and safety compliance
- Infection control

#### Audit Templates
- Template creation and management
- Customizable questions/items
- Question types:
  - Yes/No
  - Multiple choice
  - Text response
  - Numeric scoring
- Frequency settings:
  - Monthly
  - Quarterly
  - Yearly
  - Ad-hoc
- Active/inactive template management
- Template versioning

#### Audit Completions
- Audit response tracking
- Status tracking:
  - Draft
  - In Progress
  - Completed
- Due date calculations
- Next audit scheduling
- Auditor tracking
- Completion history
- Audit reports
- Action plan generation

#### Archived Audits
**Route**: `/dashboard/careo-audit/archived`
- Archive management
- Historical audit access
- Compliance history

---

### 5.3 Manager Audit
**Route**: `/dashboard/manager-audit`

#### Pre-configured Manager Audits (31 standard audits)

**Clinical Audits (15)**
1. Accidents and Incidents Analysis
2. Bedrails Audit
3. Decontamination
4. DOLS (Deprivation of Liberty Safeguards)
5. Falls Analysis
6. Hand Hygiene Audit
7. Hoist and Sling Register
8. IPC (Infection Prevention Control) Short Audit
9. Medication Audit
10. Modified Diet Audit
11. Restrictive Practice
12. Safeguarding Database
13. Smoking Compliance
14. Weights Analysis
15. Wounds Analysis

**Operational Audits (4)**
16. Domestic Services
17. Catering Audit
18. Dining Experience
19. Domestic Audit

**Staff Audits (7)**
20. Agency Profiles and Induction Records
21. Competency Assessment Review
22. Mandatory Training Stats
23. NMC NISSC Logs
24. RTW (Return to Work) Tracker
25. Supervision and Appraisal Matrix
26. Personnel Files

**General Audits (5)**
27. Complaints Analysis
28. Safety Alerts
29. GDPR
30. Resident Agreement
31. Care File Audit (special)

#### Custom Audit Creation
Four audit template types:
1. **Resident-based Audit** - Audit per resident
2. **Home-based Audit** - Care home level audit
3. **Staff-based Audit** - With staff type selection (nurse, care assistant, etc.)
4. **Plain Template** - Generic audit template

**Category Assignment**:
- Clinical
- General
- Operational
- Staff

#### Audit Management Features
- Frequency management:
  - Monthly
  - Quarterly
  - 6-month
  - Yearly
- Status tracking:
  - New
  - In Progress
  - Completed
  - Due
- Due date calculations
- Audit history per audit type
- Report generation and viewing
- Filtering and search
- Audit scheduling
- Email reminders
- Completion tracking

---

## 6. SETTINGS & ADMINISTRATION

### 6.1 User Settings
**Route**: `/settings/`

**Profile** (`/settings/profile`)
- User profile management
- Personal information
- Profile photo
- Contact details
- Preferences

**Security** (`/settings/security`)
- Password management
- Password change
- Two-factor authentication (2FA)
- Session management (`/settings/members/session`)
- Active sessions viewing
- Device management
- Security logs

---

### 6.2 Organization Settings
**Route**: `/settings/`

**Company** (`/settings/company`)
- Company-level settings
- Organization logo URL
- Company information
- Branding customization

**Organization** (`/settings/organization`)
- Organization configuration
- Organization details
- Organization status tracking
- Manager permissions
- Care home structure
- Multi-site management

**Teams** (`/settings/teams`)
- Team/unit management
- Team creation
- Team details (`/settings/teams/[teamId]`)
- Unit configuration
- Care home floor/wing structure
- Team member assignments

**Members** (`/settings/members`)
- Member management
- User invitations
- Role assignment
- Member listing
- Invitation acceptance flow
- Member status tracking
- Deactivate/activate members

**Labels** (`/settings/labels`)
- Label/tag management
- Custom categorization
- Color coding
- Label organization
- Tag assignment

**Billing** (`/settings/billing`)
- Billing management
- Subscription plans
- Payment methods
- Invoice history
- Status: Placeholder (disabled in code)

---

## 7. PLATFORM ADMINISTRATION (SaaS Admin)

**Route**: `/admin/` (Requires SaaS Admin role)

### 7.1 Admin Dashboard
**Route**: `/admin`
- Platform overview
- System-wide analytics
- Usage statistics
- Active organizations
- Active users
- System health

### 7.2 Organizations Management
**Route**: `/admin/care-homes`
- View all organizations
- Organization listing
- Organization details (`/admin/care-homes/[orgId]`)
- Care home management (`/admin/care-homes/[orgId]/[careHomeId]`)
- Organization creation
- Organization settings
- Subscription management

### 7.3 Owners Management
**Route**: `/admin/owners`
- View all organization owners
- Create new owners (`/admin/owners/create`)
- Owner administration
- Owner permissions
- Organization assignment

### 7.4 Analytics
**Route**: `/admin/analytics`
- Platform-wide analytics
- Usage statistics
- Feature adoption metrics
- User engagement
- Performance metrics

### 7.5 SaaS Admins
**Route**: `/admin/admins`
- Manage platform administrators
- Admin user management
- Admin role assignment
- Super admin controls

---

## 8. PDF GENERATION & REPORTS

**Route**: `/api/pdf/`

### PDF Generation Endpoints (27 types)

**Assessment PDFs**
- Admission documents
- Bed Rails Risk Assessment
- Bedrail Consent
- Best Interest Decision
- Bladder & Bowel
- Braden Risk Assessment (future)
- Cornell Depression Scale
- Choking Risk Assessment
- Dependency Assessment
- Pain Assessment
- Nutritional Assessment
- Oral Assessment
- Skin Integrity
- TIML (This Is Me Later)
- Moving & Handling
- Long-term Falls Risk
- Infection Prevention

**Care Documentation PDFs**
- Daily Care
- Care Plan
- Multidisciplinary Note
- Progress Notes (future)

**Consent PDFs**
- Photography Consent
- PRN Consents (future)
- DNACPR
- PEEP

**Other PDFs**
- Diet Notification
- Resident Handling Profile
- Resident Valuables
- Pre-admission
- NHS Report (incidents)
- Trust Reports (future)
- Hospital Passport (future)
- Wound Assessment (future)

---

## 9. API ROUTES

**Route**: `/api/`

### Appointment APIs
- `/api/appointments` - CRUD operations
- `/api/appointments/[id]` - Single appointment
- `/api/appointments/[id]/read` - Mark as read
- `/api/appointments/read` - Bulk read operations
- `/api/appointments/resident/[residentId]` - Resident appointments
- `/api/appointments/upcoming` - Upcoming appointments
- `/api/appointment-notes` - Appointment notes
- `/api/appointment-notes/[id]` - Single note

### Progress Notes APIs
- `/api/progress-notes` - CRUD operations
- `/api/progress-notes/[id]` - Single note
- `/api/progress-notes/all` - All notes
- `/api/progress-notes/stats` - Statistics

### Manager Audit APIs
- `/api/manager-audit/modified-diet` - Modified diet audit

### Utility APIs
- `/api/chat` - Chat/AI functionality
- `/api/pdf/get-url` - PDF URL generation

---

## 10. AUTHENTICATION & AUTHORIZATION

### 10.1 Authentication Features
- **BetterAuth Integration**
  - Session-based authentication
  - Email/password authentication
  - Secure password hashing
  - Two-factor authentication (2FA) support
  - Password reset flows
  - Email verification
  - Session management
  - Remember me functionality

### 10.2 Authorization & Access Control

**Role-Based Access Control (RBAC)**

Five user roles with hierarchical permissions:
1. **SaaS Admin** - Super administrator with platform-wide access
2. **Owner** - Organization owner with full organization access
3. **Manager** - Care home manager with management capabilities
4. **Nurse** - Nursing staff with clinical access
5. **Care Assistant** - Care staff with limited access

**Permission Features**:
- Granular permissions per feature
- Field-level sensitive data protection
- Action-based permissions (view, create, edit, delete)
- Resource-based access control
- Role hierarchy enforcement

### 10.3 Multi-tenancy
- Organization-level data isolation
- Care home structure with multiple sites
- Team/unit-based access control
- Active organization/team switching
- Cross-organization data separation
- Row Level Security (RLS) policies

---

## 11. REAL-TIME FEATURES

### 11.1 Supabase Real-time Subscriptions
- Notification updates
- Incident updates
- Appointment updates
- Action plan updates
- Medication alert updates
- Resident data changes
- Live data synchronization

### 11.2 Live Badge Counters
- Unread incidents badge
- Unread appointments badge
- Unread notifications badge
- New action plans badge
- Real-time counter updates
- Sidebar notification indicators

---

## 12. COMPLIANCE & REGULATORY

### 12.1 NHS Integration
- NHS health number tracking
- NHS trust incident reporting
- NHS-compliant documentation
- NHS DNACPR standards
- NHS data standards compliance

### 12.2 UK Healthcare Compliance
- **SEHSCT Reporting** - South Eastern Health and Social Care Trust
- **CQC Alignment** - Care Quality Commission standards
- **GDPR Compliance** - Data protection features
- **DOLS** - Deprivation of Liberty Safeguards
- **Safeguarding Database** - Safeguarding records management
- **Mental Capacity Act** - Capacity and consent documentation
- **NICE Guidelines** - Clinical assessment tools

### 12.3 Audit Trails
- Comprehensive change tracking
- Created/updated timestamps on all records
- User attribution for all actions
- Version tracking for assessments
- Manager audits with form change detection
- Immutable audit logs
- Compliance reporting

---

## 13. DATA MANAGEMENT

### 13.1 Database Features
- **Supabase/PostgreSQL Database**
  - 80+ tables for comprehensive care management
  - Row Level Security (RLS) policies
  - Automated triggers for timestamps
  - Foreign key relationships
  - Indexes for query optimization
  - Database migrations
  - Backup and recovery

### 13.2 File Storage
- **Supabase Storage Integration**
  - Image uploads (resident photos, wound photos)
  - Document storage
  - PDF generation and storage
  - RLS policies for file access
  - Secure file URLs
  - File size limits
  - File type validation

### 13.3 Emergency Contacts
- Multiple emergency contacts per resident
- Contact relationship tracking
- Priority ordering
- Contact details (phone, email, address)
- Next of kin designation
- Power of attorney information

---

## 14. ALERTS & NOTIFICATIONS SYSTEM

### 14.1 Alert Management
- **Alert Types**:
  - Medication alerts (automated)
  - Resident-specific alerts
  - Clinical alerts
  - Safety alerts
  - System alerts

- **Alert Features**:
  - Severity levels (critical, warning, info)
  - Per-user alert dismissals
  - Alert resolution tracking
  - Alert history
  - Alert notifications
  - Alert escalation

### 14.2 Notification System
- **Notification Types**:
  - System notifications
  - Incident notifications
  - Appointment reminders
  - Action plan notifications
  - Medication reminders
  - Audit reminders
  - Training expiry notifications

- **Notification Features**:
  - Per-user read/dismiss tracking
  - Real-time push notifications
  - Email notifications
  - In-app notifications
  - Notification preferences
  - Notification history

---

## 15. BODY MAPPING

### 15.1 Body Map Features
- Resident body maps
- Care folder body maps
- Incident body map data
- Injury location tracking
- Visual documentation
- Front and back body views
- Detailed anatomical marking
- Color coding for different issue types
- Body map annotations

---

## 16. ONBOARDING

**Route**: `/(onboarding)/`

### 16.1 User Onboarding
- New user onboarding flow
- Organization setup wizard
- Initial configuration
- Welcome screens
- Feature introduction
- Role assignment
- Team assignment

---

## FEATURE ACCESS BY ROLE

| Feature | SaaS Admin | Owner | Manager | Nurse | Care Assistant |
|---------|-----------|-------|---------|-------|----------------|
| Platform Admin | ✅ | ❌ | ❌ | ❌ | ❌ |
| Residents (View) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Residents (Create/Edit) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Staff Management | ✅ | ✅ | ✅ | ❌ | ❌ |
| Care Files | ✅ | ✅ | ✅ | ✅ | ❌ |
| Medications | ✅ | ✅ | ✅ | ✅ | ❌ |
| Incidents (Create) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Incidents (View) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Appointments | ✅ | ✅ | ✅ | ✅ | ❌ |
| Handover | ✅ | ✅ | ✅ | ✅ | ✅ |
| Notifications | ✅ | ✅ | ✅ | ✅ | ✅ |
| Audits (Create/Edit) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Audits (View) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Action Plans | ✅ | ✅ | ✅ | ✅ | ❌ |
| Wounds (Create/Edit) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Wounds (View) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Settings (Org) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Settings (Personal) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Food & Fluid Logs | ✅ | ✅ | ✅ | ✅ | ✅ |
| Daily Care | ✅ | ✅ | ✅ | ✅ | ✅ |
| Progress Notes | ✅ | ✅ | ✅ | ✅ | ❌ |
| Hospital Passport | ✅ | ✅ | ✅ | ✅ | ❌ |

---

## IMPLEMENTATION STATUS

### ✅ Fully Implemented
- Resident management (all core features)
- Care file management V2 (29 forms)
- Medication management and tracking
- Wound management system
- Health monitoring and vitals
- Continence tracking
- Food & fluid logging
- Daily care tracking
- Progress notes
- Incident management
- Appointments and scheduling
- Hospital transfers and passports
- Lifestyle and social care
- Staff management
- Handover system
- Notifications and alerts
- Action plans (all 5 types)
- Audit system (3 types: Care File, CareO, Manager)
- Settings and administration
- Platform admin dashboard
- Authentication and RBAC
- Real-time updates
- PDF generation (27 types)
- API routes
- Multi-tenancy
- Body mapping
- Emergency contacts
- Night checks
- Multidisciplinary notes
- Clinical notes
- Documents management

### 🚧 Partially Implemented
- Care File V1 (legacy, can be disabled via feature flag)
- Care File V2 (17 forms coming soon)
- Billing (placeholder in settings)

### 📊 Database Schema Complete
All 80+ tables implemented covering:
- Users and authentication
- Organizations, care homes, teams
- Residents and emergency contacts
- All 29 assessment types
- Medications and intakes
- Incidents and reports
- Audits (all 3 types)
- Action plans (all 5 types)
- Wounds and assessments
- Notifications and alerts
- Documents and files
- Appointments
- Progress notes
- Food & fluid logs
- Daily care records
- Handover reports
- Staff training
- Body maps

---

## TECHNOLOGY STACK SUMMARY

**Frontend**
- Next.js 15 with App Router
- React 19
- TypeScript (strict mode)
- shadcn/ui component library
- Radix UI primitives
- Tailwind CSS v4
- React Hook Form
- Zod validation
- Recharts for data visualization

**Backend**
- Supabase (PostgreSQL database)
- Supabase Real-time subscriptions
- Supabase Storage
- Better Auth for authentication
- Custom API routes

**Development**
- Turbopack for fast development
- ESLint for code quality
- Playwright for E2E testing (configured)
- TypeScript strict mode

**Deployment**
- Optimized production builds
- Edge-ready architecture
- CDN integration

---

## SUMMARY STATISTICS

- **Total Features**: 100+ distinct features
- **Care File Forms**: 46 (29 implemented, 17 coming soon)
- **Audit Types**: 3 major systems (31+ pre-configured audits)
- **PDF Types**: 27 document types
- **User Roles**: 5 role levels
- **Database Tables**: 80+
- **API Endpoints**: 15+ routes
- **Navigation Categories**: 4 main sections
- **Real-time Features**: 5+ subscription types
- **Notification Types**: 6+ notification categories
- **Alert Types**: 5+ alert categories

---

**Last Updated**: March 9, 2026
**Platform Version**: Active Development
**Documentation Status**: Comprehensive feature inventory complete