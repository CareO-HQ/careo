# Role-Based Access Control (RBAC) Documentation

## Overview

Careo implements a hierarchical Role-Based Access Control system for managing care home operations. The system is built on top of Better Auth's organization plugin and provides granular permissions for different user roles.

## Roles

The system defines **4 primary roles** plus an **admin** role:

| Role | Description | Hierarchy Level |
|------|-------------|-----------------|
| **Owner** | Care home owner/operator with full system access | Highest |
| **Manager** | Care home manager with administrative capabilities | High |
| **Nurse** | Clinical staff with patient care responsibilities | Medium |
| **Care Assistant** | Support staff with basic care duties | Basic |
| **Admin** | System administrator (internal) | Highest |

---

## Role Definitions

### 1. Owner (`owner`)

**Purpose**: The owner role is intended for care home proprietors or senior administrators who need complete oversight and control over all aspects of the care home management system.

**Key Responsibilities**:
- Full organizational control
- Staff management (can invite managers)
- Access to all audit logs
- Complete resident data access
- System configuration

**Onboarding Flow**: 4 steps
1. Profile setup
2. Theme selection
3. Create care home (organization)
4. Invite management team

---

### 2. Manager (`manager`)

**Purpose**: Managers oversee day-to-day operations and have elevated permissions to manage staff and monitor care quality.

**Key Responsibilities**:
- Staff management within their organization
- Can invite nurses and care assistants
- Access to CareO Audit features
- Resident care oversight
- Team management

**Onboarding Flow**: 3 steps
1. Profile setup
2. Theme selection
3. Create teams

---

### 3. Nurse (`nurse`)

**Purpose**: Clinical staff responsible for medication administration, health monitoring, and clinical documentation.

**Key Responsibilities**:
- Patient care documentation
- Medication management
- Clinical assessments
- Incident reporting
- Health monitoring

**Onboarding Flow**: 2 steps
1. Profile setup
2. Theme selection

---

### 4. Care Assistant (`care_assistant`)

**Purpose**: Support staff who assist with daily living activities and basic care tasks.

**Key Responsibilities**:
- Daily care logging
- Food and fluid tracking
- Lifestyle and social activities
- Basic resident support

**Onboarding Flow**: 2 steps
1. Profile setup
2. Theme selection

---

## Permission Matrix

### Sidebar Navigation Permissions

| Feature | Owner | Manager | Nurse | Care Assistant |
|---------|:-----:|:-------:|:-----:|:--------------:|
| Home/Dashboard | ✅ | ✅ | ✅ | ✅ |
| Residents | ✅ | ✅ | ✅ | ✅ |
| Staff | ✅ | ✅ | ❌ | ❌ |
| Handover | ✅ | ✅ | ✅ | ❌ |
| Appointments | ✅ | ✅ | ✅ | ❌ |
| Incidents | ✅ | ✅ | ✅ | ❌ |
| Action Plans | ✅ | ✅ | ✅ | ❌ |
| Notifications | ✅ | ✅ | ✅ | ✅ |
| Audit | ✅ (Full) | ✅ (CareO) | ❌ | ❌ |

---

### Resident Section Permissions

| Section | Owner | Manager | Nurse | Care Assistant |
|---------|:-----:|:-------:|:-----:|:--------------:|
| **Overview** | | | | |
| - View | ✅ | ✅ | ✅ | ✅ |
| - Edit | ✅ | ✅ | ❌ | ❌ |
| **Care File** | | | | |
| - View | ✅ | ✅ | ✅ | ❌ |
| - Fill Forms | ✅ | ✅ | ✅ | ❌ |
| **Medication** | | | | |
| - View | ✅ | ✅ | ✅ | ❌ |
| **Food & Fluid** | | | | |
| - Add Diet Menu | ✅ | ✅ | ✅ | ❌ |
| - Log Entries | ✅ | ✅ | ✅ | ✅ |
| **Daily Care** | | | | |
| - Create Quick Notes | ✅ | ✅ | ✅ | ❌ |
| - Log Daily Care | ✅ | ✅ | ✅ | ✅ |
| **Night Check** | | | | |
| - View | ✅ | ✅ | ✅ | ✅ |
| - Add | ✅ | ✅ | ✅ | ❌ |
| **Progress Notes** | ✅ | ✅ | ✅ | ❌ |
| **Documents** | ✅ | ✅ | ✅ | ❌ |
| **Appointments** | ✅ | ✅ | ✅ | ❌ |
| **Incidents & Falls** | | | | |
| - View | ✅ | ✅ | ✅ | ❌ |
| - Create | ✅ | ✅ | ✅ | ❌ |
| - Edit | ✅ | ✅ | ✅ | ❌ |
| **Health Monitoring** | ✅ | ✅ | ✅ | ❌ |
| **Clinical** | ✅ | ✅ | ✅ | ❌ |
| **Lifestyle & Social** | ✅ | ✅ | ✅ | ✅ (Recording) |
| **Hospital Transfer** | ✅ | ✅ | ✅ | ❌ |
| **Multidisciplinary Notes** | ✅ | ✅ | ✅ | ❌ |

