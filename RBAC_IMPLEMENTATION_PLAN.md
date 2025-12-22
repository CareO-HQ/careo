# RBAC Implementation Plan - Quick Reference

## 🎯 Target Role Structure

| Role | Can Invite | Access Level | Key Features |
|------|------------|--------------|--------------|
| **Owner** | Managers | Full access to all | Organization management |
| **Manager** | Nurses, Care Assistants | Full access + special features | Audit section, Staff list, Report forwarding |
| **Nurse** | - | Unit-based (assigned units only) | Clinical features, care documentation |
| **Care Assistant** | - | Task-specific | Basic care tasks |

---

## ⚠️ Critical Security Issues (Fix Immediately)

### 1. Authorization Not Enforced
**File:** `convex/lib/authHelpers.ts`

**Problem:**
```typescript
// Current code always returns true!
export async function checkPermission(ctx, userId, permission) {
  // TODO: Implement role-based permission checks here
  // For now, any authenticated user can perform any action
  return true; // ❌ CRITICAL BUG
}
```

**Fix Required:**
```typescript
export async function checkPermission(ctx, userId, permission) {
  const member = await ctx.runQuery(components.betterAuth.lib.findOne, {
    model: "member",
    where: [{ field: "userId", value: userId }]
  });
  
  const permissions = {
    owner: ["create_incident", "view_incident", "edit_incident", "delete_incident"],
    admin: ["create_incident", "view_incident", "edit_incident", "access_audit"],
    nurse: ["create_incident", "view_incident", "edit_incident"],
    care_assistant: ["create_incident", "view_incident"],
    member: ["view_incident"],
  };
  
  if (!permissions[member.role]?.includes(permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
  
  return true;
}
```

**Apply to all mutations in:**
- `convex/incidents.ts`
- `convex/residents.ts`
- `convex/medication.ts`
- `convex/progressNotes.ts`
- `convex/foodFluidLogs.ts`

---

### 2. Unit-Based Access Not Working
**File:** `convex/lib/authHelpers.ts`

**Problem:**
```typescript
// Current code returns resident without checking team membership
export async function canAccessResident(ctx, userId, residentId) {
  const resident = await ctx.db.get(residentId);
  if (!resident) throw new Error("Resident not found");
  
  // TODO: Add role-based authorization checks here
  return resident; // ❌ No team check!
}
```

**Fix Required:**
```typescript
export async function canAccessResident(ctx, userId, residentId) {
  const resident = await ctx.db.get(residentId);
  if (!resident) throw new Error("Resident not found");
  
  const member = await ctx.runQuery(components.betterAuth.lib.findOne, {
    model: "member",
    where: [{ field: "userId", value: userId }]
  });
  
  // Owners and admins can access all residents in their org
  if (member.role === "owner" || member.role === "admin") {
    if (resident.organizationId !== member.organizationId) {
      throw new Error("Access denied");
    }
    return resident;
  }
  
  // Nurses and others can only access residents in assigned teams
  const teamMember = await ctx.db
    .query("teamMembers")
    .withIndex("byUserAndTeam", (q) => 
      q.eq("userId", userId).eq("teamId", resident.teamId)
    )
    .first();
  
  if (!teamMember) {
    throw new Error("Not authorized to access this resident");
  }
  
  return resident;
}
```

---

### 3. Middleware Not Secure
**File:** `middleware.ts`

**Problem:**
```typescript
// THIS IS NOT SECURE!
// Only checks if cookie exists, doesn't verify JWT
if (!sessionCookie) {
  return NextResponse.redirect(new URL("/", request.url));
}
```

**Fix:** See full implementation in `USER_MANAGEMENT_ANALYSIS.md` Section 8.1.3

---

## 📝 Missing Roles Implementation

### Step 1: Update Invitation Schemas

**Files to update:**
1. `schemas/settings/inviteMemberSchema.ts`
2. `schemas/InviteUsersOnboardingForm.ts`

