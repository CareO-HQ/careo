# Feature Requirement Document (FRD): Agency Management & Staff Personas

## 1. Executive Summary
CareO aims to extend its ecosystem by allowing third-party staffing agencies to provide temporary staff to care homes. This document defines the requirements for Agency onboarding, staff assignment, and a controlled approval process by care home management, including strict session management.

---

## 2. Personas

| Persona | Description | Primary Goal |
|---------|-------------|--------------|
| **Agency** | A third-party organization providing healthcare staff. | Register, manage staff pool, and assign staff to care homes. |
| **Agency Nurse** | Clinical staff provided by an agency. | Perform clinical duties at an assigned care home for a fixed duration. |
| **Agency Care Assistant** | Support staff provided by an agency. | Assist with daily care at an assigned care home for a fixed duration. |
| **Care Home Manager/Nurse** | Staff at the receiving care home. | Approve agency staff, set shift durations, and manage session security. |

---

## 3. User Journeys

### 3.1 Agency Onboarding & Staff Management
1. **Agency Registration**:
   - The agency visits the "Agency Register" page on the public website.
   - Fills in: Agency Name, Regulatory Body Details (e.g., CQC registration), Contact Info, and Admin Credentials.
2. **Staff Onboarding**:
   - Agency Admin creates profiles for their staff members (Nurses and Care Assistants).
3. **Staff Assignment**:
   - Agency Admin selects a staff member and chooses "Assign to Care Home".
   - Fields required:
     - **Staff Member**: (Selected from their pool).
     - **Care Home ID**: (A unique identifier provided to them by the care home).
     - **Role**: (Agency Nurse or Agency Care Assistant).
     - **Proposed Date/Time**: (Optional).

### 3.2 Care Home Approval Workflow
1. **Notification**: The Manager or Nurse at the target care home receives an alert of a pending agency assignment.
2. **Approval Interface**:
   - The approver sees the staff name, agency name, and role.
   - **Set Duration**: The approver must specify the duration the staff member is allowed to work (e.g., HH:MM).
   - **Forceful Logout Toggle**:
     - A checkbox labeled: **"Automatically log out staff when duration expires"**.
     - **Logic**: 
       - **Checked**: The staff member's session is terminated immediately when the clock hits the end of the duration.
       - **Unchecked**: The staff member can finish their task before logging out manually, though they may be marked as "Shift Ended" in logs.
3. **Activation**: Upon approval, the staff member is granted access to the care home's data for the specified window.

---

## 4. Functional Requirements

### 4.1 Agency Portal
- Dedicated dashboard for Agency Admins.
- Interface to view "Active Assignments" and "History".
- Ability to manage "Staff Pool" (Add/Edit/Remove staff).

### 4.2 Assignment System
- **Care Home ID Verification**: The system must validate that the entered Care Home ID exists before allowing the assignment request to be sent.
- **Role Mapping**: Agency roles must map to existing system permissions (`nurse` permissions for Agency Nurse, etc.).

### 4.3 Session & Security Management
- **Force Logout Implementation**:
  - If enabled, a background process or middleware must check the current time against `assignment_start_time + duration`.
  - On expiry, the user must be redirected to the login page with a notification: "Your session has expired as per the assigned shift duration."
- **Data Scoping**: Agency staff should only see residents and data within the organization they are assigned to, and only during their active window.

---

## 5. Technical Considerations

### 5.1 Data Model (Proposed)
- **`organizations` Table**: Add `org_type` (Enum: `care_home`, `agency`).
- **`agency_staff_assignments` Table**:
  - `id` (UUID)
  - `agency_id` (UUID - Foreign Key)
  - `staff_member_id` (UUID - Foreign Key to `users`)
  - `care_home_id` (UUID - Foreign Key to `organizations`)
  - `role` (Enum: `agency_nurse`, `agency_care_assistant`)
  - `status` (Enum: `pending`, `approved`, `active`, `completed`, `rejected`)
  - `duration_minutes` (Integer)
  - `force_logout` (Boolean)
  - `approved_at` (Timestamp)
  - `expires_at` (Timestamp - Calculated as `approved_at + duration`)

### 5.2 UI Components
- **Agency Registration Form**: Sleek, multi-step form with document upload for agency credentials.
- **Assignment Dashboard**: A card-based view showing pending staff requests.
- **Approval Modal**: A premium Shadcn-style dialog with a duration picker and a high-visibility toggle for the forceful logout.

---

## 6. Design & Aesthetics
- **Agency Branding**: The Agency portal should feel distinct but consistent with the CareO design system.
- **Urgency Indicators**: For "Force Logout" scenarios, a countdown timer in the header for the agency staff member to warn them of impending logout (e.g., "5 minutes remaining").

---

## 7. Success Metrics
- Average time from agency staff assignment to care home approval.
- Number of successful sessions managed with forceful logout.
- Reduced manual administrative overhead for care home managers when onboarding temporary staff.
