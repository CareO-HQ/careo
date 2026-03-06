# Wound Assessment Debug Steps

## Issue
Cannot save or submit wound assessments - the form fails when trying to save.

## Changes Made
1. Added detailed error logging to the wound assessment form
2. Created test SQL file to verify database setup

## Debugging Steps

### Step 1: Check Browser Console
1. Open the wound assessment form in your browser
2. Open Developer Tools (F12 or Cmd+Option+I on Mac)
3. Go to the Console tab
4. Try to submit a wound assessment
5. Look for error messages - you should see:
   - "=== Wound Assessment Submission Started ==="
   - Form data details
   - Any error messages from Supabase

### Step 2: Verify Database Setup
1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Open the SQL Editor
3. Run this query to check if the table exists:
   ```sql
   SELECT EXISTS (
     SELECT FROM information_schema.tables
     WHERE table_schema = 'public'
     AND table_name = 'wound_assessments'
   ) AS table_exists;
   ```

### Step 3: Run the Migration (if table doesn't exist)
If the table doesn't exist, run the migration:
1. Copy the contents of `/supabase/migrations/20260307000000_create_wound_assessments_table.sql`
2. Paste it into Supabase SQL Editor
3. Run it
4. Verify no errors occurred

### Step 4: Check RLS Policies
Run this query to see if RLS policies exist:
```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'wound_assessments';
```

### Step 5: Test Manual Insert
Use the `TEST_WOUND_ASSESSMENT_INSERT.sql` file to test if you can insert manually.

## Common Issues & Solutions

### Issue 1: Table doesn't exist
**Solution**: Run the migration in Supabase SQL Editor

### Issue 2: RLS Policy blocking inserts
**Error**: "new row violates row-level security policy"
**Solution**: Check that the helper functions exist:
```sql
-- Check helper functions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('can_access_organization', 'get_user_role');
```

If they don't exist, they need to be created from earlier migrations.

### Issue 3: Missing wound_folders reference
**Error**: "insert or update on table "wound_assessments" violates foreign key constraint"
**Solution**: Verify the wound folder exists:
```sql
SELECT * FROM wound_folders WHERE id = 'YOUR_FOLDER_ID';
```

### Issue 4: Missing recorded_by user
**Error**: "null value in column "recorded_by" violates not-null constraint"
**Solution**: Check that `profile?.id` is not null in the form

### Issue 5: Storage bucket doesn't exist
**Error**: "bucket wound-photos does not exist"
**Solution**: Create the bucket:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('wound-photos', 'wound-photos', false)
ON CONFLICT (id) DO NOTHING;
```

## What to Report Back
After following these steps, please provide:
1. The exact error message from the browser console
2. Whether the wound_assessments table exists
3. The output of the RLS policies query
4. Your user's active_organization_id and role

This will help identify the specific issue!
