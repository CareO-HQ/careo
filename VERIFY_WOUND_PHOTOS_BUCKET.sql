-- ============================================
-- VERIFY AND FIX WOUND PHOTOS STORAGE BUCKET
-- Run this in Supabase SQL Editor if photo uploads are failing
-- ============================================

-- 1. Check if the bucket exists
SELECT * FROM storage.buckets WHERE id = 'wound-photos';

-- 2. If the bucket doesn't exist, create it
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wound-photos',
  'wound-photos',
  false, -- private bucket
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']::text[];

-- 3. Verify storage policies exist
SELECT * FROM storage.policies WHERE bucket_id = 'wound-photos';

-- 4. If policies don't exist, create them
-- Note: These should already exist from the migration, but run if needed

-- Allow authenticated users to upload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies
    WHERE bucket_id = 'wound-photos'
    AND operation = 'INSERT'
  ) THEN
    EXECUTE format('
      CREATE POLICY %I ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = %L)
    ', 'Users can upload wound photos', 'wound-photos');
  END IF;
END $$;

-- Allow authenticated users to view
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies
    WHERE bucket_id = 'wound-photos'
    AND operation = 'SELECT'
  ) THEN
    EXECUTE format('
      CREATE POLICY %I ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = %L)
    ', 'Users can view wound photos', 'wound-photos');
  END IF;
END $$;

-- 5. Test that bucket is ready
SELECT
  b.id,
  b.name,
  b.public,
  b.file_size_limit / 1024 / 1024 AS max_size_mb,
  b.allowed_mime_types,
  COUNT(p.id) AS policy_count
FROM storage.buckets b
LEFT JOIN storage.policies p ON p.bucket_id = b.id
WHERE b.id = 'wound-photos'
GROUP BY b.id, b.name, b.public, b.file_size_limit, b.allowed_mime_types;

-- Expected output should show:
-- - max_size_mb: 5
-- - policy_count: 4 (INSERT, SELECT, UPDATE, DELETE)
-- - allowed_mime_types: image formats
