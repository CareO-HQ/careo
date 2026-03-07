-- Create wound photograph evaluations table
CREATE TABLE IF NOT EXISTS public.wound_photograph_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wound_folder_id UUID NOT NULL REFERENCES public.wound_folders(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Photograph details
  photograph_date DATE NOT NULL,
  photograph_time TIME DEFAULT NOW()::TIME,
  photograph_url TEXT NOT NULL, -- Storage path/URL for the photograph

  -- Wound details
  site_of_wound TEXT NOT NULL,

  -- Actual measurements
  length_cm DECIMAL(10, 2),
  width_cm DECIMAL(10, 2),
  depth_cm DECIMAL(10, 2),

  -- RGN signature
  rgn_signature TEXT NOT NULL,
  rgn_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,

  -- Additional information
  comment TEXT,

  -- Audit trail
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wound_photo_eval_wound_folder ON public.wound_photograph_evaluations(wound_folder_id);
CREATE INDEX IF NOT EXISTS idx_wound_photo_eval_resident ON public.wound_photograph_evaluations(resident_id);
CREATE INDEX IF NOT EXISTS idx_wound_photo_eval_organization ON public.wound_photograph_evaluations(organization_id);
CREATE INDEX IF NOT EXISTS idx_wound_photo_eval_date ON public.wound_photograph_evaluations(photograph_date);

-- Add updated_at trigger
CREATE TRIGGER update_wound_photograph_evaluations_updated_at
  BEFORE UPDATE ON public.wound_photograph_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.wound_photograph_evaluations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users within organization can view wound photograph evaluations"
    ON public.wound_photograph_evaluations FOR SELECT
    USING ( public.can_access_organization(organization_id) );

CREATE POLICY "Nurse/Manager/Owner can insert wound photograph evaluations"
    ON public.wound_photograph_evaluations FOR INSERT
    WITH CHECK (
        public.can_access_organization(organization_id)
        AND (public.get_user_role(auth.uid()) IN ('nurse', 'manager', 'owner', 'saas_admin'))
    );

CREATE POLICY "Nurse/Manager/Owner can update wound photograph evaluations"
    ON public.wound_photograph_evaluations FOR UPDATE
    USING (
        public.can_access_organization(organization_id)
        AND (public.get_user_role(auth.uid()) IN ('nurse', 'manager', 'owner', 'saas_admin'))
    );

CREATE POLICY "Manager/Owner can delete wound photograph evaluations"
    ON public.wound_photograph_evaluations FOR DELETE
    USING (
        public.can_access_organization(organization_id)
        AND (public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin'))
    );
