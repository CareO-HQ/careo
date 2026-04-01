-- ============================================
-- WOUNDS MANAGEMENT SYSTEM
-- ============================================
-- Create wounds table for tracking resident wounds
-- Similar structure to incidents for consistency

CREATE TABLE IF NOT EXISTS public.wounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  care_home_id UUID REFERENCES public.care_homes(id) ON DELETE SET NULL,

  -- Wound Details
  wound_name TEXT NOT NULL, -- e.g., "Pressure ulcer - Left heel", "Surgical wound - Abdomen"
  location TEXT NOT NULL, -- Body location: e.g., "Left heel", "Right hip", "Sacrum"
  wound_type TEXT NOT NULL, -- e.g., "Pressure ulcer", "Surgical", "Traumatic", "Diabetic", "Arterial", "Venous"
  stage TEXT, -- For pressure ulcers: "Stage 1", "Stage 2", "Stage 3", "Stage 4", "Unstageable", "Deep Tissue Injury"
  status TEXT NOT NULL DEFAULT 'active', -- "active", "healing", "healed", "deteriorating", "infected"

  -- Assessment Details
  length_cm DECIMAL(10, 2), -- Wound length in cm
  width_cm DECIMAL(10, 2), -- Wound width in cm
  depth_cm DECIMAL(10, 2), -- Wound depth in cm
  wound_bed_description TEXT, -- Description of wound bed (granulation, slough, necrotic, etc.)
  exudate_type TEXT, -- "None", "Serous", "Sanguineous", "Serosanguineous", "Purulent"
  exudate_amount TEXT, -- "None", "Minimal", "Moderate", "Heavy"
  surrounding_skin_condition TEXT, -- Description of peri-wound skin
  odor TEXT, -- "None", "Minimal", "Moderate", "Strong"
  pain_level INTEGER, -- Pain scale 0-10

  -- Wound Care
  treatment_plan TEXT, -- Current treatment approach
  dressing_type TEXT, -- Type of dressing being used
  dressing_frequency TEXT, -- How often dressing is changed
  notes TEXT, -- Additional clinical notes

  -- Tracking
  date_identified DATE NOT NULL, -- When wound was first identified
  last_reviewed_date DATE, -- Last assessment date
  last_reviewed_by TEXT, -- Staff member who last reviewed
  last_reviewed_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  expected_next_review DATE, -- When next review is due

  -- Images/Documentation
  image_urls TEXT[], -- Array of image URLs for wound progression
  wound_folder_id UUID, -- Link to wound folder for documentation

  -- Audit trail
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_wounds_resident_id ON public.wounds(resident_id);
CREATE INDEX IF NOT EXISTS idx_wounds_organization_id ON public.wounds(organization_id);
CREATE INDEX IF NOT EXISTS idx_wounds_status ON public.wounds(status);
CREATE INDEX IF NOT EXISTS idx_wounds_date_identified ON public.wounds(date_identified);
CREATE INDEX IF NOT EXISTS idx_wounds_last_reviewed_date ON public.wounds(last_reviewed_date);
CREATE INDEX IF NOT EXISTS idx_wounds_folder_id ON public.wounds(wound_folder_id);

-- Add updated_at trigger
CREATE TRIGGER update_wounds_updated_at
  BEFORE UPDATE ON public.wounds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.wounds ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wounds
CREATE POLICY "Users within organization can view wounds"
    ON public.wounds FOR SELECT
    USING ( public.can_access_organization(organization_id) );

CREATE POLICY "Nurse/Manager/Owner can insert wounds"
    ON public.wounds FOR INSERT
    WITH CHECK (
        public.can_access_organization(organization_id)
        AND (public.get_user_role(auth.uid()) IN ('nurse', 'manager', 'owner', 'saas_admin'))
    );

CREATE POLICY "Nurse/Manager/Owner can update wounds"
    ON public.wounds FOR UPDATE
    USING (
        public.can_access_organization(organization_id)
        AND (public.get_user_role(auth.uid()) IN ('nurse', 'manager', 'owner', 'saas_admin'))
    );

CREATE POLICY "Manager/Owner can delete wounds"
    ON public.wounds FOR DELETE
    USING (
        public.can_access_organization(organization_id)
        AND (public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin'))
    );

-- Grant permissions
GRANT ALL ON TABLE public.wounds TO anon;
GRANT ALL ON TABLE public.wounds TO authenticated;
GRANT ALL ON TABLE public.wounds TO service_role;

-- Create wound assessment history table for tracking wound progression
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
CREATE TRIGGER update_wound_assessments_updated_at
  BEFORE UPDATE ON public.wound_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for wound assessments
ALTER TABLE public.wound_assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wound assessments
CREATE POLICY "Users within organization can view wound assessments"
    ON public.wound_assessments FOR SELECT
    USING ( public.can_access_organization(organization_id) );

CREATE POLICY "Nurse/Manager/Owner can insert wound assessments"
    ON public.wound_assessments FOR INSERT
    WITH CHECK (
        public.can_access_organization(organization_id)
        AND (public.get_user_role(auth.uid()) IN ('nurse', 'manager', 'owner', 'saas_admin'))
    );

CREATE POLICY "Nurse/Manager/Owner can update wound assessments"
    ON public.wound_assessments FOR UPDATE
    USING (
        public.can_access_organization(organization_id)
        AND (public.get_user_role(auth.uid()) IN ('nurse', 'manager', 'owner', 'saas_admin'))
    );

CREATE POLICY "Manager/Owner can delete wound assessments"
    ON public.wound_assessments FOR DELETE
    USING (
        public.can_access_organization(organization_id)
        AND (public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin'))
    );

-- Grant permissions for wound assessments
GRANT ALL ON TABLE public.wound_assessments TO anon;
GRANT ALL ON TABLE public.wound_assessments TO authenticated;
GRANT ALL ON TABLE public.wound_assessments TO service_role;
