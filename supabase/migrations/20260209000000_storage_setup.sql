-- ============================================
-- STORAGE SETUP: BUCKETS AND RLS POLICIES
-- ============================================

-- Create careo-public bucket (for avatars and logos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('careo-public', 'careo-public', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create resident-files bucket (for resident PII)
INSERT INTO storage.buckets (id, name, public)
VALUES ('resident-files', 'resident-files', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Disable RLS on storage.objects to clean up old policies if needed 
-- (Optional, but good practice if we want fresh start)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------
-- POLICIES FOR careo-public
-- -------------------------------------------------------------

DROP POLICY IF EXISTS "Public access to careo-public" ON storage.objects;
CREATE POLICY "Public access to careo-public"
ON storage.objects FOR SELECT
USING (bucket_id = 'careo-public');

DROP POLICY IF EXISTS "Authenticated users can upload to careo-public" ON storage.objects;
CREATE POLICY "Authenticated users can upload to careo-public"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'careo-public');

DROP POLICY IF EXISTS "Authenticated users can update their own uploads in careo-public" ON storage.objects;
CREATE POLICY "Authenticated users can update their own uploads in careo-public"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'careo-public')
WITH CHECK (bucket_id = 'careo-public');

DROP POLICY IF EXISTS "Authenticated users can delete from careo-public" ON storage.objects;
CREATE POLICY "Authenticated users can delete from careo-public"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'careo-public');

-- -------------------------------------------------------------
-- POLICIES FOR resident-files
-- -------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can view resident-files" ON storage.objects;
CREATE POLICY "Authenticated users can view resident-files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'resident-files');

DROP POLICY IF EXISTS "Authenticated users can upload to resident-files" ON storage.objects;
CREATE POLICY "Authenticated users can upload to resident-files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resident-files');

DROP POLICY IF EXISTS "Authenticated users can update resident-files" ON storage.objects;
CREATE POLICY "Authenticated users can update resident-files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'resident-files')
WITH CHECK (bucket_id = 'resident-files');

DROP POLICY IF EXISTS "Authenticated users can delete from resident-files" ON storage.objects;
CREATE POLICY "Authenticated users can delete from resident-files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'resident-files');
