# CareO Audit System - Product & Technical Plan

## Executive Summary

This document outlines a comprehensive audit management system for CareO that enables care homes to conduct, track, and manage regulatory compliance audits efficiently. The system supports both **Resident-Specific Audits** (16 types) and **Home-Level Audits** (24 types across 3 categories).

---

## 1. System Overview

### 1.1 Current State
- ✅ UI framework complete with tables and navigation
- ✅ Status tracking (Pending, In Progress, Completed, Overdue, N/A, Not Applicable)
- ✅ LocalStorage-based data persistence (temporary)
- ❌ No database integration
- ❌ No pre-filled questions for each audit type
- ❌ No notification system
- ❌ No action plan tracking
- ❌ No reporting/analytics

### 1.2 Target State
A fully integrated audit system with:
- Pre-defined question sets for all 40 audit types
- Database-backed persistence with full audit trails
- Real-time notifications and task assignments
- Action plan management with follow-ups
- Compliance reporting and analytics
- Mobile-responsive audit forms
- Evidence upload capabilities

---

## 2. User Personas & Use Cases

### 2.1 Personas

**Primary Users:**
1. **Registered Manager** - Oversees all audits, assigns auditors, reviews completion
2. **Senior Care Staff / Auditor** - Conducts audits, creates action plans
3. **Care Staff** - Receives assignments, completes corrective actions
4. **Residents / Families** - (Indirect) Benefits from audit outcomes

### 2.2 Core User Journeys

#### Journey 1: Conducting a Resident Audit
1. Manager/Auditor navigates to Resident Audit page
2. Selects specific resident from list
3. Chooses audit type (e.g., "DNACPR Audit")
4. System presents pre-filled questions specific to DNACPR
5. Auditor answers Yes/No/Partial/N/A for each question
6. For "No" or "Partial" responses:
   - Add detailed notes
   - Set priority level (Low/Medium/High)
   - Assign corrective action to specific staff member
   - Set due date for completion
7. Submit audit - saves to database
8. System automatically:
   - Updates resident's audit status
   - Creates notification for assigned staff
   - Shows bell icon on resident's profile if there are comments/actions

#### Journey 2: Receiving & Completing Action Assignments
1. Care staff logs in, sees notification bell with count
2. Clicks bell, sees list of assigned actions
3. Filters by resident or audit type
4. Opens specific action item
5. Views context: audit question, notes, due date
6. Completes corrective action
7. Updates status and adds completion notes
8. Submits - notifies original auditor

#### Journey 3: Manager Oversight & Reporting
1. Manager views audit dashboard
2. Sees compliance metrics:
   - Audits completed vs. overdue (by type, by resident, by home area)
   - Action items pending/completed
   - Trending issues across audits
3. Drills down to specific audit for review
4. Approves or requests re-audit
5. Generates compliance reports for regulatory bodies

---

## 3. Database Schema Design

### 3.1 Core Tables (Convex Schema)

