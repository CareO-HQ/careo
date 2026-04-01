-- Create wound_folders table for organizing wounds
CREATE TABLE IF NOT EXISTS public.wound_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Folder info
  name TEXT NOT NULL, -- e.g., "Pressure Ulcer - 04-03-2026"
  wound_type TEXT NOT NULL, -- Type of wound this folder is for

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add wound_folder_id foreign key constraint now that wound_folders exists
-- (the column was already added in 20260304000000_create_wounds_table.sql)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'wounds_wound_folder_id_fkey'
    ) THEN
        ALTER TABLE public.wounds
            ADD CONSTRAINT wounds_wound_folder_id_fkey
            FOREIGN KEY (wound_folder_id) REFERENCES public.wound_folders(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wound_folders_resident_id ON public.wound_folders(resident_id);
CREATE INDEX IF NOT EXISTS idx_wound_folders_organization_id ON public.wound_folders(organization_id);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_wound_folders_updated_at ON public.wound_folders;
CREATE TRIGGER update_wound_folders_updated_at
  BEFORE UPDATE ON public.wound_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.wound_folders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wound_folders
DROP POLICY IF EXISTS "Users within organization can view wound folders" ON public.wound_folders;
CREATE POLICY "Users within organization can view wound folders"
    ON public.wound_folders FOR SELECT
    USING ( public.can_access_organization(organization_id) );

DROP POLICY IF EXISTS "Nurse/Manager/Owner can insert wound folders" ON public.wound_folders;
CREATE POLICY "Nurse/Manager/Owner can insert wound folders"
    ON public.wound_folders FOR INSERT
    WITH CHECK (
        public.can_access_organization(organization_id)
        AND (public.get_user_role(auth.uid()) IN ('nurse', 'manager', 'owner', 'saas_admin'))
    );

DROP POLICY IF EXISTS "Nurse/Manager/Owner can update wound folders" ON public.wound_folders;
CREATE POLICY "Nurse/Manager/Owner can update wound folders"
    ON public.wound_folders FOR UPDATE
    USING (
        public.can_access_organization(organization_id)
        AND (public.get_user_role(auth.uid()) IN ('nurse', 'manager', 'owner', 'saas_admin'))
    );

DROP POLICY IF EXISTS "Manager/Owner can delete wound folders" ON public.wound_folders;
CREATE POLICY "Manager/Owner can delete wound folders"
    ON public.wound_folders FOR DELETE
    USING (
        public.can_access_organization(organization_id)
        AND (public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin'))
    );

-- Grant permissions
GRANT ALL ON TABLE public.wound_folders TO anon;
GRANT ALL ON TABLE public.wound_folders TO authenticated;
GRANT ALL ON TABLE public.wound_folders TO service_role;
