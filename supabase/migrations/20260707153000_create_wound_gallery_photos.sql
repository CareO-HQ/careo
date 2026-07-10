-- Wound gallery photos: informal floor captures tagged to a wound folder (mobile care assistants).

CREATE TABLE IF NOT EXISTS public.wound_gallery_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wound_folder_id UUID NOT NULL REFERENCES public.wound_folders(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  photograph_url TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wound_gallery_photos_wound_folder
  ON public.wound_gallery_photos(wound_folder_id);
CREATE INDEX IF NOT EXISTS idx_wound_gallery_photos_resident
  ON public.wound_gallery_photos(resident_id);
CREATE INDEX IF NOT EXISTS idx_wound_gallery_photos_organization
  ON public.wound_gallery_photos(organization_id);
CREATE INDEX IF NOT EXISTS idx_wound_gallery_photos_captured_at
  ON public.wound_gallery_photos(captured_at DESC);

DROP TRIGGER IF EXISTS update_wound_gallery_photos_updated_at ON public.wound_gallery_photos;
CREATE TRIGGER update_wound_gallery_photos_updated_at
  BEFORE UPDATE ON public.wound_gallery_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.wound_gallery_photos ENABLE ROW LEVEL SECURITY;

-- Allow care assistants to read wound folders for gallery wound picker.
DROP POLICY IF EXISTS "Users within care home can view wound folders" ON public.wound_folders;
CREATE POLICY "Users within care home can view wound folders"
  ON public.wound_folders FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN (
      'owner', 'manager', 'nurse', 'care_assistant',
      'agency_care_assistant', 'agency_nurse', 'saas_admin'
    )
    AND public.can_access_resident(resident_id)
  );

-- Gallery photo table RLS
CREATE POLICY "Users in scope can view wound gallery photos"
  ON public.wound_gallery_photos FOR SELECT
  TO authenticated
  USING (
    public.can_access_resident(resident_id)
    AND public.current_user_role() IN (
      'owner', 'manager', 'nurse', 'care_assistant',
      'agency_care_assistant', 'agency_nurse', 'saas_admin'
    )
  );

CREATE POLICY "Care staff can insert wound gallery photos"
  ON public.wound_gallery_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_access_wound_folder(wound_folder_id)
    AND public.current_user_role() IN (
      'owner', 'manager', 'nurse', 'care_assistant',
      'agency_care_assistant', 'agency_nurse', 'saas_admin'
    )
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "Manager/Owner can delete wound gallery photos"
  ON public.wound_gallery_photos FOR DELETE
  TO authenticated
  USING (
    public.can_access_resident(resident_id)
    AND public.current_user_role() IN ('manager', 'owner', 'saas_admin')
  );

GRANT ALL ON TABLE public.wound_gallery_photos TO authenticated, service_role;

-- Storage helpers for wound-gallery/{woundFolderId}/... paths in wound-photos bucket.
CREATE OR REPLACE FUNCTION public.is_wound_gallery_object(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE((storage.foldername(object_name))[1], '') = 'wound-gallery';
$$;

CREATE OR REPLACE FUNCTION public.wound_gallery_folder_id(object_name TEXT)
RETURNS UUID
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.leading_uuid(COALESCE((storage.foldername(object_name))[2], ''));
$$;

CREATE OR REPLACE FUNCTION public.can_view_wound_gallery_object(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
  target_wound_folder_id UUID := public.wound_gallery_folder_id(object_name);
BEGIN
  RETURN public.is_wound_gallery_object(object_name)
    AND target_wound_folder_id IS NOT NULL
    AND public.can_access_wound_folder(target_wound_folder_id)
    AND public.current_user_role() IN (
      'owner', 'manager', 'nurse', 'care_assistant',
      'agency_care_assistant', 'agency_nurse', 'saas_admin'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_wound_gallery_object(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
  target_wound_folder_id UUID := public.wound_gallery_folder_id(object_name);
BEGIN
  RETURN public.is_wound_gallery_object(object_name)
    AND target_wound_folder_id IS NOT NULL
    AND public.can_access_wound_folder(target_wound_folder_id)
    AND public.current_user_role() IN (
      'owner', 'manager', 'nurse', 'care_assistant',
      'agency_care_assistant', 'agency_nurse', 'saas_admin'
    );
END;
$$;

CREATE POLICY "Care staff can view wound gallery storage objects"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'wound-photos'
    AND public.can_view_wound_gallery_object(name)
  );

CREATE POLICY "Care staff can insert wound gallery storage objects"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'wound-photos'
    AND public.can_manage_wound_gallery_object(name)
  );

-- Link formal photograph evaluations back to informal gallery captures when selected on web.
ALTER TABLE public.wound_photograph_evaluations
  ADD COLUMN IF NOT EXISTS source_gallery_photo_id UUID
  REFERENCES public.wound_gallery_photos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_wound_photo_eval_source_gallery
  ON public.wound_photograph_evaluations(source_gallery_photo_id)
  WHERE source_gallery_photo_id IS NOT NULL;
