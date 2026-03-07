<<<<<<< HEAD
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

-- Add wound_folder_id to wounds table
ALTER TABLE public.wounds ADD COLUMN IF NOT EXISTS wound_folder_id UUID REFERENCES public.wound_folders(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wound_folders_resident_id ON public.wound_folders(resident_id);
CREATE INDEX IF NOT EXISTS idx_wound_folders_organization_id ON public.wound_folders(organization_id);
CREATE INDEX IF NOT EXISTS idx_wounds_folder_id ON public.wounds(wound_folder_id);

-- Add updated_at trigger
CREATE TRIGGER update_wound_folders_updated_at
  BEFORE UPDATE ON public.wound_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
=======
-- Create wound_folders table
CREATE TABLE public.wound_folders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resident_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    wound_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Add primary key
ALTER TABLE ONLY public.wound_folders
    ADD CONSTRAINT wound_folders_pkey PRIMARY KEY (id);

-- Create indexes
CREATE INDEX idx_wound_folders_organization_id ON public.wound_folders USING btree (organization_id);
CREATE INDEX idx_wound_folders_resident_id ON public.wound_folders USING btree (resident_id);

-- Add trigger for updated_at
CREATE TRIGGER update_wound_folders_updated_at
    BEFORE UPDATE ON public.wound_folders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key constraints
ALTER TABLE ONLY public.wound_folders
    ADD CONSTRAINT wound_folders_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.wound_folders
    ADD CONSTRAINT wound_folders_resident_id_fkey
    FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE;
>>>>>>> f1f9002 (wip)

-- Enable RLS
ALTER TABLE public.wound_folders ENABLE ROW LEVEL SECURITY;

<<<<<<< HEAD
-- RLS Policies for wound_folders
CREATE POLICY "Users within organization can view wound folders"
    ON public.wound_folders FOR SELECT
    USING ( public.can_access_organization(organization_id) );
=======
-- Create policies
CREATE POLICY "Users within organization can view wound folders"
    ON public.wound_folders FOR SELECT
    USING (public.can_access_organization(organization_id));
>>>>>>> f1f9002 (wip)

CREATE POLICY "Nurse/Manager/Owner can insert wound folders"
    ON public.wound_folders FOR INSERT
    WITH CHECK (
<<<<<<< HEAD
        public.can_access_organization(organization_id)
        AND (public.get_user_role(auth.uid()) IN ('nurse', 'manager', 'owner', 'saas_admin'))
=======
        public.can_access_organization(organization_id) AND
        public.get_user_role(auth.uid()) = ANY (ARRAY['nurse'::text, 'manager'::text, 'owner'::text, 'saas_admin'::text])
>>>>>>> f1f9002 (wip)
    );

CREATE POLICY "Nurse/Manager/Owner can update wound folders"
    ON public.wound_folders FOR UPDATE
    USING (
<<<<<<< HEAD
        public.can_access_organization(organization_id)
        AND (public.get_user_role(auth.uid()) IN ('nurse', 'manager', 'owner', 'saas_admin'))
=======
        public.can_access_organization(organization_id) AND
        public.get_user_role(auth.uid()) = ANY (ARRAY['nurse'::text, 'manager'::text, 'owner'::text, 'saas_admin'::text])
>>>>>>> f1f9002 (wip)
    );

CREATE POLICY "Manager/Owner can delete wound folders"
    ON public.wound_folders FOR DELETE
    USING (
<<<<<<< HEAD
        public.can_access_organization(organization_id)
        AND (public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin'))
    );
=======
        public.can_access_organization(organization_id) AND
        public.get_user_role(auth.uid()) = ANY (ARRAY['manager'::text, 'owner'::text, 'saas_admin'::text])
    );

-- Grant permissions
GRANT ALL ON TABLE public.wound_folders TO anon;
GRANT ALL ON TABLE public.wound_folders TO authenticated;
GRANT ALL ON TABLE public.wound_folders TO service_role;

-- Add foreign key constraint from wounds table to wound_folders
-- This was deferred from the previous migration since wound_folders didn't exist yet
ALTER TABLE ONLY public.wounds
    ADD CONSTRAINT wounds_wound_folder_id_fkey
    FOREIGN KEY (wound_folder_id) REFERENCES public.wound_folders(id) ON DELETE CASCADE;
>>>>>>> f1f9002 (wip)