**Change:**
```typescript
// OLD
role: z.enum(["admin", "member"])

// NEW
role: z.enum(["admin", "nurse", "care_assistant", "member"])
```

### Step 2: Update UI Components

**File:** `components/settings/SendInvitationForm.tsx`

**Add:**
```tsx
<SelectItem value="admin">Manager</SelectItem>
<SelectItem value="nurse">Nurse</SelectItem>
<SelectItem value="care_assistant">Care Assistant</SelectItem>
<SelectItem value="member">Staff</SelectItem>
```

**File:** `components/onboarding/invites/InviteForm.tsx`

**Add:** Same select items as above

### Step 3: Update Onboarding Flow

**File:** `app/(onboarding)/onboarding/page.tsx`

**Add:**
```typescript
// NURSE ONBOARDING
if (activeMember?.role === "nurse") {
  return (
    <ContentWrapper className="max-w-xl w-full">
      {/* 2 steps: Profile, Theme */}
      {/* Show assigned unit information */}
    </ContentWrapper>
  );
}

// CARE ASSISTANT ONBOARDING
if (activeMember?.role === "care_assistant") {
  return (
    <ContentWrapper className="max-w-xl w-full">
      {/* 2 steps: Profile, Theme */}
    </ContentWrapper>
  );
}
```

---

## 🔒 Manager-Specific Feature Restrictions

### Restrict Audit Section

**File:** `app/(dashboard)/dashboard/careo-audit/layout.tsx` (create new file)

```typescript
"use client";

import { authClient } from "@/lib/auth-client";
import { PermissionDenied } from "@/components/errors/PermissionDenied";

export default function AuditLayout({ children }: { children: React.ReactNode }) {
  const { data: member } = authClient.useActiveMember();
  
  if (member?.role !== "owner" && member?.role !== "admin") {
    return <PermissionDenied requiredRole="Manager" />;
  }
  
  return <>{children}</>;
}
```

### Restrict Staff List

**File:** `app/(dashboard)/dashboard/staff/page.tsx`

**Add at top of component:**
```typescript
const { data: member } = authClient.useActiveMember();

if (member?.role !== "owner" && member?.role !== "admin") {
  return <PermissionDenied requiredRole="Manager" />;
}
```

### Hide Navigation Items

**File:** `components/navigation/AppSidebar.tsx`

**Wrap audit link:**
```typescript
const { data: member } = authClient.useActiveMember();

{(member?.role === "owner" || member?.role === "admin") && (
  <SidebarMenuItem className="list-none">
    <SidebarMenuButton asChild>
      <Link href="/dashboard/careo-audit">
        <ClipboardCheck />
        <span>Audit</span>
      </Link>
    </SidebarMenuButton>
  </SidebarMenuItem>
)}
```

---

## 📧 Implement Report Forwarding

### Step 1: Create Forward Mutation

**File:** `convex/incidents.ts`

**Add:**
```typescript
export const forwardIncidentReport = mutation({
  args: {
    incidentId: v.id("incidents"),
    recipients: v.array(v.string()), // Email addresses
    message: v.optional(v.string()),
    teamId: v.string(),
    organizationId: v.string()
  },
  returns: v.object({
    success: v.boolean(),
    messagesSent: v.number()
  }),
  handler: async (ctx, args) => {
    // 1. Check user has permission
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const member = await ctx.runQuery(components.betterAuth.lib.findOne, {
      model: "member",
      where: [{ field: "userId", value: identity.subject }]
    });
    
    // Only owners and admins can forward reports
    if (member.role !== "owner" && member.role !== "admin") {
      throw new Error("Only managers can forward incident reports");
    }
    
    // 2. Get incident
    const incident = await ctx.db.get(args.incidentId);
    if (!incident) throw new Error("Incident not found");
    
    // 3. Get or generate PDF
    // TODO: Implement PDF generation if not already exists
    // For now, assume PDF exists in careFilePdfs
    
    // 4. Send emails to all recipients
    for (const recipient of args.recipients) {
      await ctx.scheduler.runAfter(0, internal.emails.sendEmailWithPDFAttachment, {
        to: recipient,
        subject: `Incident Report - ${incident.injuredPersonFirstName} ${incident.injuredPersonSurname}`,
        html: args.message || `
          <h2>Incident Report</h2>
          <p>Please find the incident report attached.</p>
          <p><strong>Date:</strong> ${incident.date}</p>
          <p><strong>Time:</strong> ${incident.time}</p>
          <p><strong>Location:</strong> ${incident.homeName}, ${incident.unit}</p>
        `,
        pdfStorageId: /* pdfFile.body */, // TODO: Get actual PDF
        filename: `Incident_Report_${incident._id}.pdf`
      });
    }
    
    return { 
      success: true, 
      messagesSent: args.recipients.length 
    };
  }
});
```