---

### Administrative Permissions

| Action | Owner | Manager | Nurse | Care Assistant |
|--------|:-----:|:-------:|:-----:|:--------------:|
| View Staff List | ✅ | ✅ | ❌ | ❌ |
| View Audit Logs | ✅ | ✅ | ❌ | ❌ |
| Invite Members | ✅ | ✅ | ❌ | ❌ |
| Manage Diet | ✅ | ✅ | ✅ | ❌ |

---

### Invitation Hierarchy

The system enforces a strict invitation hierarchy:

```
Owner
  └── Can invite: Manager

Manager
  └── Can invite: Nurse, Care Assistant

Nurse
  └── Cannot invite anyone

Care Assistant
  └── Cannot invite anyone
```

---

## Alert Visibility by Role

Different roles receive different types of alerts:

| Alert Type | Owner | Manager | Nurse | Care Assistant |
|------------|:-----:|:-------:|:-----:|:--------------:|
| Food & Fluid | ❌ | ❌ | ❌ | ✅ |
| Medication | ❌ | ❌ | ✅ | ❌ |
| General Alerts | ✅ | ✅ | ✅ | ✅ |

---

## Better Auth Integration

### Organization Role Mapping

The roles are mapped to Better Auth's organization access control:

```typescript
export const organizationRoles = {
  owner: ownerAc,      // Full organization control
  admin: adminAc,      // Administrative access
  manager: adminAc,    // Managers get admin-level org access
  nurse: memberAc,     // Standard member access
  care_assistant: memberAc,  // Standard member access
  member: memberAc     // Default member access
};
```

### Access Control Levels

| Better Auth AC | Careo Roles | Capabilities |
|----------------|-------------|--------------|
| `ownerAc` | Owner | Full CRUD on organization, members, teams |
| `adminAc` | Manager, Admin | Manage members, invite users, manage teams |
| `memberAc` | Nurse, Care Assistant | View access, limited write access |

---

## Implementation Details

### Permission Functions

All permission checks are implemented in `lib/permissions.ts`:

```typescript
// Type definition
export type UserRole = "owner" | "manager" | "nurse" | "care_assistant";

// Example permission function
export function canViewSidebarStaff(role?: string): boolean {
    return role === "owner" || role === "manager" || role === "admin";
}
```

### Usage in Components

```typescript
import { canViewSidebarStaff } from "@/lib/permissions";

// In component
const { role } = useCurrentUserRole();
if (canViewSidebarStaff(role)) {
  // Show staff navigation item
}
```

### Usage in Server Actions/API Routes

```typescript
import { canEditOverview, UserRole } from "@/lib/permissions";

// In server action or API route handler
const userRole = member?.role as UserRole;
if (!canEditOverview(userRole)) {
  throw new Error("Unauthorized: Cannot edit resident overview");
}
```

### Row Level Security (RLS) Policies

Permissions are also enforced at the database level through Supabase RLS policies. These policies automatically filter data based on:
- User's `active_organization_id`
- User's `active_team_id`
- User's role from `auth.users.app_metadata.role`

---

## Security Considerations

1. **Server-Side Validation**: All permission checks are performed server-side in Next.js server actions and API routes, with additional enforcement via Supabase RLS policies
2. **Role Inheritance**: Roles do not inherit permissions from lower roles by default
3. **Organization Scope**: All permissions are scoped to the user's active organization
4. **Team Scope**: Some operations are further scoped to the user's active team
5. **Session-Based**: Role information is retrieved from the authenticated session

---

## Quick Reference Card

### Owner Can:
- ✅ Everything
- ✅ Invite managers
- ✅ Full audit access
- ✅ Organization settings

### Manager Can:
- ✅ Manage staff (nurses, care assistants)
- ✅ Create/manage teams
- ✅ CareO Audit access
- ✅ All resident operations
- ❌ Invite other managers

### Nurse Can:
- ✅ Clinical documentation
- ✅ Medication management
- ✅ Incident reporting
- ✅ Health monitoring
- ❌ Staff management
- ❌ Audit access

### Care Assistant Can:
- ✅ Daily care logging
- ✅ Food & fluid tracking
- ✅ Lifestyle activities (Logging & Recording)
- ✅ Night check viewing
- ❌ Clinical features
- ❌ Medication access
- ❌ Care file access
