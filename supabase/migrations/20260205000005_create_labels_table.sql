-- Migration: Create labels table
-- Description: Creates the labels table for file labeling functionality

CREATE TABLE IF NOT EXISTS public.labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_labels_organization_id ON public.labels(organization_id);
CREATE INDEX IF NOT EXISTS idx_labels_name ON public.labels(name);

-- Enable RLS
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view labels in their organization
CREATE POLICY "Users can view labels in their organization"
  ON public.labels
  FOR SELECT
  USING (
    can_access_organization(organization_id)
  );

-- Users with manager/owner role can create labels
CREATE POLICY "Managers and owners can create labels"
  ON public.labels
  FOR INSERT
  WITH CHECK (
    can_access_organization(organization_id)
    AND (
      get_user_role(auth.uid()) IN ('owner', 'manager')
      OR is_saas_admin()
    )
  );

-- Users with manager/owner role can update labels
CREATE POLICY "Managers and owners can update labels"
  ON public.labels
  FOR UPDATE
  USING (
    can_access_organization(organization_id)
    AND (
      get_user_role(auth.uid()) IN ('owner', 'manager')
      OR is_saas_admin()
    )
  );

-- Users with manager/owner role can delete labels
CREATE POLICY "Managers and owners can delete labels"
  ON public.labels
  FOR DELETE
  USING (
    can_access_organization(organization_id)
    AND (
      get_user_role(auth.uid()) IN ('owner', 'manager')
      OR is_saas_admin()
    )
  );

-- Trigger to update updated_at
CREATE TRIGGER update_labels_updated_at
  BEFORE UPDATE ON public.labels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
