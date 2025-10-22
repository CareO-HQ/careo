# CareO Audit System - Analysis & Production Roadmap

## Executive Summary

**Current Status**: Pre-Production (Prototype Phase)
**Production Readiness**: ~35%
**Critical Issues**: Data persistence, backend integration, validation, security
**Estimated Development Time**: 4-6 weeks for production-ready implementation

---

## Table of Contents
1. [Current System Overview](#current-system-overview)
2. [Audit Tabs Analysis](#audit-tabs-analysis)
3. [Architecture Analysis](#architecture-analysis)
4. [Critical Issues](#critical-issues)
5. [Production Roadmap](#production-roadmap)
6. [Technical Specifications](#technical-specifications)
7. [Implementation TODO](#implementation-todo)

---

## Current System Overview

### What Currently Exists

The CareO Audit system at `/dashboard/careo-audit` is a **multi-tab audit management interface** with the following components:

#### 5 Main Audit Categories (Tabs):
1. **Resident Audit** - Quality checks across residents with customizable questions
2. **Care File Audit** - Resident-specific care documentation review
3. **Governance & Complaints** - Organizational compliance tracking
4. **Clinical Care & Medicines** - Clinical quality assurance
5. **Environment & Safety** - Facility and safety audits

#### Backend Infrastructure (Convex):
- **`managerAudits` table** - Stores completed form audits
- **`residentAuditItems` table** - Tracks resident-specific audit items
- **`convex/managerAudits.ts`** - 849 lines of audit logic including:
  - Form audit creation and tracking
  - Form change detection (smart diff algorithm)
  - Review and resubmission workflows
  - Audit statistics and reporting
- **`convex/residentAuditItems.ts`** - Resident audit item management

---

## Audit Tabs Analysis

### Tab 1: Resident Audit ✅ Most Advanced

**Location**: [`app/(dashboard)/dashboard/careo-audit/resident/[auditId]/page.tsx`](app/(dashboard)/dashboard/careo-audit/resident/[auditId]/page.tsx)

**How It Works**:
- Displays all residents from the active team in a table format
- Allows creation of custom audit questions (compliance or yes/no type)
- Supports dynamic column resizing
- Includes date tracking and comments per resident
- Action plan functionality for audit follow-ups

**Current State**:
- ✅ Dynamic resident loading from database
- ✅ Custom question builder with two types: compliance/yes-no
- ✅ Resizable columns with drag handles
- ✅ Date picker for audit dates per resident
- ✅ Comment/notes field per resident
- ✅ Action plan creation with assignment, due dates, and priority
- ❌ **NO backend persistence** - all data in component state
- ❌ No connection to `residentAuditItems` table
- ❌ Audit definitions stored in localStorage only
- ❌ No data validation or error handling

**Improvements Needed**:
1. Connect to Convex backend for data persistence
2. Save audit templates and responses to database
3. Add audit completion workflow and sign-off
4. Implement PDF export functionality
5. Add bulk actions (assign auditor, set dates)
6. Historical audit comparison and trends

---

### Tab 2: Care File Audit ⚠️ Partially Implemented

**Location**: [`app/(dashboard)/dashboard/careo-audit/[residentId]/carefileaudit/page.tsx`](app/(dashboard)/dashboard/careo-audit/[residentId]/carefileaudit/page.tsx)

**How It Works**:
- Shows care file audit items for a specific resident
- Lists standard care file documents (Pre-Admission, Admission, Risk Assessment, etc.)
- Tracks status, auditor, last audited date, and due date
- Links to individual audit detail views

**Current State**:
- ✅ Resident data fetched from database
- ✅ Hardcoded audit items (5 default items)
- ✅ Add new audit item dialog
- ✅ Status badges (completed, pending, overdue)
- ❌ **NO backend persistence** - uses component state
- ❌ Hardcoded data does not reflect actual care file completion
- ❌ Should integrate with `getUnauditedForms` query from `managerAudits.ts`
- ❌ No actual audit review workflow

**Current Hardcoded Items**:
```typescript
Pre-Admission Assessment, Admission Assessment, Risk Assessment,
Care Plan, Medication Review
```

**Improvements Needed**:
1. **CRITICAL**: Replace hardcoded data with real care file status from database
2. Use `api.managerAudits.getUnauditedForms` to show forms needing audit
3. Integrate with `api.managerAudits.getAuditsByResident` for audit history
4. Show completion percentage based on actual form submissions
5. Link to actual care file forms for review
6. Implement `submitReviewedForm` workflow from managerAudits.ts
7. Add filtering by form type and status

---

### Tab 3: Governance & Complaints ⚠️ Template Only

**Location**: [`app/(dashboard)/dashboard/careo-audit/governance/[auditId]/page.tsx`](app/(dashboard)/dashboard/careo-audit/governance/[auditId]/page.tsx)

**How It Works**:
- Similar structure to Clinical Care tab
- Designed for compliance checklists
- Action plan functionality

**Current State**:
- ✅ UI framework in place
- ✅ Action plan creation
- ❌ **NO backend integration**
- ❌ Empty audit items list
- ❌ No predefined governance checklist
- ❌ No connection to actual complaints or incidents

**What Should Be Included**:
- CQC compliance checklist
- Complaints tracking and resolution
- Safeguarding audit items
- Policy review status
- GDPR compliance checks
- Staff training compliance
- Incident trends analysis

---

### Tab 4: Clinical Care & Medicines ⚠️ Template Only

**Location**: [`app/(dashboard)/dashboard/careo-audit/clinical/[auditId]/page.tsx`](app/(dashboard)/dashboard/careo-audit/clinical/[auditId]/page.tsx)

**How It Works**:
- Checklist-style audit items
- Status dropdown per item (N/A, Yes, No, Partial)
- Comment field for notes
- Action plan functionality

**Current State**:
- ✅ UI complete with status selection
- ✅ Add new item dialog
- ✅ Action plan workflow
- ❌ **NO backend integration**
- ❌ Empty items on load
- ❌ No predefined clinical audit checklist

**What Should Be Included**:
- Medication administration record (MAR) review
- Controlled drugs audit
- PRN medication appropriateness
- Clinical observation records
- Falls management review
- Wound care documentation
- Nutrition and hydration monitoring
- GP visit documentation

---

### Tab 5: Environment & Safety ⚠️ Template Only

**Location**: [`app/(dashboard)/dashboard/careo-audit/environment/[auditId]/page.tsx`](app/(dashboard)/dashboard/careo-audit/environment/[auditId]/page.tsx)

**How It Works**:
- Same structure as Clinical Care and Governance tabs
- Checklist with status dropdowns

**Current State**:
- ✅ UI framework complete
- ❌ **NO backend integration**
- ❌ No predefined safety checklist

**What Should Be Included**:
- Fire safety equipment checks
- Emergency lighting tests
- Call bell functionality
- Water temperature checks
- Infection control audits
- Cleaning schedules compliance
- Equipment maintenance logs
- Health and safety risk assessments
- COSHH compliance

---

## Architecture Analysis

### Current Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Client Components)              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Resident    │  │  Care File   │  │  Clinical/   │      │
│  │  Audit       │  │  Audit       │  │  Governance  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
│         └─────────────────┴──────────────────┘               │
│                          │                                   │
│                    localStorage                              │
│                  (temporary storage)                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                    ❌ NOT CONNECTED
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    BACKEND (Convex)                          │
│  ┌────────────────────────────────────────────────────┐     │
│  │  managerAudits.ts (BUILT BUT UNUSED)               │     │
│  │  - 849 lines of audit logic                        │     │
│  │  - Form change detection                           │     │
│  │  - Review workflows                                │     │
│  │  - Statistics                                      │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Database Tables                                   │     │
│  │  - managerAudits (6 indexes)                       │     │
│  │  - residentAuditItems (4 indexes)                  │     │
│  └────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

### Existing Backend Functions (READY TO USE)

#### From `convex/managerAudits.ts`:

| Function | Purpose | Status |
|----------|---------|--------|
| `createAudit` | Create audit record for completed form | ✅ Ready |
| `updateAudit` | Update audit notes | ✅ Ready |
| `getAuditsByForm` | Get audits for specific form | ✅ Ready |
| `getAuditsByResident` | Get all audits for resident | ✅ Ready |
| `getAuditsByTeam` | Get team audits | ✅ Ready |
| `getAuditsByAuditor` | Get audits by auditor | ✅ Ready |
| `getUnauditedForms` | **Get forms needing audit** | ⚠️ **NOT USED** |
| `getFormAuditStatus` | Check audit status of forms | ✅ Ready |
| `getFormDataForReview` | Fetch form data for review | ✅ Ready |
| `submitReviewedForm` | Submit reviewed form with changes | ⚠️ **NOT USED** |
| `getAuditStatistics` | Get audit metrics | ⚠️ **NOT USED** |
| `hasFormDataChanged` | Smart diff for form changes | ✅ Working |

#### From `convex/residentAuditItems.ts`:

| Function | Purpose | Status |
|----------|---------|--------|
| `upsertAuditItem` | Create/update audit item | ⚠️ **NOT USED** |
| `getAuditItemsByResident` | Get resident audit items | ⚠️ **NOT USED** |
| `getOverdueCountByResident` | Count overdue items | ⚠️ **NOT USED** |
| `getAuditItemsByTeam` | Get team audit items | ⚠️ **NOT USED** |

---

## Critical Issues

### 🔴 P0 - Critical (Blocks Production)

1. **NO DATA PERSISTENCE**
   - All audit data stored in component state and localStorage
   - Data lost on browser refresh or device change
   - No multi-user collaboration possible
   - **Impact**: Complete loss of audit data, regulatory non-compliance

2. **DISCONNECTED BACKEND**
   - Extensive backend infrastructure exists but is unused by 80% of audit pages
   - `getUnauditedForms` never called - care file audit shows hardcoded data
   - `submitReviewedForm` workflow never triggered
   - **Impact**: Wasted development effort, inconsistent data

3. **NO AUDIT TRAIL**
   - No record of who performed audits
   - No timestamp tracking
   - No revision history
   - **Impact**: Regulatory compliance failure (CQC requirement)

4. **MISSING AUTHENTICATION/AUTHORIZATION**
   - No check if user has permission to audit
   - No auditor role validation
   - No team-level access control
   - **Impact**: Security vulnerability, data integrity risk

### 🟡 P1 - High Priority

5. **NO VALIDATION**
   - No required field validation
   - No data type checking
   - No duplicate prevention
   - **Impact**: Data quality issues, incomplete audits

6. **HARDCODED DATA**
   - Care file audit shows fake static data
   - Should pull from actual care file submissions
   - Status percentages are random numbers
   - **Impact**: Misleading information, no real value

7. **NO AUDIT TEMPLATES**
   - Clinical, Governance, and Environment audits start empty
   - No predefined checklists based on CQC/NHS standards
   - Each audit created from scratch
   - **Impact**: Inconsistent audits, missed compliance items

8. **MISSING WORKFLOWS**
   - No approval/rejection workflow
   - No escalation for failed audits
   - No notification system
   - **Impact**: Audit findings not acted upon

### 🟢 P2 - Medium Priority

9. **NO REPORTING**
   - `getAuditStatistics` exists but not used
   - No dashboard showing audit completion rates
   - No trend analysis
   - **Impact**: Management visibility gap

10. **NO EXPORT FUNCTIONALITY**
    - Download buttons present but not implemented
    - No PDF generation
    - No audit report generation
    - **Impact**: Cannot share with regulators or management

11. **POOR UX FOR AUDIT REVIEW**
    - Care file audit doesn't link to actual form review
    - `submitReviewedForm` workflow not implemented in UI
    - No side-by-side comparison of changes
    - **Impact**: Inefficient audit process

---

## Production Roadmap

### Phase 1: Foundation (Week 1-2) - Data Persistence & Backend Integration

**Goal**: Connect frontend to existing backend, ensure data is saved

#### Backend Tasks

1. **Create Audit Template System**
   - [ ] Define schema for audit templates (`auditTemplates` table)
   - [ ] Template fields: name, category, questions, frequency, required fields
   - [ ] CRUD operations for templates
   - [ ] Predefined templates for each audit category

2. **Create Audit Response System**
   - [ ] Define schema for audit responses (`auditResponses` table)
   - [ ] Link responses to templates
   - [ ] Store auditor, timestamp, status (draft/submitted/approved)
   - [ ] Store individual question responses

3. **Extend Resident Audit Items**
   - [ ] Add `templateId` field to link to templates
   - [ ] Add `responseData` field for JSON storage of answers
   - [ ] Add `approvedBy` and `approvedAt` fields
   - [ ] Add `version` field for change tracking

4. **Authentication Middleware**
   - [ ] Add user authentication check to all audit mutations
   - [ ] Create permission system (can_audit, can_approve_audit roles)
   - [ ] Add team-level access control
   - [ ] Audit log for all changes

#### Frontend Tasks

5. **Resident Audit Integration**
   - [ ] Replace localStorage with Convex mutations
   - [ ] Use `api.residentAuditItems.upsertAuditItem` to save responses
   - [ ] Load questions from audit template
   - [ ] Save question definitions to template
   - [ ] Real-time sync across devices

6. **Care File Audit Integration**
   - [ ] Remove hardcoded audit items
   - [ ] Use `api.managerAudits.getUnauditedForms` to populate list
   - [ ] Show completion percentage from actual data
   - [ ] Link to care file forms for review
   - [ ] Integrate `submitReviewedForm` workflow

7. **Clinical/Governance/Environment Integration**
   - [ ] Load predefined templates on page load
   - [ ] Save responses to database
   - [ ] Link action plans to audit responses

#### Validation & Error Handling

8. **Form Validation**
   - [ ] Required field validation (auditor, date)
   - [ ] Status validation (prevent invalid states)
   - [ ] Date validation (due date after start date)
   - [ ] Duplicate prevention (one audit per template per period)

9. **Error Handling**
   - [ ] Network error handling
   - [ ] Optimistic UI updates with rollback
   - [ ] User-friendly error messages
   - [ ] Retry logic for failed saves

---

### Phase 2: Compliance Features (Week 3-4) - Audit Workflows & Standards

#### Audit Templates Implementation

10. **Clinical Care & Medicines Template**
    - [ ] Medication administration audit (MAR checks)
    - [ ] Controlled drugs register audit
    - [ ] PRN medication appropriateness
    - [ ] Clinical observation documentation
    - [ ] Falls prevention review
    - [ ] Wound care documentation
    - [ ] Nutrition and hydration monitoring
    - [ ] Based on NICE guidelines and CQC standards

11. **Governance & Complaints Template**
    - [ ] CQC compliance checklist (5 key questions)
    - [ ] Complaints log review
    - [ ] Safeguarding referrals audit
    - [ ] Policy review tracker
    - [ ] GDPR compliance checks
    - [ ] Staff training compliance
    - [ ] Incident analysis

12. **Environment & Safety Template**
    - [ ] Fire safety equipment checklist
    - [ ] Emergency lighting tests
    - [ ] Call bell response times
    - [ ] Water temperature monitoring
    - [ ] Infection control audit (IPC)
    - [ ] COSHH compliance
    - [ ] Equipment maintenance logs
    - [ ] Risk assessment review

#### Workflow Implementation

13. **Audit Lifecycle**
    - [ ] Draft → In Progress → Submitted → Reviewed → Approved/Rejected
    - [ ] Auto-assign audits based on frequency
    - [ ] Audit scheduling (weekly, monthly, quarterly)
    - [ ] Overdue audit notifications
    - [ ] Escalation for failed audits

14. **Approval Workflow**
    - [ ] Manager review interface
    - [ ] Approve/reject with comments
    - [ ] Require action plan for failed items
    - [ ] Track corrective actions
    - [ ] Follow-up audit scheduling

15. **Action Plan System**
    - [ ] Link action plans to specific audit findings
    - [ ] Assign to team members
    - [ ] Due date tracking
    - [ ] Completion verification
    - [ ] Re-audit trigger when action completed

---

### Phase 3: Reporting & Analytics (Week 5) - Insights & Compliance Tracking

#### Dashboard & Reporting

16. **Audit Dashboard**
    - [ ] Audit completion rate by category
    - [ ] Overdue audits summary
    - [ ] Compliance score trends
    - [ ] Top 10 non-compliant items
    - [ ] Auditor performance metrics
    - [ ] Use `getAuditStatistics` function

17. **Reports Generation**
    - [ ] PDF export for individual audits
    - [ ] Compliance summary report
    - [ ] Audit history report per resident
    - [ ] Action plan status report
    - [ ] Executive summary for management

18. **Analytics**
    - [ ] Trend analysis (compliance over time)
    - [ ] Comparative analysis (team vs team)
    - [ ] Risk heatmap (most failed items)
    - [ ] Auditor consistency analysis
    - [ ] Predictive alerts (likely to fail)

---

### Phase 4: Advanced Features (Week 6) - Optimization & Integration

#### Advanced Functionality

19. **Care File Review Workflow**
    - [ ] Side-by-side form comparison
    - [ ] Highlight changes since last audit
    - [ ] Inline editing with revision tracking
    - [ ] Bulk approve/reject
    - [ ] Form annotations

20. **Bulk Operations**
    - [ ] Bulk assign auditor
    - [ ] Bulk schedule audits
    - [ ] Bulk export
    - [ ] Bulk status update

21. **Integrations**
    - [ ] Email notifications for overdue audits
    - [ ] Calendar integration for scheduled audits
    - [ ] CQC submission preparation
    - [ ] Integration with incident system
    - [ ] Integration with training system

22. **Mobile Optimization**
    - [ ] Responsive table layouts
    - [ ] Touch-friendly controls
    - [ ] Offline mode with sync
    - [ ] Mobile PDF viewing

---

## Technical Specifications

### Database Schema Extensions

#### New Table: `auditTemplates`

```typescript
auditTemplates: defineTable({
  name: v.string(),
  description: v.optional(v.string()),
  category: v.union(
    v.literal("resident"),
    v.literal("carefile"),
    v.literal("governance"),
    v.literal("clinical"),
    v.literal("environment")
  ),
  questions: v.array(v.object({
    id: v.string(),
    text: v.string(),
    type: v.union(
      v.literal("compliance"),    // Compliant/Non-Compliant/N/A
      v.literal("yesno"),          // Yes/No/N/A
      v.literal("status"),         // Custom status dropdown
      v.literal("text"),           // Free text
      v.literal("number"),         // Numeric value
      v.literal("date")            // Date picker
    ),
    required: v.boolean(),
    options: v.optional(v.array(v.string())), // For status type
    weight: v.optional(v.number()) // For scoring
  })),
  frequency: v.union(
    v.literal("weekly"),
    v.literal("biweekly"),
    v.literal("monthly"),
    v.literal("quarterly"),
    v.literal("biannually"),
    v.literal("annually"),
    v.literal("adhoc")
  ),
  isActive: v.boolean(),
  isSystemTemplate: v.boolean(), // True for predefined templates
  createdBy: v.string(),
  organizationId: v.string(),
  teamId: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.optional(v.number())
})
  .index("by_category", ["category"])
  .index("by_organization", ["organizationId"])
  .index("by_team", ["teamId"])
  .index("by_active", ["isActive"])
```

#### New Table: `auditResponses`

```typescript
auditResponses: defineTable({
  templateId: v.id("auditTemplates"),
  templateVersion: v.number(), // Track template changes

  // Context
  residentId: v.optional(v.id("residents")), // For resident-specific audits
  teamId: v.string(),
  organizationId: v.string(),

  // Response data
  responses: v.array(v.object({
    questionId: v.string(),
    value: v.union(v.string(), v.number(), v.null()),
    notes: v.optional(v.string()),
    evidence: v.optional(v.array(v.string())) // File IDs for evidence
  })),

  // Metadata
  status: v.union(
    v.literal("draft"),
    v.literal("in_progress"),
    v.literal("submitted"),
    v.literal("under_review"),
    v.literal("approved"),
    v.literal("rejected"),
    v.literal("requires_action")
  ),

  // Audit trail
  auditedBy: v.string(), // User ID of auditor
  auditedAt: v.number(),
  submittedAt: v.optional(v.number()),
  reviewedBy: v.optional(v.string()),
  reviewedAt: v.optional(v.number()),
  reviewNotes: v.optional(v.string()),

  // Scoring
  complianceScore: v.optional(v.number()), // 0-100
  passedItems: v.optional(v.number()),
  failedItems: v.optional(v.number()),
  naItems: v.optional(v.number()),

  // Action plans
  hasActionPlan: v.optional(v.boolean()),
  actionPlanCompleted: v.optional(v.boolean()),

  // Dates
  auditPeriodStart: v.optional(v.number()),
  auditPeriodEnd: v.optional(v.number()),
  nextAuditDue: v.optional(v.number()),

  createdAt: v.number(),
  updatedAt: v.optional(v.number())
})
  .index("by_template", ["templateId"])
  .index("by_resident", ["residentId"])
  .index("by_team", ["teamId"])
  .index("by_organization", ["organizationId"])
  .index("by_auditor", ["auditedBy"])
  .index("by_status", ["status"])
  .index("by_template_and_resident", ["templateId", "residentId"])
  .index("by_next_due", ["nextAuditDue"])
```

#### New Table: `auditActionPlans`

```typescript
auditActionPlans: defineTable({
  auditResponseId: v.id("auditResponses"),
  questionId: v.optional(v.string()), // Link to specific question that failed

  description: v.string(),
  assignedTo: v.string(), // User ID
  priority: v.union(
    v.literal("low"),
    v.literal("medium"),
    v.literal("high"),
    v.literal("critical")
  ),

  dueDate: v.number(),
  completedAt: v.optional(v.number()),
  completedBy: v.optional(v.string()),

  status: v.union(
    v.literal("pending"),
    v.literal("in_progress"),
    v.literal("completed"),
    v.literal("overdue"),
    v.literal("cancelled")
  ),

  notes: v.optional(v.string()),
  evidenceFileIds: v.optional(v.array(v.string())),

  // Re-audit
  requiresReaudit: v.boolean(),
  reauditResponseId: v.optional(v.id("auditResponses")),

  teamId: v.string(),
  organizationId: v.string(),
  createdAt: v.number(),
  updatedAt: v.optional(v.number())
})
  .index("by_audit_response", ["auditResponseId"])
  .index("by_assigned_to", ["assignedTo"])
  .index("by_status", ["status"])
  .index("by_due_date", ["dueDate"])
  .index("by_team", ["teamId"])
```

### Key API Functions to Implement

#### Audit Template Management

```typescript
// convex/auditTemplates.ts

export const createTemplate = mutation({...})
export const updateTemplate = mutation({...})
export const getTemplatesByCategory = query({...})
export const getSystemTemplates = query({...})
export const cloneTemplate = mutation({...})
export const archiveTemplate = mutation({...})
```

#### Audit Response Management

```typescript
// convex/auditResponses.ts

export const createResponse = mutation({...})
export const updateResponse = mutation({...})
export const submitResponse = mutation({...})
export const reviewResponse = mutation({...})
export const approveResponse = mutation({...})
export const rejectResponse = mutation({...})
export const getResponsesByResident = query({...})
export const getOverdueAudits = query({...})
export const getUpcomingAudits = query({...})
export const calculateComplianceScore = mutation({...})
```

#### Action Plan Management

```typescript
// convex/auditActionPlans.ts

export const createActionPlan = mutation({...})
export const updateActionPlan = mutation({...})
export const completeActionPlan = mutation({...})
export const getActionPlansByAudit = query({...})
export const getActionPlansByAssignee = query({...})
export const getOverdueActionPlans = query({...})
export const triggerReaudit = mutation({...})
```

#### Analytics & Reporting

```typescript
// convex/auditAnalytics.ts

export const getAuditDashboard = query({...})
export const getComplianceTrends = query({...})
export const getAuditCompletionRate = query({...})
export const getTopFailedItems = query({...})
export const getAuditorPerformance = query({...})
export const generateAuditReport = mutation({...})
export const exportAuditData = query({...})
```

---

## Implementation TODO

### Week 1: Backend Foundation

**Goal**: Database tables and core CRUD operations

- [ ] Create `auditTemplates` table schema in `convex/schema.ts`
- [ ] Create `auditResponses` table schema
- [ ] Create `auditActionPlans` table schema
- [ ] Implement `convex/auditTemplates.ts` with CRUD functions
- [ ] Implement `convex/auditResponses.ts` with CRUD functions
- [ ] Implement `convex/auditActionPlans.ts` with CRUD functions
- [ ] Add authentication checks to all mutations
- [ ] Add team-level authorization
- [ ] Write unit tests for backend functions
- [ ] Seed database with system templates for all 5 categories

**Deliverable**: Working backend API with authentication

---

### Week 2: Frontend Integration (Tabs 1-2)

**Goal**: Resident and Care File audits fully functional

#### Resident Audit
- [ ] Create `useAuditTemplate` hook to load/save templates
- [ ] Create `useAuditResponse` hook to manage responses
- [ ] Replace localStorage with Convex mutations
- [ ] Add "Save as Template" functionality
- [ ] Add "Load Template" dropdown
- [ ] Connect action plans to `auditActionPlans` table
- [ ] Add form validation (required auditor, date)
- [ ] Add loading states and error handling
- [ ] Add success/error toasts
- [ ] Add "Submit for Review" button
- [ ] Test real-time updates across devices

#### Care File Audit
- [ ] Remove hardcoded audit items
- [ ] Use `getUnauditedForms()` to populate audit list
- [ ] Show real completion percentages
- [ ] Create care file review modal component
- [ ] Integrate `getFormDataForReview()` to fetch form
- [ ] Implement `submitReviewedForm()` workflow
- [ ] Show form change detection (hasFormDataChanged)
- [ ] Add bulk audit actions (mark all as reviewed)
- [ ] Link to individual form edit pages
- [ ] Add filters (by form type, status, overdue)

**Deliverable**: Tabs 1-2 fully integrated with backend

---

### Week 3: Frontend Integration (Tabs 3-5) + Templates

**Goal**: All audit tabs working + predefined templates

#### Clinical Care & Medicines
- [ ] Create system template with 20+ clinical audit items:
  - MAR chart review (signatures, dates, allergies documented)
  - Controlled drugs register (daily checks, discrepancies)
  - PRN medications (rationale documented, effectiveness reviewed)
  - Blood pressure monitoring (frequency per care plan)
  - Blood glucose monitoring (actions on abnormal results)
  - Wound care (documentation, photos, dressing changes)
  - Falls risk assessment (up-to-date, post-fall reviews)
  - Mobility aids (condition, appropriateness)
  - Nutrition screening (MUST scores, weight tracking)
  - Fluid balance charts (completeness, totals)
  - Clinical observations (NEWS scores calculated correctly)
  - GP visits (documented, actions completed)
  - Healthcare professional visits (documented)
  - End of life care (advance directives in place)
  - Mental capacity assessments (decision-specific, documented)
- [ ] Load template on page load
- [ ] Save responses to `auditResponses` table
- [ ] Add status tracking per item
- [ ] Add notes field
- [ ] Calculate compliance score
- [ ] Link failed items to action plans

#### Governance & Complaints
- [ ] Create system template based on CQC framework:
  - **Safe**: Risk assessments, safeguarding, infection control, medicines
  - **Effective**: Care plans, staff training, consent, nutrition
  - **Caring**: Dignity, privacy, involvement in care
  - **Responsive**: Person-centered care, complaints, end of life
  - **Well-led**: Governance, policies, audits, leadership
  - Complaints log review (timely response, outcomes)
  - Safeguarding referrals (appropriate, documented)
  - GDPR compliance (consent forms, data security)
  - Policy review (in date, staff aware)
  - Staff training (mandatory training compliance)
  - Incident analysis (trends, learning, actions)
  - Quality assurance (internal audits completed)
- [ ] Implement same features as Clinical audit
- [ ] Add link to complaints module (if exists)

#### Environment & Safety
- [ ] Create system template with safety checklist:
  - Fire safety (alarms tested, extinguishers serviced, PEEP in place)
  - Emergency lighting (monthly tests documented)
  - Call bells (response times, all functioning)
  - Water temperatures (monitored, TMVs fitted)
  - Legionella management (testing, risk assessment)
  - Infection prevention (hand hygiene, PPE availability)
  - Cleaning schedules (completed, signed)
  - Equipment maintenance (hoists, beds, wheelchairs serviced)
  - COSHH (products stored safely, data sheets available)
  - Environmental risk assessments (up to date)
  - Food safety (temperature monitoring, hygiene rating)
  - Waste management (clinical waste, sharps disposal)
  - Health and safety (accident book, RIDDOR reporting)
- [ ] Implement audit workflow
- [ ] Add photo upload for evidence

**Deliverable**: All 5 tabs fully functional with predefined templates

---

### Week 4: Workflows & Approvals

**Goal**: Complete audit lifecycle with approvals

- [ ] Create audit review page for managers
- [ ] Implement approval workflow (approve/reject button)
- [ ] Add review notes field
- [ ] Require action plan for failed audits
- [ ] Send notifications on status changes (if notification system exists)
- [ ] Create "My Audits" view filtered by current user
- [ ] Create "Pending Review" queue for managers
- [ ] Implement audit scheduling (auto-create based on frequency)
- [ ] Add overdue audit alerts
- [ ] Create escalation workflow for overdue audits
- [ ] Add audit assignment (assign specific audits to users)
- [ ] Implement delegation (reassign audits)

**Deliverable**: Full audit lifecycle operational

---

### Week 5: Reporting & Analytics

**Goal**: Dashboards and reports for management

- [ ] Create audit dashboard page (`/dashboard/audits/analytics`)
- [ ] Implement `getAuditDashboard()` query
- [ ] Display KPIs:
  - Total audits completed this month
  - Compliance score (average)
  - Overdue audits count
  - Action plans pending
  - Audits by category (pie chart)
  - Compliance trends (line chart)
- [ ] Create compliance report generator
- [ ] Implement PDF export for individual audits
- [ ] Create executive summary report (monthly/quarterly)
- [ ] Add filters (date range, team, auditor, category)
- [ ] Implement audit history timeline view
- [ ] Create "Top 10 Failed Items" widget
- [ ] Add export to Excel functionality
- [ ] Create resident audit history page (all audits for one resident)

**Deliverable**: Full reporting suite

---

### Week 6: Polish & Production Prep

**Goal**: Production-ready with testing and documentation

- [ ] Comprehensive testing:
  - Unit tests for all Convex functions
  - Integration tests for workflows
  - E2E tests for critical paths (Playwright)
  - Load testing (multiple users auditing simultaneously)
- [ ] Performance optimization:
  - Database query optimization
  - Add pagination to large lists
  - Lazy loading for audit history
  - Optimize PDF generation
- [ ] Security audit:
  - Penetration testing
  - Authorization checks on all mutations
  - Input sanitization
  - Rate limiting on API calls
- [ ] Documentation:
  - User guide for auditors
  - Admin guide for managers
  - API documentation
  - Deployment guide
- [ ] Accessibility:
  - WCAG 2.1 AA compliance
  - Keyboard navigation
  - Screen reader testing
  - Color contrast fixes
- [ ] Mobile optimization:
  - Responsive layouts
  - Touch-friendly controls
  - Test on tablets and phones
- [ ] Data migration plan:
  - Migrate localStorage data to database (if needed)
  - Archive old audits
  - Set up backup procedures

**Deliverable**: Production-ready audit system

---

## Success Metrics

### Functional Requirements (Must Have)

- ✅ All audit data persisted in database
- ✅ Multi-user collaboration works
- ✅ Audit trail complete (who, when, what changed)
- ✅ Care file audit shows real data from forms
- ✅ Predefined templates for all 5 categories
- ✅ Approval workflow functional
- ✅ Action plans linked to audits
- ✅ PDF export working
- ✅ Authentication and authorization enforced
- ✅ Form validation prevents invalid data

### Performance Requirements

- Page load < 2 seconds
- Audit save < 1 second
- Support 50 concurrent users
- 99.9% uptime

### Compliance Requirements

- CQC audit standards met
- GDPR compliant (audit data protected)
- NHS Digital standards followed
- Complete audit trail for regulatory inspection
- Audit retention policy (7 years minimum)

---

## Risk Assessment

### High Risk

1. **Data Migration** - If localStorage has real data, need migration plan
   - *Mitigation*: Provide import tool for old audit data

2. **User Adoption** - Staff may resist new audit process
   - *Mitigation*: Training sessions, user guide, gradual rollout

3. **Performance** - Large organizations with many residents
   - *Mitigation*: Pagination, lazy loading, database indexing

### Medium Risk

4. **Template Changes** - What happens when template changes mid-audit?
   - *Mitigation*: Version templates, lock template after audit starts

5. **Integration** - Need to integrate with forms, incidents, complaints
   - *Mitigation*: Use existing Convex relationships, phased integration

### Low Risk

6. **Browser Compatibility** - May not work on older browsers
   - *Mitigation*: Modern browser requirement documented

---

## Cost-Benefit Analysis

### Current State Cost
- **Technical Debt**: 80% of backend unused, localStorage data loss risk
- **Compliance Risk**: No audit trail = CQC failure risk
- **Manual Work**: Hardcoded data, no real insights
- **Estimated Cost of Failure**: £10,000+ in CQC penalties + reputation damage

### Investment Required
- **Development**: 6 weeks × £600/day = £18,000
- **Testing**: 1 week × £500/day = £2,500
- **Training**: 2 days × £400/day = £800
- **Total**: ~£21,300

### Expected Benefits
- **Compliance**: Pass CQC audits with confidence
- **Efficiency**: 50% time reduction in audit process
- **Insights**: Data-driven quality improvements
- **Revenue Protection**: Avoid penalties, maintain ratings
- **Scalability**: Support unlimited care homes
- **ROI**: Positive within 6 months

---

## Recommendations

### Immediate Actions (This Week)

1. **STOP** adding features to frontend until backend connected
2. **START** Phase 1 (Backend Foundation) immediately
3. **PRIORITIZE** Care File Audit integration (biggest value)
4. **DOCUMENT** any existing audit data in localStorage for migration

### Architecture Decisions

1. **Use Existing Backend** - Don't rebuild, leverage managerAudits.ts
2. **Template-Based Approach** - Flexible but with predefined standards
3. **Separate Concerns** - Audit templates ≠ audit responses
4. **Version Control** - Track template changes over time

### Team Structure

- **Backend Developer** (1): Database schema, API functions
- **Frontend Developer** (1): UI integration, forms, workflows
- **QA/Tester** (0.5): Testing, validation
- **Product Owner** (0.25): Template content, compliance review
- **Total**: ~3 people for 6 weeks

---

## Conclusion

The CareO Audit System has a **strong foundation** with excellent backend infrastructure already built. However, it is currently only **35% complete** and not production-ready due to:

- ❌ No data persistence (localStorage only)
- ❌ Backend not connected to frontend
- ❌ Missing predefined audit templates
- ❌ No approval workflows
- ❌ No compliance reporting

**With 6 weeks of focused development**, this can become a **production-grade compliance tool** that:

- ✅ Meets CQC regulatory requirements
- ✅ Saves audit time by 50%
- ✅ Provides actionable insights
- ✅ Scales across multiple care homes
- ✅ Protects against compliance failures

**Recommendation**: Proceed with Phase 1 immediately. The existing backend provides a strong foundation, and the frontend UX is already well-designed. The gap is purely integration work, which is straightforward with the roadmap above.

---

**Document Version**: 1.0
**Date**: 2025-01-19
**Author**: Claude (CareO Analysis)
**Status**: Ready for Implementation
