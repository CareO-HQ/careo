-- Align public.users with manager sidebar "Care File Audit" member query and other policies
-- that reference users.organization_id.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_organization_id ON public.users (organization_id);

UPDATE public.users
SET organization_id = active_organization_id
WHERE organization_id IS NULL
  AND active_organization_id IS NOT NULL;