```typescript
// auditTemplates.ts
{
  _id: Id<"auditTemplates">,
  name: string,                          // "DNACPR Audit"
  category: "resident" | "home",
  subCategory?: "governance" | "clinical" | "environment", // For home audits
  frequency: "monthly" | "quarterly" | "annual",
  questions: [
    {
      id: string,                        // "q1", "q2"
      question: string,                  // "Is the DNACPR form signed?"
      category: string,                  // "Documentation"
      isRequired: boolean,
      helpText?: string,                 // Guidance for auditors
      evidenceRequired?: boolean,        // Requires photo/file upload
    }
  ],
  createdAt: number,
  updatedBy: Id<"users">,
}

// auditResponses.ts
{
  _id: Id<"auditResponses">,
  templateId: Id<"auditTemplates">,     // Link to template
  residentId?: Id<"residents">,         // For resident audits
  teamId: Id<"teams">,                  // Care home
  auditDate: number,                    // When audit conducted
  auditorId: Id<"users">,               // Who conducted it
  status: "draft" | "submitted" | "reviewed" | "approved",

  responses: [
    {
      questionId: string,                // "q1"
      answer: "yes" | "no" | "partial" | "na",
      notes?: string,                    // Auditor comments
      evidenceUrls?: string[],           // File uploads
      actionRequired: boolean,           // Does this need follow-up?
    }
  ],

  overallScore?: number,                 // % compliance (auto-calculated)
  reviewedBy?: Id<"users">,
  reviewedAt?: number,

  createdAt: number,
  updatedAt: number,
}

// auditActions.ts
{
  _id: Id<"auditActions">,
  auditResponseId: Id<"auditResponses">,
  questionId: string,                    // Which question triggered this
  residentId?: Id<"residents">,

  description: string,                   // What needs to be done
  priority: "low" | "medium" | "high",
  assignedTo: Id<"users">,              // Staff member
  assignedBy: Id<"users">,              // Auditor
  dueDate: number,

  status: "pending" | "in_progress" | "completed" | "overdue",
  completionNotes?: string,
  completedBy?: Id<"users">,
  completedAt?: number,

  createdAt: number,
  updatedAt: number,
}

// auditNotifications.ts
{
  _id: Id<"auditNotifications">,
  userId: Id<"users">,                   // Recipient
  type: "action_assigned" | "action_due" | "action_overdue" | "audit_completed",
  actionId?: Id<"auditActions">,
  auditResponseId?: Id<"auditResponses">,
  residentId?: Id<"residents">,

  title: string,                         // "New Action Assigned"
  message: string,                       // "Complete DNACPR review for John Smith"
  isRead: boolean,
  readAt?: number,

  createdAt: number,
}

// auditSchedule.ts (Future: Auto-scheduling)
{
  _id: Id<"auditSchedule">,
  templateId: Id<"auditTemplates">,
  teamId: Id<"teams">,
  residentId?: Id<"residents">,

  frequency: "monthly" | "quarterly" | "annual",
  nextDueDate: number,
  assignedAuditor?: Id<"users">,

  isActive: boolean,
  createdAt: number,
}
```

---

## 4. Audit Question Templates

### 4.1 Resident Audit Questions

Each of the 16 resident audits needs a unique question set. Example templates:

#### **DNACPR Audit** (10 questions)
```typescript
{
  name: "DNACPR Audit",
  category: "resident",
  frequency: "quarterly",
  questions: [
    {
      id: "dnacpr_q1",
      question: "Is there a valid DNACPR form in place?",
      category: "Documentation",
      isRequired: true,
      helpText: "Check the care file for original DNACPR form signed by appropriate medical professional"
    },
    {
      id: "dnacpr_q2",
      question: "Is the DNACPR form signed by a qualified medical practitioner?",
      category: "Compliance",
      isRequired: true,
    },
    {
      id: "dnacpr_q3",
      question: "Is the DNACPR decision discussed with the resident (if they have capacity)?",
      category: "Consent & Capacity",
      isRequired: true,
    },
    {
      id: "dnacpr_q4",
      question: "Is there evidence of family/next of kin involvement in the decision?",
      category: "Family Engagement",
      isRequired: true,
    },
    {
      id: "dnacpr_q5",
      question: "Is the DNACPR form easily accessible in case of emergency?",
      category: "Accessibility",
      isRequired: true,
    },
    {
      id: "dnacpr_q6",
      question: "Has the DNACPR decision been reviewed in the last 12 months?",
      category: "Review Frequency",
      isRequired: true,
    },
    {
      id: "dnacpr_q7",
      question: "Are all staff aware of the resident's DNACPR status?",
      category: "Staff Awareness",
      isRequired: true,
    },
    {
      id: "dnacpr_q8",
      question: "Is the DNACPR status clearly documented in care plans?",
      category: "Care Planning",
      isRequired: true,
    },
    {
      id: "dnacpr_q9",
      question: "Has the DNACPR decision been reviewed following any change in condition?",
      category: "Clinical Review",
      isRequired: false,
    },
    {
      id: "dnacpr_q10",
      question: "Is there a process for regular DNACPR audit and review?",
      category: "Quality Assurance",
      isRequired: true,
    }
  ]
}
```

