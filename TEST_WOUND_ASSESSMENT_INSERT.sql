-- ============================================
-- TEST WOUND ASSESSMENT INSERT
-- Run this in Supabase SQL Editor to diagnose the issue
-- ============================================

-- First, check if the table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'wound_assessments'
) AS table_exists;

-- Check if the helper functions exist
SELECT EXISTS (
  SELECT 1 FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname = 'can_access_organization'
) AS can_access_organization_exists;

SELECT EXISTS (
  SELECT 1 FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname = 'get_user_role'
) AS get_user_role_exists;

-- Check current user info
SELECT
  auth.uid() as current_user_id,
  auth.role() as current_role;

-- Get user's active organization
SELECT
  id,
  name,
  email,
  active_organization_id,
  active_care_home_id
FROM public.users
WHERE id = auth.uid();

-- Check if wound_folders table has the required wound folder
-- Replace 'YOUR_FOLDER_ID' with actual folderId from your app
-- SELECT * FROM public.wound_folders LIMIT 5;

-- Try a simple insert test (will fail due to RLS if there's an issue)
-- Uncomment and update the UUIDs below with real values from your database:
/*
INSERT INTO public.wound_assessments (
  wound_folder_id,
  resident_id,
  organization_id,
  care_home_id,
  assessment_date,
  wound_number,
  analgesia_required,
  exudate_level,
  exudate_type,
  treatment_objectives,
  assessor_initials,
  dressing_renewed,
  reassessment_date,
  recorded_by
) VALUES (
  'YOUR_WOUND_FOLDER_ID'::uuid,
  'YOUR_RESIDENT_ID'::uuid,
  'YOUR_ORG_ID'::uuid,
  'YOUR_CARE_HOME_ID'::uuid,
  CURRENT_DATE,
  'W001',
  false,
  'low',
  'serous',
  ARRAY['protection'],
  'ABC',
  true,
  CURRENT_DATE + INTERVAL '7 days',
  auth.uid()
);
*/
