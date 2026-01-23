# Debugging Plan: Owner Onboarding - Care Home Creation RLS Errors

## Summary
This plan outlines steps to debug and resolve RLS (Row Level Security) errors during the owner onboarding process, specifically when creating care homes. The goal is to identify why RLS policies on the `care_homes` table are failing and to implement detailed logging to track Supabase API calls.

## Current Architecture Analysis

### Key Components
1. **CareHomeForm.tsx**: Main component handling care home creation
2. **use-profile.ts**: Hook to retrieve user profile data
3. **supabase/migrations/202601221136_...**: RLS policy definitions for care homes
4. **lib/permissions.ts**: Role-based access control definitions

### Current Flow
1. User submits care home name and logo
2. If no active organization exists, create one
3. Update user's active_organization_id
4. Create care home record
5. Set as active care home

## Debugging Steps

### Phase 1: Enhanced Logging Implementation

#### 1. Log Supabase Request/Response Details
```typescript
// In CareHomeForm.tsx, wrap all supabase calls with detailed logging
console.log(`[DEBUG Supabase] ${operation} - Request:`, requestData);
const response = await supabase...;
console.log(`[DEBUG Supabase] ${operation} - Response:`, response);
```

#### 2. Log User Context
```typescript
console.log('[DEBUG Context] User profile:', profile);
console.log('[DEBUG Context] Auth user:', await supabase.auth.getUser());
console.log('[DEBUG Context] Database user:', await supabase.from('users').select('*').eq('id', profile.id).single());
```

#### 3. Log Policy Evaluation Context
```typescript
// Test RLS policy conditions directly
const policyCheck = await supabase.rpc('check_care_home_insert_policy');
console.log('[DEBUG RLS] Policy check result:', policyCheck);
```

### Phase 2: Debug CareHomeForm.tsx

1. **Add detailed logging to onSubmit function**
2. **Log Supabase responses with full error details**
3. **Track the entire care home creation flow**
4. **Monitor RLS errors with context information**

### Phase 3: Test RLS Policies

#### 1. Verify Policy Definitions
- Check if RLS policies are correctly applied to `care_homes` table
- Verify policy conditions are evaluating as expected
- Test policies directly using Supabase SQL interface

#### 2. Test Policy Scenarios
1. User with no active_organization_id
2. User with existing active_organization_id  
3. User with different role types (owner, manager, etc.)

### Phase 4: Validate Profile and Context

#### 1. Profile Context Validation
- Verify `useProfile` hook returns correct data
- Check if role and active_organization_id are properly set
- Validate auth metadata sync with database

#### 2. Auth Context Validation
- Check if user's app_metadata.role is set to "owner"
- Verify authenticated user context matches profile

## Implementation Plan

### Step 1: Update CareHomeForm.tsx with Enhanced Logging
```typescript
// Add detailed logging to every supabase operation
// Log: request data, response data, error details
```

### Step 2: Create Policy Evaluation Helper
```sql
-- Create a helper function to test RLS policy conditions
CREATE OR REPLACE FUNCTION public.test_care_home_insert_policy()
RETURNS JSONB AS $$
DECLARE
  user_id UUID := auth.uid();
  user_role TEXT;
  user_org_id UUID;
  policy_result BOOLEAN;
BEGIN
  SELECT role, active_organization_id INTO user_role, user_org_id
  FROM public.users 
  WHERE id = user_id;

  -- Test policy conditions
  SELECT EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = user_id 
    AND role = 'owner'
    AND (
      active_organization_id IS NULL 
      OR active_organization_id = 'some-test-id'
    )
  ) INTO policy_result;

  RETURN jsonb_build_object(
    'user_id', user_id,
    'user_role', user_role,
    'user_org_id', user_org_id,
    'policy_result', policy_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 3: Test in Staging Environment
1. Set up test user with "owner" role
2. Start onboarding process
3. Monitor console logs in browser
4. Capture RLS errors and context
5. Validate policy conditions

## Expected Log Output

```javascript
// Successful Flow Example
[DEBUG CareHomeForm] Current user profile: {id: "123", role: "owner", active_organization_id: null}
[DEBUG CareHomeForm] Creating new organization for user
[DEBUG Supabase] INSERT organizations - Request: {name: "Acme Care Home"}
[DEBUG Supabase] INSERT organizations - Response: {id: "org-123"}
[DEBUG CareHomeForm] Organization created: {id: "org-123"}
[DEBUG Supabase] UPDATE users - Request: {active_organization_id: "org-123"}
[DEBUG Supabase] UPDATE users - Response: {status: 204}
[DEBUG CareHomeForm] Creating care home with: {orgId: "org-123", name: "Acme Care Home"}
[DEBUG Supabase] INSERT care_homes - Request: {organization_id: "org-123", name: "Acme Care Home", created_by: "123"}
[DEBUG Supabase] INSERT care_homes - Response: {id: "ch-456"}
[DEBUG CareHomeForm] Care home created successfully
```

## Troubleshooting Guide

### Common RLS Error Scenarios

#### 1. Policy Violation Error
```javascript
{
  "code": "PGRST301",
  "details": null,
  "hint": null,
  "message": "New row violates row-level security policy for table \"care_homes\""
}
```

**Possible Causes**:
- User role not set to "owner"
- active_organization_id mismatch
- Policy conditions not met

**Resolution Steps**:
1. Check user's role in `public.users` table
2. Verify active_organization_id matches request
3. Test policy conditions directly

#### 2. User Not Found in Database
```javascript
{
  "code": "PGRST116",
  "details": "Could not find row with id=abc123",
  "hint": null,
  "message": "Not found"
}
```

**Possible Causes**:
- User not synced from auth to public.users
- User profile not created during signup

**Resolution Steps**:
1. Check auth.users table for user existence
2. Verify signup process completes user creation
3. Check sync triggers

## Success Criteria

1. All Supabase operations logged with request/response details
2. RLS errors include context information
3. Debug flow helps identify root cause of policy violations
4. Care home creation works correctly for owners without active organizations

## Next Steps

1. Implement enhanced logging in CareHomeForm.tsx
2. Test the updated flow with onboarding scenario
3. Analyze logs to identify RLS error root cause
4. Fix policy conditions if needed
5. Verify the fix resolves the issue