#### **Choking Risk Audit** (12 questions)
```typescript
{
  name: "Choking Risk Audit",
  category: "resident",
  frequency: "monthly",
  questions: [
    {
      id: "choking_q1",
      question: "Has a comprehensive choking risk assessment been completed?",
      category: "Assessment",
      isRequired: true,
    },
    {
      id: "choking_q2",
      question: "Is the resident's diet modified appropriately based on risk level?",
      category: "Dietary Management",
      isRequired: true,
      helpText: "Check if IDDSI texture levels are documented and followed"
    },
    {
      id: "choking_q3",
      question: "Are fluid thickening requirements documented and followed?",
      category: "Dietary Management",
      isRequired: true,
    },
    {
      id: "choking_q4",
      question: "Is there evidence of SALT (Speech & Language Therapy) involvement?",
      category: "Professional Input",
      isRequired: false,
    },
    {
      id: "choking_q5",
      question: "Are staff trained in choking prevention and response?",
      category: "Staff Training",
      isRequired: true,
    },
    {
      id: "choking_q6",
      question: "Is the resident supervised during meals as per care plan?",
      category: "Supervision",
      isRequired: true,
    },
    {
      id: "choking_q7",
      question: "Are adaptive utensils/equipment provided if needed?",
      category: "Equipment",
      isRequired: false,
    },
    {
      id: "choking_q8",
      question: "Is positioning during meals assessed and optimized?",
      category: "Positioning",
      isRequired: true,
    },
    {
      id: "choking_q9",
      question: "Are high-risk foods identified and avoided?",
      category: "Risk Management",
      isRequired: true,
    },
    {
      id: "choking_q10",
      question: "Is there a protocol for choking emergencies clearly displayed?",
      category: "Emergency Response",
      isRequired: true,
    },
    {
      id: "choking_q11",
      question: "Has the choking risk been reviewed in the last 3 months?",
      category: "Review Frequency",
      isRequired: true,
    },
    {
      id: "choking_q12",
      question: "Are any incidents/near misses documented and reviewed?",
      category: "Incident Management",
      isRequired: true,
    }
  ]
}
```

#### **Post Fall Management Tracker** (15 questions)
```typescript
{
  name: "Post Fall Management Tracker",
  category: "resident",
  frequency: "monthly",
  questions: [
    {
      id: "fall_q1",
      question: "Was the resident checked for injuries immediately after the fall?",
      category: "Immediate Response",
      isRequired: true,
    },
    {
      id: "fall_q2",
      question: "Were vital signs monitored post-fall as per protocol?",
      category: "Clinical Assessment",
      isRequired: true,
    },
    {
      id: "fall_q3",
      question: "Was a post-fall assessment completed within 24 hours?",
      category: "Assessment Timeliness",
      isRequired: true,
    },
    {
      id: "fall_q4",
      question: "Was the GP notified if required (head injury, loss of consciousness, fracture)?",
      category: "Professional Communication",
      isRequired: true,
    },
    {
      id: "fall_q5",
      question: "Was family/next of kin informed of the fall?",
      category: "Family Communication",
      isRequired: true,
    },
    {
      id: "fall_q6",
      question: "Has the incident been documented in the incident log?",
      category: "Documentation",
      isRequired: true,
    },
    {
      id: "fall_q7",
      question: "Was a falls risk assessment reviewed and updated post-fall?",
      category: "Risk Assessment",
      isRequired: true,
    },
    {
      id: "fall_q8",
      question: "Were environmental factors contributing to the fall identified?",
      category: "Root Cause Analysis",
      isRequired: true,
    },
    {
      id: "fall_q9",
      question: "Were medications reviewed for fall risk contribution?",
      category: "Medication Review",
      isRequired: true,
    },
    {
      id: "fall_q10",
      question: "Was appropriate equipment reviewed (walking aid, bed rails, sensor mat)?",
      category: "Equipment Review",
      isRequired: true,
    },
    {
      id: "fall_q11",
      question: "Has the care plan been updated with fall prevention strategies?",
      category: "Care Planning",
      isRequired: true,
    },
    {
      id: "fall_q12",
      question: "Were neurological observations conducted if head injury occurred?",
      category: "Clinical Monitoring",
      isRequired: false,
    },
    {
      id: "fall_q13",
      question: "Is there evidence of ongoing monitoring for 72 hours post-fall?",
      category: "Monitoring",
      isRequired: true,
    },
    {
      id: "fall_q14",
      question: "Was the fall analyzed as part of the home's falls trend analysis?",
      category: "Quality Improvement",
      isRequired: true,
    },
    {
      id: "fall_q15",
      question: "Have staff been briefed on updated fall prevention strategies?",
      category: "Staff Communication",
      isRequired: true,
    }
  ]
}
```

