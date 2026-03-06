-- ============================================
-- CHECK IF WOUND ASSESSMENTS TABLE EXISTS
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'wound_assessments'
) AS table_exists;

-- 2. If table exists, check its structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'wound_assessments'
ORDER BY ordinal_position;

-- 3. Check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'wound_assessments';

-- 4. Check RLS policies
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

-- 5. Check if helper functions exist
SELECT
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('can_access_organization', 'get_user_role')
ORDER BY routine_name;

-- 6. Check if wound_folders table has the required wound folder
SELECT
  id,
  name,
  wound_type,
  resident_id,
  organization_id
FROM public.wound_folders
WHERE id = '5c200e6f-a3e8-40ea-8b89-3b206064989a';

-- 7. Check if resident exists
SELECT
  id,
  first_name,
  last_name,
  organization_id
FROM public.residents
WHERE id = '84f5a3df-1dc6-4cdd-9887-4695ecb4c80a';

-- 8. Check current user
SELECT
  id,
  name,
  email,
  active_organization_id,
  active_care_home_id
FROM public.users
WHERE id = 'a3b6947e-d3ae-4823-b843-fe4f6d8b33c9';

-- 9. Check if wound-photos bucket exists
SELECT
  id,
  name,
  public
FROM storage.buckets
WHERE id = 'wound-photos';
