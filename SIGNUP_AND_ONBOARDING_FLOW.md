# **Signup & Onboarding Flow Analysis**

## **Answers to Your Questions**

---

## **Question 1: Does current system allow different users to come up and just sign up and create their own care homes?**

### **Answer: ✅ YES - Anyone can sign up and create a care home**

### **Current Implementation:**

**No restrictions exist** - the system allows **open self-registration**:

1. **Public Signup Page** (`/signup`)
   - Anyone can access `/signup` without authentication
   - No approval process
   - No invitation required

2. **Signup Process** (`components/auth/forms/SignupForm.tsx`):
   ```typescript
   // User provides: name, email, password
   await authClient.signUp.email({
     name: values.name,
     email: values.email,
     password: values.password
   });
   ```

3. **After Signup** (`SignupForm.tsx:67-74`):
   ```typescript
   onSuccess: async () => {
     if (token) {
       // Has invitation token → redirect to accept invitation
       router.push(`/accept-invitation?token=${token}&email=${values.email}`);
     } else {
       // NO TOKEN → redirect to onboarding (can create care home)
       router.push("/onboarding");
     }
   }
   ```

4. **Onboarding Flow** (`app/(onboarding)/onboarding/page.tsx`):
   - System checks: `activeMember?.role`
   - **If no member record exists** → User can create organization
   - **When organization is created** → User automatically becomes `owner`

5. **Organization Creation** (`components/onboarding/organization/OrganizationForm.tsx:88-107`):
   ```typescript
   // Creating new organization
   await authClient.organization.create({
     name: values.name,
     slug: values.name.toLowerCase().replace(/ /g, "-")
   });
   ```
   - **No permission check** - anyone can call this
   - Better Auth automatically assigns `owner` role to creator

### **Security Gap Identified:**

**🔴 CRITICAL ISSUE**: There is **NO validation** preventing:
- Spam account creation
- Multiple care homes by same user
- Unauthorized care home creation
- No approval workflow

**Current Behavior:**
- User A signs up → Creates "Care Home X" → Becomes owner
- User B signs up → Creates "Care Home Y" → Becomes owner
- User C signs up → Creates "Care Home Z" → Becomes owner
- **All without any restrictions**

---

## **Question 2: How does onboarding happen for people below owners in hierarchy?**

### **Answer: Invitation-based flow with role assignment**

### **Current Implementation:**

#### **Step 1: Invitation Sent**

**Who can invite:**
- `owner` role
- `admin` role (called "admin" in code, but functionally a manager)

**Invitation Process** (`lib/auth.ts:97-109`):
```typescript
async sendInvitationEmail(data) {
  const inviteLink = `${process.env.NEXT_PUBLIC_BASE_URL}/accept-invitation?token=${data.id}&email=${data.email}`;
  await resend.emails.send({
    from: "Uprio <uprio@auth.tryuprio.com>",
    to: [data.email],
    subject: "You've been invited to join a team",
    html: `
      <h3>You've been invited to join ${data.organization.name} team by ${data.inviter.user.name}</h3>
      <p>Click <a href="${inviteLink}">here</a> to accept the invitation.</p>
    `
  });
}
```

**Invitation includes:**
- Email address
- Role (`admin` or `member` only - **nurse and care_assistant not supported**)
- Organization ID
- Invitation token

#### **Step 2: User Receives Email**

**Email contains link:**
```
/accept-invitation?token={invitationId}&email={email}
```

#### **Step 3: Accept Invitation Flow**

**Scenario A: New User (No Account)**

1. User clicks invitation link → `/accept-invitation?token=xxx&email=xxx`
2. System checks if user is logged in (`app/(auth)/accept-invitation/page.tsx:74-84`):
   ```typescript
   if (!session) {
     // Redirect to signup with token preserved
     router.push(`/signup?token=${token}&email=${email}`);
   }
   ```

3. User signs up (`SignupForm.tsx:68-70`):
   ```typescript
   if (token) {
     // After signup, redirect to accept invitation
     router.push(`/accept-invitation?token=${token}&email=${values.email}`);
   }
   ```

4. User accepts invitation (`accept-invitation/page.tsx:26-48`):
   ```typescript
   await authClient.organization.acceptInvitation({
     invitationId: token!
   });
   
   // After acceptance:
   if (userFromDb?.isOnboardingComplete) {
     router.push("/dashboard");
   } else {
     router.push("/onboarding"); // Go to role-specific onboarding
   }
   ```

**Scenario B: Existing User (Has Account)**

1. User clicks invitation link
2. If already logged in → Directly to accept invitation page
3. Accepts invitation → Redirects to onboarding or dashboard

#### **Step 4: Role Assignment**

**When invitation is accepted:**
- Better Auth creates `member` record:
  ```typescript
  {
    userId: "user123",
    organizationId: "org456",
    role: "admin" | "member"  // From invitation
  }
  ```

**⚠️ LIMITATION**: Only `admin` and `member` roles can be assigned via invitation. **No `nurse` or `care_assistant` invitation support exists.**