### 4.2 Home Audit Questions

#### **Hand Hygiene Audit** (Clinical - Home Level)
```typescript
{
  name: "Hand Hygiene Audit",
  category: "home",
  subCategory: "clinical",
  frequency: "monthly",
  questions: [
    {
      id: "hh_q1",
      question: "Are hand washing sinks accessible in all care areas?",
      category: "Facilities",
      isRequired: true,
    },
    {
      id: "hh_q2",
      question: "Is liquid soap available at all hand wash stations?",
      category: "Supplies",
      isRequired: true,
    },
    {
      id: "hh_q3",
      question: "Are paper towels available at all hand wash stations?",
      category: "Supplies",
      isRequired: true,
    },
    {
      id: "hh_q4",
      question: "Is alcohol-based hand sanitizer available at points of care?",
      category: "Supplies",
      isRequired: true,
    },
    {
      id: "hh_q5",
      question: "Are '5 Moments of Hand Hygiene' posters displayed?",
      category: "Education",
      isRequired: true,
    },
    {
      id: "hh_q6",
      question: "Have direct observations of hand hygiene compliance been conducted?",
      category: "Monitoring",
      isRequired: true,
      helpText: "Minimum 10 observations per audit period"
    },
    {
      id: "hh_q7",
      question: "Is hand hygiene compliance ≥90%?",
      category: "Performance",
      isRequired: true,
    },
    {
      id: "hh_q8",
      question: "Have all care staff completed hand hygiene training this year?",
      category: "Training",
      isRequired: true,
    },
    {
      id: "hh_q9",
      question: "Are hand hygiene audits shared with staff for feedback?",
      category: "Communication",
      isRequired: true,
    },
    {
      id: "hh_q10",
      question: "Is there a process for addressing non-compliance?",
      category: "Quality Improvement",
      isRequired: true,
    }
  ]
}
```

#### **Safety Pause Audit** (Environment - Home Level)
```typescript
{
  name: "Safety Pause Audit",
  category: "home",
  subCategory: "environment",
  frequency: "monthly",
  questions: [
    {
      id: "sp_q1",
      question: "Are safety pause sessions conducted at the required frequency?",
      category: "Compliance",
      isRequired: true,
      helpText: "Minimum weekly safety pause meetings recommended"
    },
    {
      id: "sp_q2",
      question: "Is there documented evidence of safety pause meetings?",
      category: "Documentation",
      isRequired: true,
    },
    {
      id: "sp_q3",
      question: "Are all shifts represented in safety pause sessions?",
      category: "Staff Engagement",
      isRequired: true,
    },
    {
      id: "sp_q4",
      question: "Are safety concerns raised by staff documented?",
      category: "Documentation",
      isRequired: true,
    },
    {
      id: "sp_q5",
      question: "Is there a systematic approach to addressing identified risks?",
      category: "Risk Management",
      isRequired: true,
    },
    {
      id: "sp_q6",
      question: "Are actions from previous safety pauses reviewed?",
      category: "Follow-up",
      isRequired: true,
    },
    {
      id: "sp_q7",
      question: "Are managers engaged in reviewing safety pause outcomes?",
      category: "Leadership",
      isRequired: true,
    },
    {
      id: "sp_q8",
      question: "Is there evidence that safety improvements have been implemented?",
      category: "Quality Improvement",
      isRequired: true,
    }
  ]
}
```

---

## 5. Feature Specifications

### 5.1 Notification System

#### Requirements:
- **Bell Icon** in top navigation bar (global)
- **Notification Count Badge** showing unread count
- **Notification Panel** dropdown with:
  - Filter by type (All, Action Assignments, Completions, Overdue)
  - Mark as read/unread
  - Quick actions (View Audit, View Action)
  - Clear all notifications option