### Step 2: Create UI Component

**File:** `components/incidents/ForwardIncidentDialog.tsx` (create new)

```typescript
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Doc } from "@/convex/_generated/dataModel";
import { Plus, X } from "lucide-react";

interface ForwardIncidentDialogProps {
  incident: Doc<"incidents">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ForwardIncidentDialog({ 
  incident, 
  open, 
  onOpenChange 
}: ForwardIncidentDialogProps) {
  const [recipients, setRecipients] = useState<string[]>([""]);
  const [message, setMessage] = useState("");
  const forwardReport = useMutation(api.incidents.forwardIncidentReport);
  const [isLoading, setIsLoading] = useState(false);
  
  const addRecipient = () => {
    setRecipients([...recipients, ""]);
  };
  
  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };
  
  const updateRecipient = (index: number, value: string) => {
    const updated = [...recipients];
    updated[index] = value;
    setRecipients(updated);
  };
  
  const handleForward = async () => {
    // Validate
    const validRecipients = recipients.filter(r => r.trim() !== "");
    if (validRecipients.length === 0) {
      toast.error("Please add at least one recipient");
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!validRecipients.every(r => emailRegex.test(r))) {
      toast.error("Please enter valid email addresses");
      return;
    }
    
    try {
      setIsLoading(true);
      await forwardReport({
        incidentId: incident._id,
        recipients: validRecipients,
        message: message || undefined,
        teamId: incident.teamId,
        organizationId: incident.organizationId
      });
      
      toast.success(`Report forwarded to ${validRecipients.length} recipient(s)`);
      onOpenChange(false);
      
      // Reset form
      setRecipients([""]);
      setMessage("");
    } catch (error) {
      console.error("Error forwarding report:", error);
      toast.error("Failed to forward report");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Forward Incident Report</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label>Recipients</Label>
            {recipients.map((recipient, index) => (
              <div key={index} className="flex gap-2 mt-2">
                <Input
                  type="email"
                  placeholder="recipient@example.com"
                  value={recipient}
                  onChange={(e) => updateRecipient(index, e.target.value)}
                  disabled={isLoading}
                />
                {recipients.length > 1 && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => removeRecipient(index)}
                    disabled={isLoading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={addRecipient}
              className="mt-2"
              disabled={isLoading}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Recipient
            </Button>
          </div>
          
          <div>
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a message to include in the email..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              disabled={isLoading}
              className="mt-2"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleForward}
            disabled={isLoading}
          >
            {isLoading ? "Forwarding..." : "Forward Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Step 3: Integrate into Incidents Page

**File:** `app/(dashboard)/dashboard/residents/[id]/(pages)/incidents/page.tsx`

**Replace TODO:**
```typescript
// OLD (line ~2762)
<Button
  variant="outline"
  onClick={() => {
    // TODO: Implement forward functionality
    toast.success("Forward functionality coming soon");
  }}
>
  <Send className="w-4 h-4 mr-2" />
  Forward
</Button>

// NEW
const [showForwardDialog, setShowForwardDialog] = useState(false);

