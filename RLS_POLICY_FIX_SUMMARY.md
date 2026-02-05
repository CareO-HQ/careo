## RLS Policy Fix Summary

### Problem Identified
The RLS (Row Level Security) error when inserting into `care_homes` table was caused by **conflicting INSERT policies**:

1. **Policy 1**: "Owners can create care homes" 
   ```sql
   WITH CHECK: ((get_user_role(auth.uid()) = 'owner'::text) AND can_access_organization(auth.uid(), organization_id))
   ```

2. **Policy 2**: "Owners and SaaS admins can create care homes" 
   ```sql
   WITH CHECK: (is_saas_admin() OR (EXISTS (
       SELECT 1 
       FROM users 
       WHERE id = auth.uid() 
       AND users.role = 'owner' 
       AND (users.active_organization_id IS NULL OR users.active_organization_id = care_homes.organization_id)
   )))
   ```

### Root Cause Analysis
The first policy was more restrictive and was being evaluated first, causing RLS violations for users with `active_organization_id` already set. This was despite the fact that both policies appeared to have similar conditions - the first policy was simply too strict.

### Solution Applied
1. **Dropped Conflicting Policy**: Removed the "Owners can create care homes" policy that was causing conflicts
2. **Verified Fix**: Tested the insertion works correctly after removing the conflicting policy

### Verification Results
- Before fix: Insertion failed with RLS violation
- After fix: Insertion works with user having `active_organization_id` set to e45e39d9-3fac-4a14-9177-8d79f1fce6da

### Current Active Policy (Correct One)
```sql
CREATE POLICY "Owners and SaaS admins can create care homes"
  ON public.care_homes FOR INSERT
  TO authenticated
  WITH CHECK ( 
    public.is_saas_admin() 
    OR (
      EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'owner'
        AND (
          active_organization_id IS NULL 
          OR active_organization_id = organization_id
        )
      )
    )
  );
```

### Migration File
Created `supabase/migrations/202601221800_drop_conflicting_policy.sql` to drop the problematic policy.