#### Notification Types:
1. **Action Assigned** - "You have been assigned: Review DNACPR form for [Resident Name]"
2. **Action Due Soon** - "Action due in 2 days: [Action Description]"
3. **Action Overdue** - "OVERDUE: [Action Description] was due on [Date]"
4. **Audit Completed** - "Audit completed for [Resident Name]: [Audit Type]"
5. **Action Completed** - "[Staff Name] completed: [Action Description]"
6. **Comment Added** - "New comment on [Resident Name]'s [Audit Type]"

#### Resident Profile Integration:
- **Bell Icon on Resident Card/Profile** - Shows count of audit-related notifications for that specific resident
- **Audit Comments Tab** - New tab in resident profile showing:
  - All audit comments chronologically
  - Filter by audit type
  - Link to full audit response
  - Action items related to this resident

### 5.2 Action Assignment Workflow

#### Creating an Action (during audit):
1. Auditor answers "No" or "Partial" to a question
2. System prompts: "Would you like to create an action item?"
3. Action creation form appears with:
   - Auto-populated description (from question + notes)
   - Priority dropdown (Low/Medium/High)
   - Assign to: User selector (filtered by team/role)
   - Due date picker (with smart defaults: High=3 days, Medium=7 days, Low=14 days)
   - Additional notes field
4. Action saved and notification sent immediately

#### Viewing & Managing Actions:

**For Assigned Staff:**
- **My Actions** page with:
  - Grouped view: Overdue, Due This Week, Due Later
  - Filter by resident, audit type, priority
  - Quick complete option with notes
  - Ability to request extension with justification

**For Auditors/Managers:**
- **Action Tracking Dashboard**:
  - All actions across team/home
  - Filter by status, assigned staff, audit type
  - Trend analysis: completion rates, average time to complete
  - Overdue action alerts

### 5.3 Audit Form UX Enhancements

#### Smart Features:
1. **Auto-save Draft** - Save progress every 30 seconds
2. **Resume Incomplete Audits** - Banner showing "You have 3 incomplete audits"
3. **Bulk Actions** - For questions with same answer (e.g., mark all N/A for non-applicable sections)
4. **Evidence Upload**:
   - Camera integration for mobile devices
   - File upload for desktop
   - Attach multiple photos per question
5. **Offline Mode** - Complete audits offline, sync when back online
6. **Score Calculation** - Real-time compliance percentage as questions are answered
7. **Summary View** - Before submission, show:
   - Total questions answered
   - Compliance score
   - Number of actions created
   - List of incomplete required questions

### 5.4 Reporting & Analytics

#### Dashboard Views:

**Compliance Overview:**
- Pie chart: Audit status (Completed, Overdue, Due This Week)
- Bar chart: Compliance scores by audit type
- Line graph: Compliance trends over time
- Heat map: Issues by resident/area

**Action Management:**
- Kanban board: Pending → In Progress → Completed
- Table view with filters and sorting
- Overdue alerts prominently displayed

**Regulatory Reports:**
- Pre-built templates for CQC, RQIA inspections
- Export options: PDF, Excel, CSV
- Customizable date ranges
- Drill-down capability from summary to detail

#### Export Features:
- **Single Audit Export** - PDF with full questions, answers, evidence photos
- **Batch Export** - All audits for a resident (for care reviews)
- **Compliance Report** - Summary across all audits for regulatory submission

---

## 6. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Database & Question Templates

**Tasks:**
1. Create Convex schema for all audit tables
2. Write seed data: Create all 40 audit templates with questions
3. Build Convex queries:
   - `getAuditTemplateByName`
   - `getAuditTemplatesByCategory`
   - `getAllAuditTemplates`
4. Update existing audit list pages to pull from templates (instead of hardcoded arrays)
5. Test data retrieval and display

**Deliverables:**
- ✅ Schema deployed to Convex
- ✅ 40 audit templates with questions created
- ✅ Audit lists dynamically loaded from database

---

### Phase 2: Audit Response System (Weeks 3-4)
**Goal:** Save audit responses to database

**Tasks:**
1. Build audit detail page to load questions from template
2. Create Convex mutations:
   - `createAuditResponse` (save draft)
   - `updateAuditResponse` (auto-save)
   - `submitAuditResponse` (finalize)
3. Implement auto-save (every 30s)
4. Build "Resume Draft" functionality
5. Add score calculation logic
6. Create submission confirmation flow

