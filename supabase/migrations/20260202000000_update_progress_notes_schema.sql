-- Update progress_notes table to match Convex structure
-- This migration updates the schema to support the frontend's expected structure

-- First, drop the old index if it exists
DROP INDEX IF EXISTS idx_progress_notes_resident;

-- Add new columns if they don't exist
ALTER TABLE public.progress_notes
  ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('daily', 'incident', 'medical', 'behavioral', 'other')),
  ADD COLUMN IF NOT EXISTS time TEXT,
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS author_id TEXT,
  ADD COLUMN IF NOT EXISTS author_name TEXT;

-- Migrate data from old columns to new columns if content exists but note doesn't
UPDATE public.progress_notes
SET 
  note = COALESCE(note, content),
  type = COALESCE(type, 'daily'),
  time = COALESCE(time, '00:00'),
  author_id = COALESCE(author_id, recorded_by::TEXT),
  author_name = COALESCE(author_name, 'Unknown')
WHERE note IS NULL OR note = '';

-- Make note required (after migration)
ALTER TABLE public.progress_notes
  ALTER COLUMN note SET NOT NULL,
  ALTER COLUMN type SET NOT NULL,
  ALTER COLUMN time SET NOT NULL,
  ALTER COLUMN author_id SET NOT NULL,
  ALTER COLUMN author_name SET NOT NULL;

-- Drop old columns that are no longer needed
ALTER TABLE public.progress_notes
  DROP COLUMN IF EXISTS shift,
  DROP COLUMN IF EXISTS content,
  DROP COLUMN IF EXISTS mood,
  DROP COLUMN IF EXISTS health_status,
  DROP COLUMN IF EXISTS recorded_by;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_progress_notes_resident_id ON public.progress_notes(resident_id);
CREATE INDEX IF NOT EXISTS idx_progress_notes_created_at ON public.progress_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_progress_notes_type ON public.progress_notes(type);
CREATE INDEX IF NOT EXISTS idx_progress_notes_resident_type ON public.progress_notes(resident_id, type);
CREATE INDEX IF NOT EXISTS idx_progress_notes_resident_created_at ON public.progress_notes(resident_id, created_at DESC);

-- Add RLS policies for progress_notes
ALTER TABLE public.progress_notes ENABLE ROW LEVEL SECURITY;

-- Policy: SaaS admins can manage all progress notes
DROP POLICY IF EXISTS "SaaS admins manage progress notes" ON public.progress_notes;
CREATE POLICY "SaaS admins manage progress notes"
  ON public.progress_notes
  FOR ALL
  TO authenticated
  USING (public.is_saas_admin())
  WITH CHECK (public.is_saas_admin());

-- Policy: Only Owner, Manager, and Nurse can view progress notes
DROP POLICY IF EXISTS "Owner, Manager, and Nurse can view progress notes" ON public.progress_notes;
CREATE POLICY "Owner, Manager, and Nurse can view progress notes"
  ON public.progress_notes
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = progress_notes.resident_id
      AND public.can_access_organization(r.organization_id)
    )
  );

-- Policy: Only Owner, Manager, and Nurse can insert progress notes
DROP POLICY IF EXISTS "Owner, Manager, and Nurse can insert progress notes" ON public.progress_notes;
CREATE POLICY "Owner, Manager, and Nurse can insert progress notes"
  ON public.progress_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = progress_notes.resident_id
      AND public.can_access_organization(r.organization_id)
    )
  );

-- Policy: Only Owner, Manager, and Nurse can update progress notes
DROP POLICY IF EXISTS "Owner, Manager, and Nurse can update progress notes" ON public.progress_notes;
CREATE POLICY "Owner, Manager, and Nurse can update progress notes"
  ON public.progress_notes
  FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = progress_notes.resident_id
      AND public.can_access_organization(r.organization_id)
    )
  )
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = progress_notes.resident_id
      AND public.can_access_organization(r.organization_id)
    )
  );

-- Policy: Only Owner, Manager, and Nurse can delete progress notes
DROP POLICY IF EXISTS "Owner, Manager, and Nurse can delete progress notes" ON public.progress_notes;
CREATE POLICY "Owner, Manager, and Nurse can delete progress notes"
  ON public.progress_notes
  FOR DELETE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND EXISTS (
      SELECT 1 FROM public.residents r
      WHERE r.id = progress_notes.resident_id
      AND public.can_access_organization(r.organization_id)
    )
  );
