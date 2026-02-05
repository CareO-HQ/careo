# CareO Application Context and Role Structure

## Application Overview

**CareO** is a comprehensive care home management system designed to streamline operations, enhance resident care quality, and ensure regulatory compliance (GDPR, UK Healthcare Standards). The platform provides a digital ecosystem for care homes to manage everything from resident documentation and medication administration to staff auditing and shift handovers.

### Core Modules
- **Resident Management**: Unified profiles for residents with medical history, room assignments, and contact details.
- **Care Documentation**: Digital "Care Files" for various assessments (Bladder & Bowel, Moving & Handling, Skin Integrity, etc.).
- **Medication Management**: Tracking prescriptions, intake rounds, and PRN (as needed) administration with witness signatures.
- **Food & Fluid Portal**: Monitoring dietary intake and hydration levels with built-in alerts for risk management.
- **Audit System**: Governance and clinical audits to maintain high standards of care.
- **Incident Reporting**: Structured reporting for incidents and falls with automated trust-level reports (NHS, BHSCT, etc.).
- **Handover & Communication**: Shift reports and team communication tools.

---

## Organizational Structure

The system follows a hierarchical organizational structure:

1. **Organization**: The top-level entity representing a care provider or group.
2. **Care Home**: Individual physical locations belonging to an organization.
3. **Unit/Team**: Specific departments or floors within a care home (e.g., Nursing Unit, Residential Wing).

---

## Role Definitions

CareO utilizes a Role-Based Access Control (RBAC) system with five distinct levels:

### 1. SaaS Admin (`saas_admin`)
*   **Purpose**: Internal system administration for the CareO platform.
*   **Context**: Operates across all organizations.
*   **Capabilities**: Global configuration, platform-level monitoring, and emergency support access.

### 2. Owner (`owner`)
*   **Purpose**: Proprietors or senior executives of a care group.
*   **Context**: Scoped to the entire organization.
*   **Capabilities**: Full control over organization settings, finances (if applicable), high-level auditing, and the ability to invite Managers.

### 3. Manager (`manager`)
*   **Purpose**: Home managers or clinical leads overseeing daily operations.
*   **Context**: Scoped to assigned Care Homes within an organization.
*   **Capabilities**: Staff management, team creation, CareO Audit access, and oversight of all resident care within their facility.

### 4. Nurse (`nurse`)
*   **Purpose**: Registered clinical staff.
*   **Context**: Scoped to assigned Units within a Care Home.
*   **Capabilities**: Clinical documentation, medication administration, incident reporting, and health monitoring.

### 5. Care Assistant (`care_assistant`)
*   **Purpose**: Support staff providing direct resident care.
*   **Context**: Scoped to assigned Units within a Care Home.
*   **Capabilities**: Daily care logging, food & fluid tracking, lifestyle activity documentation, and viewing resident alerts.

---

## Capability Matrix

| Feature | Owner | Manager | Nurse | Care Assistant |
| :--- | :---: | :---: | :---: | :---: |
| **System Admin** | ✅ | ❌ | ❌ | ❌ |
| **Invite Staff** | ✅ (Manager) | ✅ (Nurse/CA) | ❌ | ❌ |
| **Manage Care Homes/Units** | ✅ | ✅ | ❌ | ❌ |
| **Resident Profiles (View/Edit)** | ✅/✅ | ✅/✅ | ✅/❌ | ✅/❌ |
| **Care File (Assessments)** | Full Access | Full Access | Create/Edit | ❌ |
| **Medication Admin** | View | View | Full Access | ❌ |
| **Food & Fluid Logging** | Full Access | Full Access | Full Access | Create/Edit |
| **Incident Reporting** | Oversight | Oversight | Full Access | ❌ |
| **Clinical Audits** | ✅ | ✅ | ❌ | ❌ |
| **Daily Progress Notes** | View | View | Create/Edit | ❌ |
| **Lifestyle/Social Logs** | ✅ | ✅ | ✅ | ✅ |
| **Night Checks** | ✅ | ✅ | ✅ | ✅ |

---

## Security and Enforcement

Role-based restrictions are enforced through a multi-layered security architecture:

- **Authentication**: Managed via **Supabase Auth**, providing secure JWT-based sessions.
- **Authorization (RLS)**: **PostgreSQL Row-Level Security (RLS)** policies ensure that users can only access data belonging to their Organization and assigned Care Home/Unit.
- **Middleware**: Next.js middleware protects dashboard routes based on authentication state.
- **Frontend Gating**: UI components are conditionally rendered based on the user's role metadata stored in the Supabase session.
- **Audit Logging**: All sensitive actions are recorded in immutable audit logs for GDPR compliance and accountability.