**Deliverables:**
- ✅ Audits saved to database
- ✅ Draft/resume functionality working
- ✅ Submission flow complete

---

### Phase 3: Action Management (Weeks 5-6)
**Goal:** Create and track action items

**Tasks:**
1. Build action creation UI (embedded in audit form)
2. Create Convex mutations:
   - `createAuditAction`
   - `updateActionStatus`
   - `completeAction`
3. Build "My Actions" page for staff
4. Build "Action Tracking" page for managers
5. Implement status workflow (Pending → In Progress → Completed)
6. Add overdue detection logic (scheduled Convex function)

**Deliverables:**
- ✅ Action creation from audits
- ✅ Action management pages
- ✅ Overdue detection automated

---

### Phase 4: Notification System (Weeks 7-8)
**Goal:** Real-time notifications and alerts

**Tasks:**
1. Create Convex schema for notifications
2. Build notification creation triggers:
   - On action assignment
   - On action completion
   - On audit submission
   - Daily overdue check (scheduled function)
3. Build notification bell UI component
4. Build notification panel with filtering
5. Add notification badge to resident profiles
6. Create "Audit Comments" tab in resident profile
7. Mark as read/unread functionality

**Deliverables:**
- ✅ Notification system live
- ✅ Bell icon with real-time counts
- ✅ Resident profile integration

---

### Phase 5: Reporting & Analytics (Weeks 9-10)
**Goal:** Dashboards and exports

**Tasks:**
1. Build audit dashboard page
2. Create Convex queries for analytics:
   - Compliance scores by audit type
   - Overdue audit counts
   - Action completion rates
   - Trend data over time
3. Implement charts using Recharts
4. Build PDF export for individual audits
5. Build compliance report generator
6. Add filtering and date range selection

**Deliverables:**
- ✅ Dashboard with key metrics
- ✅ PDF export functionality
- ✅ Compliance reports

---

### Phase 6: UX Enhancements (Weeks 11-12)
**Goal:** Polish and mobile optimization

**Tasks:**
1. Add evidence upload (camera/file)
2. Implement offline mode with sync
3. Build bulk answer options
4. Add keyboard shortcuts for efficiency
5. Mobile responsive optimization
6. Add audit scheduling (auto-create upcoming audits)
7. User acceptance testing
8. Bug fixes and performance optimization

**Deliverables:**
- ✅ Evidence upload working
- ✅ Mobile-optimized experience
- ✅ Production-ready system

---

## 7. Technical Architecture

### 7.1 Frontend Structure

```
app/(dashboard)/
├── dashboard/
│   ├── audit-dashboard/          # NEW: Analytics dashboard
│   │   └── page.tsx
│   ├── my-actions/                # NEW: Staff action list
│   │   └── page.tsx
│   ├── action-tracking/           # NEW: Manager action oversight
│   │   └── page.tsx
│   ├── resident-audit/
│   │   ├── page.tsx               # Resident list
│   │   └── [id]/
│   │       └── audit/
│   │           ├── page.tsx       # Audit type list
│   │           └── [auditId]/     # CHANGED: Use template ID
│   │               └── page.tsx   # Dynamic audit form
│   └── home-audit/
│       ├── page.tsx               # Category tabs
│       └── [category]/
│           └── [auditId]/         # CHANGED: Use template ID
│               └── page.tsx       # Dynamic audit form

components/
├── audit/                         # NEW: Audit-specific components
│   ├── AuditForm.tsx             # Reusable audit form
│   ├── AuditQuestion.tsx         # Question with actions
│   ├── ActionCreator.tsx         # Action creation modal
│   ├── ActionCard.tsx            # Action item display
│   ├── EvidenceUpload.tsx        # Photo/file upload
│   └── ComplianceScore.tsx       # Real-time score display
├── notifications/                 # NEW: Notification system
│   ├── NotificationBell.tsx      # Bell icon + count
│   ├── NotificationPanel.tsx     # Dropdown panel
│   └── NotificationItem.tsx      # Individual notification
└── ui/                            # Existing shadcn components
```

### 7.2 Convex Backend Structure

