-- ============================================
-- STORAGE RLS POLICIES FOR resident-files BUCKET
-- Enables authenticated users to upload/view/delete files
-- ============================================

-- Note: RLS is already enabled on storage.objects by Supabase

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload to resident-files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view resident-files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update resident-files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete from resident-files" ON storage.objects;

-- Allow authenticated users to upload files to resident-files bucket
CREATE POLICY "Users can upload to resident-files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'resident-files'
  );

-- Allow authenticated users to view files in resident-files bucket
CREATE POLICY "Users can view resident-files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'resident-files'
  );

-- Allow authenticated users to update files in resident-files bucket
CREATE POLICY "Users can update resident-files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'resident-files'
  )
  WITH CHECK (
    bucket_id = 'resident-files'
  );

-- Allow authenticated users to delete files from resident-files bucket
CREATE POLICY "Users can delete from resident-files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'resident-files'
  );