#### **Step 5: Role-Specific Onboarding**

**After invitation acceptance, user goes to `/onboarding`:**

**Admin Role** (`onboarding/page.tsx:65-92`):
- Step 1: Profile setup
- Step 2: Theme selection
- Step 3: **Create teams** (units/wards)

**Member Role** (`onboarding/page.tsx:96-126`):
- Step 1: Profile setup
- Step 2: Theme selection
- **No team creation** - they're assigned to teams by admin/owner

**Owner Role** (`onboarding/page.tsx:30-61`):
- Step 1: Profile setup
- Step 2: Theme selection
- Step 3: **Create care home** (organization)
- Step 4: Invite managers

### **Current Limitations:**

1. **❌ No Nurse Onboarding**: Nurse role doesn't exist in invitation system
2. **❌ No Care Assistant Onboarding**: Care assistant role doesn't exist
3. **⚠️ Generic Member Role**: All non-admin staff get same `member` role
4. **⚠️ No Team Assignment During Invitation**: Teams assigned after onboarding

---

## **Question 3: What is the current signup flow?**

### **Answer: Two distinct flows based on invitation token**

### **Flow Diagram:**

```
┌─────────────────────────────────────────────────────────────┐
│                    USER VISITS /signup                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │  Has invitation token in URL?     │
        └───────────────────────────────────┘
                    │                    │
            YES ────┘                    └─── NO
            │                                    │
            ▼                                    ▼
┌──────────────────────────┐    ┌──────────────────────────────┐
│  FLOW A:                  │    │  FLOW B:                      │
│  Invited User             │    │  Self-Registration (Owner)    │
└──────────────────────────┘    └──────────────────────────────┘
            │                                    │
            ▼                                    ▼
    ┌───────────────┐                  ┌───────────────┐
    │ Fill signup   │                  │ Fill signup   │
    │ form          │                  │ form          │
    │ (email pre-   │                  │ (all fields)  │
    │  filled)      │                  │               │
    └───────────────┘                  └───────────────┘
            │                                    │
            ▼                                    ▼
    ┌───────────────┐                  ┌───────────────┐
    │ Submit form   │                  │ Submit form   │
    └───────────────┘                  └───────────────┘
            │                                    │
            ▼                                    ▼
┌──────────────────────────┐    ┌──────────────────────────────┐
│ Better Auth creates user │    │ Better Auth creates user     │
│ Convex onCreateUser hook  │    │ Convex onCreateUser hook      │
│ creates local user record│    │ creates local user record    │
└──────────────────────────┘    └──────────────────────────────┘
            │                                    │
            ▼                                    ▼
    ┌───────────────┐                  ┌───────────────┐
    │ Redirect to   │                  │ Redirect to   │
    │ /accept-      │                  │ /onboarding   │
    │ invitation    │                  │               │
    └───────────────┘                  └───────────────┘
            │                                    │
            ▼                                    ▼
    ┌───────────────┐                  ┌───────────────┐
    │ Accept        │                  │ Check: Has    │
    │ invitation    │                  │ member record?│
    └───────────────┘                  └───────────────┘
            │                                    │
            ▼                                    │
    ┌───────────────┐                            │
    │ Member record │                            │
    │ created with  │                            │
    │ role from     │                            │
    │ invitation    │                            │
    └───────────────┘                            │
            │                                    │
            └────────────┬───────────────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │  Role Detection        │
            │  (activeMember?.role)   │
            └────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   ┌─────────┐    ┌─────────┐    ┌─────────┐
   │ owner   │    │ admin   │    │ member  │
   └─────────┘    └─────────┘    └─────────┘
        │                │                │
        ▼                ▼                ▼
   ┌─────────┐    ┌─────────┐    ┌─────────┐
   │ 4 steps │    │ 3 steps │    │ 2 steps │
   │ - Profile│    │ - Profile│    │ - Profile│
   │ - Theme  │    │ - Theme  │    │ - Theme  │
   │ - Create │    │ - Teams │    │         │
   │   Org    │    │         │    │         │
   │ - Invite │    │         │    │         │
   └─────────┘    └─────────┘    └─────────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │  Complete onboarding  │
            │  Set isOnboardingComplete│
            │  = true                │
            └────────────────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │  Redirect to /dashboard│
            └────────────────────────┘
```

### **Detailed Flow Breakdown:**

#### **FLOW A: Invited User Signup**

**Step 1: User receives invitation email**
- Email contains: `/accept-invitation?token={id}&email={email}`

**Step 2: User clicks link**
- If not logged in → Redirected to `/signup?token={id}&email={email}`

**Step 3: Signup form pre-fills email**
```typescript
// SignupForm.tsx:45
defaultValues: {
  name: "",
  email: invitationEmail ?? "",  // Pre-filled from URL
  password: ""
}
```