```
convex/
├── auditTemplates.ts             # Template CRUD
├── auditResponses.ts             # Response CRUD + queries
├── auditActions.ts               # Action management
├── auditNotifications.ts         # Notification system
├── auditSchedule.ts              # Auto-scheduling (future)
├── auditAnalytics.ts             # Reporting queries
└── crons.ts                       # Scheduled tasks
    ├── checkOverdueAudits()      # Daily at 6am
    ├── checkOverdueActions()     # Daily at 6am
    └── createScheduledAudits()   # Weekly on Monday
```

### 7.3 Key Convex Queries & Mutations

```typescript
// auditTemplates.ts
export const getTemplateById = query(...)
export const getTemplatesByCategory = query(...)
export const getAllTemplates = query(...)

// auditResponses.ts
export const createDraft = mutation(...)
export const updateDraft = mutation(...)
export const submitAudit = mutation(...)
export const getAuditsByResident = query(...)
export const getAuditsByDateRange = query(...)
export const getOverdueAudits = query(...)
export const getComplianceScore = query(...)

// auditActions.ts
export const createAction = mutation(...)
export const updateActionStatus = mutation(...)
export const completeAction = mutation(...)
export const getMyActions = query(...)              // For staff
export const getActionsByAuditor = query(...)       // For managers
export const getActionsByResident = query(...)
export const getOverdueActions = query(...)

// auditNotifications.ts
export const createNotification = mutation(...)
export const getMyNotifications = query(...)
export const markAsRead = mutation(...)
export const markAllAsRead = mutation(...)
export const getUnreadCount = query(...)
export const getResidentNotificationCount = query(...)  // For resident bell icon

// auditAnalytics.ts
export const getComplianceDashboard = query(...)
export const getAuditTrends = query(...)
export const getActionMetrics = query(...)
export const getAuditHistory = query(...)
```

---

## 8. Data Migration & Seeding

### 8.1 Seed Data Strategy

**Step 1:** Create audit templates
```typescript
// convex/seedAuditTemplates.ts
// Run once to populate all 40 templates with questions
```

**Step 2:** Migrate existing localStorage data (optional)
```typescript
// One-time migration script to convert localStorage audit data to database
// Can be run from a special admin page
```

**Step 3:** Test data generation
```typescript
// Create sample audits for testing/demo purposes
// Useful for UAT and training
```

---

## 9. Security & Permissions

### 9.1 Role-Based Access Control

**Roles:**
- **Owner/Manager** - Full access (create, edit, delete, assign)
- **Senior Care Staff** - Conduct audits, create actions, view all
- **Care Staff** - View assigned actions, complete actions, view own audits
- **Read-Only** - View reports only (for regulators/inspectors)

**Permission Matrix:**

| Action | Owner | Manager | Senior Staff | Care Staff |
|--------|-------|---------|--------------|------------|
| Conduct Audit | ✅ | ✅ | ✅ | ✅* |
| Create Action | ✅ | ✅ | ✅ | ❌ |
| Assign Action | ✅ | ✅ | ✅ | ❌ |
| Complete Action | ✅ | ✅ | ✅ | ✅** |
| View All Audits | ✅ | ✅ | ✅ | ❌ |
| View Own Actions | ✅ | ✅ | ✅ | ✅ |
| Delete Audit | ✅ | ✅ | ❌ | ❌ |
| Export Reports | ✅ | ✅ | ✅ | ❌ |
| Create Templates | ✅ | ❌ | ❌ | ❌ |

*Restricted to assigned audits
**Only actions assigned to them

### 9.2 Data Protection

- Audit responses contain sensitive resident data (DNACPR, medical info)
- Implement row-level security in Convex based on teamId
- Audit trail: Track who viewed/edited each audit
- GDPR compliance: Data retention policies (keep audits for 7 years as per UK regulations)

---

## 10. Success Metrics

### 10.1 User Adoption Metrics
- % of audits completed on time (Target: >95%)
- Average time to complete an audit (Target: <15 minutes)
- % of actions completed by due date (Target: >90%)
- User satisfaction score (Target: >4.5/5)

### 10.2 Compliance Metrics
- Overall compliance score across all audits (Target: >85%)
- Number of audit findings requiring action (Track trend - aim to decrease)
- Time from audit to action completion (Target: <7 days)
- Audit frequency adherence (Target: 100% of scheduled audits completed)

