-- ============================================
-- WOUNDS MANAGEMENT SYSTEM
-- ============================================
-- Create wounds table for tracking resident wounds

CREATE TABLE IF NOT EXISTS public.wounds (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
    care_home_id uuid REFERENCES public.care_homes(id) ON DELETE SET NULL,
    wound_name text NOT NULL,
    location text NOT NULL,
    wound_type text NOT NULL,
    stage text,
    status text DEFAULT 'active'::text NOT NULL,
    length_cm numeric(10,2),
    width_cm numeric(10,2),
    depth_cm numeric(10,2),
    wound_bed_description text,
    exudate_type text,
    exudate_amount text,
    surrounding_skin_condition text,
    odor text,
    pain_level integer,
    treatment_plan text,
    dressing_type text,
    dressing_frequency text,
    notes text,
    date_identified date NOT NULL,
    last_reviewed_date date,
    last_reviewed_by text,
    last_reviewed_by_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    expected_next_review date,
    image_urls text[],
    created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    wound_folder_id uuid
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wounds_date_identified ON public.wounds USING btree (date_identified);
CREATE INDEX IF NOT EXISTS idx_wounds_folder_id ON public.wounds USING btree (wound_folder_id);
CREATE INDEX IF NOT EXISTS idx_wounds_last_reviewed_date ON public.wounds USING btree (last_reviewed_date);
CREATE INDEX IF NOT EXISTS idx_wounds_organization_id ON public.wounds USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_wounds_resident_id ON public.wounds USING btree (resident_id);
CREATE INDEX IF NOT EXISTS idx_wounds_status ON public.wounds USING btree (status);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_wounds_updated_at ON public.wounds;
CREATE TRIGGER update_wounds_updated_at
    BEFORE UPDATE ON public.wounds
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.wounds ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users within organization can view wounds" ON public.wounds;
CREATE POLICY "Users within organization can view wounds"
    ON public.wounds FOR SELECT
    USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Nurse/Manager/Owner can insert wounds" ON public.wounds;
CREATE POLICY "Nurse/Manager/Owner can insert wounds"
    ON public.wounds FOR INSERT
    WITH CHECK (
        public.can_access_organization(organization_id) AND
        public.get_user_role(auth.uid()) IN ('nurse', 'manager', 'owner', 'saas_admin')
    );

DROP POLICY IF EXISTS "Nurse/Manager/Owner can update wounds" ON public.wounds;
CREATE POLICY "Nurse/Manager/Owner can update wounds"
    ON public.wounds FOR UPDATE
    USING (
        public.can_access_organization(organization_id) AND
        public.get_user_role(auth.uid()) IN ('nurse', 'manager', 'owner', 'saas_admin')
    );

DROP POLICY IF EXISTS "Manager/Owner can delete wounds" ON public.wounds;
CREATE POLICY "Manager/Owner can delete wounds"
    ON public.wounds FOR DELETE
    USING (
        public.can_access_organization(organization_id) AND
        public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin')
    );

-- Wound Assessment History
CREATE TABLE IF NOT EXISTS public.wound_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wound_id UUID NOT NULL REFERENCES public.wounds(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Assessment details
  assessment_date DATE NOT NULL,
  assessment_time TIME DEFAULT NOW()::TIME,
  assessed_by TEXT NOT NULL,
  assessed_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,

  -- Measurements
  length_cm DECIMAL(10, 2),
  width_cm DECIMAL(10, 2),
  depth_cm DECIMAL(10, 2),

  -- Wound condition
  wound_bed_description TEXT,
  exudate_type TEXT,
  exudate_amount TEXT,
  surrounding_skin_condition TEXT,
  odor TEXT,
  pain_level INTEGER,
  signs_of_infection BOOLEAN DEFAULT false,
  infection_notes TEXT,

  -- Treatment
  treatment_applied TEXT,
  dressing_type TEXT,

  -- Progress notes
  progress_notes TEXT,
  status TEXT, -- Current status at time of assessment

  -- Images
  image_urls TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for wound assessments
CREATE INDEX IF NOT EXISTS idx_wound_assessments_wound_id ON public.wound_assessments(wound_id);
CREATE INDEX IF NOT EXISTS idx_wound_assessments_organization_id ON public.wound_assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_wound_assessments_date ON public.wound_assessments(assessment_date);

-- Add updated_at trigger for wound assessments
DROP TRIGGER IF EXISTS update_wound_assessments_updated_at ON public.wound_assessments;
CREATE TRIGGER update_wound_assessments_updated_at
  BEFORE UPDATE ON public.wound_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS for wound assessments
ALTER TABLE public.wound_assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wound assessments
DROP POLICY IF EXISTS "Users within organization can view wound assessments" ON public.wound_assessments;
CREATE POLICY "Users within organization can view wound assessments"
    ON public.wound_assessments FOR SELECT
    USING ( public.can_access_organization(organization_id) );

DROP POLICY IF EXISTS "Nurse/Manager/Owner can insert wound assessments" ON public.wound_assessments;
CREATE POLICY "Nurse/Manager/Owner can insert wound assessments"
    ON public.wound_assessments FOR INSERT
    WITH CHECK (
        public.can_access_organization(organization_id)
        AND public.get_user_role(auth.uid()) IN ('nurse', 'manager', 'owner', 'saas_admin')
    );

DROP POLICY IF EXISTS "Nurse/Manager/Owner can update wound assessments" ON public.wound_assessments;
CREATE POLICY "Nurse/Manager/Owner can update wound assessments"
    ON public.wound_assessments FOR UPDATE
    USING (
        public.can_access_organization(organization_id)
        AND public.get_user_role(auth.uid()) IN ('nurse', 'manager', 'owner', 'saas_admin')
    );

DROP POLICY IF EXISTS "Manager/Owner can delete wound assessments" ON public.wound_assessments;
CREATE POLICY "Manager/Owner can delete wound assessments"
    ON public.wound_assessments FOR DELETE
    USING (
        public.can_access_organization(organization_id)
        AND public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin')
    );

-- Grant permissions
GRANT ALL ON TABLE public.wounds TO authenticated, service_role;
GRANT ALL ON TABLE public.wound_assessments TO authenticated, service_role;