<Button
  variant="outline"
  onClick={() => setShowForwardDialog(true)}
>
  <Send className="w-4 h-4 mr-2" />
  Forward
</Button>

{/* Add dialog */}
<ForwardIncidentDialog
  incident={selectedIncident}
  open={showForwardDialog}
  onOpenChange={setShowForwardDialog}
/>
```

---

## ✅ Quick Wins (Implement First)

### 1. Add Role Display Throughout UI (1-2 hours)
**Create:** `lib/roleHelpers.ts`
```typescript
export function getRoleDisplayName(role: string): string {
  const names = {
    owner: "Owner",
    admin: "Manager",
    nurse: "Nurse",
    care_assistant: "Care Assistant",
    member: "Staff"
  };
  return names[role] || role;
}

export function getRoleBadgeVariant(role: string): "default" | "secondary" | "outline" {
  const variants = {
    owner: "default",
    admin: "default",
    nurse: "secondary",
    care_assistant: "secondary",
    member: "outline"
  };
  return variants[role] || "outline";
}
```

**Use everywhere:**
```typescript
import { getRoleDisplayName, getRoleBadgeVariant } from "@/lib/roleHelpers";

<Badge variant={getRoleBadgeVariant(member.role)}>
  {getRoleDisplayName(member.role)}
</Badge>
```

### 2. Create Permission Denied Component (30 minutes)
**Create:** `components/errors/PermissionDenied.tsx`
```typescript
"use client";

import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface Props {
  requiredRole?: string;
  message?: string;
}

export function PermissionDenied({ requiredRole, message }: Props) {
  const router = useRouter();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
      <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
      <p className="text-muted-foreground text-center max-w-md mb-4">
        {message || `This feature requires ${requiredRole || "elevated"} permissions.`}
      </p>
      <Button onClick={() => router.back()}>Go Back</Button>
    </div>
  );
}
```

### 3. Hide Audit Section from Non-Managers (15 minutes)
See "Restrict Audit Section" above

---

## 📊 Testing Checklist

Before deploying to production, test:

### Authorization
- [ ] Non-authenticated users redirected to login
- [ ] Member cannot edit incidents
- [ ] Nurse cannot delete residents
- [ ] Care assistant cannot access admin pages

### Unit-Based Access
- [ ] Nurse in Unit A cannot see Unit B residents
- [ ] Switching active team updates accessible residents
- [ ] Manager can see all units

### Manager Features
- [ ] Only managers see "Audit" in sidebar
- [ ] Non-managers get permission denied on `/dashboard/careo-audit`
- [ ] Only managers can access staff list
- [ ] Report forwarding works (email sent successfully)

### Invitations
- [ ] Owner can invite managers
- [ ] Manager can invite nurses
- [ ] Manager can invite care assistants
- [ ] Nurse cannot access invite form

---

## 🚀 Deployment Steps

1. **Backup Database**
   ```bash
   # Export Convex data
   npx convex export
   ```

2. **Apply Schema Changes**
   ```bash
   npx convex dev
   # Schema changes will auto-deploy
   ```

3. **Deploy Authorization Updates**
   ```bash
   # Test locally first
   npm run dev
   # Then deploy
   npx convex deploy
   ```

4. **Verify in Production**
   - Test each role can only access permitted features
   - Check audit logs are being created
   - Verify email forwarding works

---

## 📞 Support & Questions

If you encounter issues during implementation:

1. **Better Auth Issues:** https://www.better-auth.com/docs
2. **Convex Issues:** https://docs.convex.dev
3. **Authorization Patterns:** See `PRODUCTION_REFACTOR_PLAN.md` in repo

---

**Priority Order:**
1. ⚠️ Fix authorization checks (CRITICAL)
2. 🔒 Implement unit-based access (HIGH)
3. 📝 Add nurse/care assistant roles (MEDIUM)
4. 🚫 Restrict manager features (MEDIUM)
5. 📧 Implement report forwarding (LOW)