**Step 4: User submits form**
```typescript
// SignupForm.tsx:52-77
await authClient.signUp.email({...}, {
  onSuccess: async () => {
    if (token) {
      // Redirect to accept invitation
      router.push(`/accept-invitation?token=${token}&email=${values.email}`);
    }
  }
});
```

**Step 5: Accept invitation**
```typescript
// accept-invitation/page.tsx:26-48
await authClient.organization.acceptInvitation({
  invitationId: token!
});

// Creates member record:
// {
//   userId: "user123",
//   organizationId: "org456",
//   role: "admin" | "member"
// }
```

**Step 6: Redirect to onboarding**
- Based on role: `admin` (3 steps) or `member` (2 steps)

---

#### **FLOW B: Self-Registration (Owner)**

**Step 1: User visits `/signup`**
- No token in URL
- Public access, no restrictions

**Step 2: User fills signup form**
```typescript
// SignupForm.tsx:41-48
const form = useForm({
  defaultValues: {
    name: "",
    email: "",  // Empty - user enters
    password: ""
  }
});
```

**Step 3: User submits form**
```typescript
// SignupForm.tsx:67-74
onSuccess: async () => {
  if (token) {
    // No token here
  } else {
    router.push("/onboarding");  // Direct to onboarding
  }
}
```

**Step 4: Backend creates user**
```typescript
// convex/auth.ts:30-37
onCreateUser: async (ctx, user) => {
  return ctx.db.insert("users", {
    email: user.email,
    name: user.name || undefined,
    image: user.image || undefined,
    isOnboardingComplete: false  // Not complete yet
  });
}
```

**Step 5: Onboarding page checks role**
```typescript
// onboarding/page.tsx:22-23
const { data: activeMember } = authClient.useActiveMember();

// If no member record exists → activeMember is null
```

**Step 6: User creates organization**
```typescript
// OrganizationForm.tsx:88-107
await authClient.organization.create({
  name: values.name,
  slug: values.name.toLowerCase().replace(/ /g, "-")
});

// Better Auth automatically:
// 1. Creates organization
// 2. Creates member record with role: "owner"
// 3. Sets activeOrganizationId in session
```

**Step 7: Owner onboarding (4 steps)**
- Step 1: Profile
- Step 2: Theme
- Step 3: Create care home ✅ (just completed)
- Step 4: Invite managers

**Step 8: Complete onboarding**
- Set `isOnboardingComplete: true`
- Redirect to `/dashboard`

---

### **Key Code References:**

**Signup Form:**
- `components/auth/forms/SignupForm.tsx` - Handles both flows
- Checks for `token` in URL to determine flow

**Invitation Acceptance:**
- `app/(auth)/accept-invitation/page.tsx` - Accepts invitation and assigns role

**Onboarding:**
- `app/(onboarding)/onboarding/page.tsx` - Role-based onboarding steps
- `components/onboarding/organization/OrganizationForm.tsx` - Creates care home

**Backend:**
- `convex/auth.ts:30-37` - Creates user record on signup
- `lib/auth.ts:97-109` - Sends invitation emails

---

## **Summary of Current State**

### **✅ What Works:**

1. **Open self-registration** - Anyone can sign up
2. **Automatic owner assignment** - Creator becomes owner
3. **Invitation system** - Emails sent via Resend
4. **Role-based onboarding** - Different flows for owner/admin/member

### **❌ What's Missing/Broken:**

1. **No restriction on care home creation** - Anyone can create unlimited care homes
2. **No nurse/care_assistant roles** - Only `admin` and `member` supported
3. **No approval workflow** - No admin approval for new care homes
4. **No validation** - No checks for duplicate care homes, spam, etc.

### **⚠️ Security Concerns:**

1. **Spam vulnerability** - No rate limiting on signup
2. **Unlimited care homes** - Same user can create multiple organizations
3. **No email verification** - `requireEmailVerification: false` in config
4. **No organization name uniqueness** - Only checks if slug exists

---

## **Recommendations for Proposed Model**

Based on your requirements, here's what needs to change:

### **1. Restrict Care Home Creation**

**Current:** Anyone can create care home  
**Proposed:** Only approved users or invitation-only

**Options:**
- **Option A**: Require invitation from platform admin
- **Option B**: Add approval workflow (signup → admin approves → can create)
- **Option C**: Keep open but add validation/limits

### **2. Add Missing Roles**

**Current:** `owner`, `admin`, `member`  
**Proposed:** `owner`, `manager`, `nurse`, `care_assistant`

**Changes needed:**
- Update invitation form to include all 4 roles
- Add onboarding flows for nurse and care_assistant
- Update role checks throughout codebase

### **3. Clarify Owner Multi-Care-Home Access**

**Current:** User can create multiple care homes  
**Proposed:** Owner can be added to multiple care homes (not create unlimited)

**Implementation:**
- Remove ability to create organization from onboarding
- Add "Add Owner" invitation flow
- Owner can only be added by existing owner or platform admin

---

**Document Prepared:** December 2024  
**Based on:** Code analysis of current implementation