### 10.3 System Performance
- Page load time for audit forms (Target: <2 seconds)
- Notification delivery latency (Target: <10 seconds)
- Mobile responsiveness score (Target: >90)
- System uptime (Target: 99.9%)

---

## 11. User Training & Rollout

### 11.1 Training Plan

**Phase 1: Manager Training (Week 1)**
- System overview and navigation
- Conducting audits
- Creating and assigning actions
- Dashboard and reporting
- User management

**Phase 2: Auditor Training (Week 2)**
- Conducting specific audit types
- Best practices for note-taking
- Evidence upload
- Action creation and follow-up

**Phase 3: Care Staff Training (Week 3)**
- Receiving action notifications
- Completing assigned actions
- Viewing audit results for their residents

### 11.2 Support Materials
- Video tutorials for each user role
- Quick reference guides (PDF/printable)
- FAQs
- In-app tooltips and help text
- Dedicated support channel (Slack/Teams)

### 11.3 Rollout Strategy

**Pilot Phase (2 weeks):**
- 1 care home, 10 residents
- All audit types tested
- Daily feedback sessions
- Bug fixes and adjustments

**Staged Rollout (4 weeks):**
- Week 1: 25% of homes
- Week 2: 50% of homes
- Week 3: 75% of homes
- Week 4: 100% of homes

**Success Criteria for Full Rollout:**
- <5 critical bugs
- >80% user satisfaction
- >90% audit completion rate during pilot

---

## 12. Future Enhancements (Post-MVP)

### 12.1 AI-Powered Features
- **Smart Suggestions** - AI recommends actions based on similar past audits
- **Anomaly Detection** - Alert when audit scores drop significantly
- **Predictive Analytics** - Forecast areas likely to have compliance issues

### 12.2 Advanced Integrations
- **CQC API Integration** - Direct submission of required reports
- **Calendar Integration** - Sync audit schedules with Outlook/Google Calendar
- **Mobile App** - Native iOS/Android app for offline auditing
- **Voice Notes** - Speech-to-text for audit notes

### 12.3 Workflow Automation
- **Auto-scheduling** - Automatically create audits based on frequency
- **Smart Reminders** - Multi-channel reminders (email, SMS, in-app)
- **Escalation Workflow** - Auto-escalate overdue actions to managers
- **Approval Workflows** - Multi-level approval for critical audit findings

---

## 13. Risk Management

### 13.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss during migration | Low | High | Backup localStorage before migration, staged rollout |
| Performance issues with large datasets | Medium | Medium | Implement pagination, indexing, caching |
| Offline mode sync conflicts | Medium | Medium | Implement conflict resolution logic, show warnings |
| Notification overload | High | Low | Smart batching, user preferences for notification types |

### 13.2 User Adoption Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Staff resistance to change | High | High | Comprehensive training, highlight time-saving benefits |
| Low mobile usage | Medium | Medium | Ensure desktop experience is excellent, gradual mobile adoption |
| Incomplete audits | Medium | High | Auto-save, resume prompts, manager oversight dashboard |
| Action assignments ignored | Medium | High | Escalation workflow, performance tracking, gamification |

---

## 14. Conclusion

This audit system will transform CareO from a basic UI prototype into a comprehensive compliance management platform. By implementing pre-filled question sets, robust action tracking, and intelligent notifications, we create a system that:

✅ **Saves time** - Audits completed in <15 minutes with pre-filled questions
✅ **Improves compliance** - Real-time tracking ensures nothing falls through the cracks
✅ **Enhances accountability** - Clear assignment and tracking of corrective actions
✅ **Supports decision-making** - Analytics reveal trends and areas for improvement
✅ **Meets regulatory requirements** - Comprehensive audit trails for CQC/RQIA inspections

### Immediate Next Steps:
1. **Review & approve this plan** with stakeholders
2. **Prioritize Phase 1** - Database schema and question templates
3. **Assign development resources** - Estimate 12 weeks for full implementation
4. **Set up project tracking** - Create tickets for each task
5. **Begin Phase 1 development** - Foundation work on schema and seed data

---

**Document Version:** 1.0
**Date:** October 2, 2025
**Author:** Product & Engineering Team
**Status:** Awaiting Approval
**Next Review:** After Phase 1 completion
