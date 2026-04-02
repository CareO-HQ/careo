-- ============================================
-- CREATE INITIAL WOUND ASSESSMENTS TABLE
-- Migration: 20260402000000
-- Purpose: Initial wound assessment tracking (matches paper form format)
-- ============================================

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.initial_wound_assessments CASCADE;

-- Create the initial_wound_assessments table
CREATE TABLE public.initial_wound_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wound_folder_id UUID NOT NULL REFERENCES public.wound_folders(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  care_home_id UUID REFERENCES public.care_homes(id) ON DELETE CASCADE,

  -- Header information
  assessment_date DATE NOT NULL,
  assessment_completed_by TEXT NOT NULL,

  -- WOUND Section
  date_wound_occurred DATE,
  wound_location TEXT,
  type_of_wound TEXT,

  -- WOUND SIZE (CM)
  maximum_length DECIMAL(10, 2),
  maximum_width DECIMAL(10, 2),
  maximum_depth DECIMAL(10, 2),

  -- WOUND BED (%)
  necrotic_percentage INTEGER DEFAULT 0 CHECK (necrotic_percentage >= 0 AND necrotic_percentage <= 100),
  sloughy_percentage INTEGER DEFAULT 0 CHECK (sloughy_percentage >= 0 AND sloughy_percentage <= 100),
  granulation_percentage INTEGER DEFAULT 0 CHECK (granulation_percentage >= 0 AND granulation_percentage <= 100),
  epithelialisation_percentage INTEGER DEFAULT 0 CHECK (epithelialisation_percentage >= 0 AND epithelialisation_percentage <= 100),
  evidence_of_infection BOOLEAN DEFAULT false,

  -- EXUDATE Section
  exudate_type TEXT,
  exudate_colour TEXT,
  exudate_volume TEXT CHECK (exudate_volume IN ('high', 'moderate', 'low')),
  any_malodour_noted BOOLEAN DEFAULT false,

  -- WOUND MARGIN Section
  wound_margin_colour TEXT,
  any_oedema BOOLEAN DEFAULT false,
  any_heat BOOLEAN DEFAULT false,
  surrounding_erythema BOOLEAN DEFAULT false,
  max_distance_from_margin DECIMAL(10, 2),
  condition_of_surrounding_skin TEXT,

  -- PAIN Section
  any_pain_from_wound BOOLEAN DEFAULT false,
  pain_severity INTEGER CHECK (pain_severity >= 1 AND pain_severity <= 10),
  pain_frequency TEXT,

  -- Documentation Checklist
  wound_photographed BOOLEAN DEFAULT false,
  body_map_completed BOOLEAN DEFAULT false,
  wound_swab_sent BOOLEAN DEFAULT false,
  braden_reevaluated BOOLEAN DEFAULT false,
  braden_score INTEGER,
  must_score INTEGER,

  -- Audit fields
  recorded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_initial_wound_assessments_wound_folder_id ON public.initial_wound_assessments(wound_folder_id);
CREATE INDEX idx_initial_wound_assessments_resident_id ON public.initial_wound_assessments(resident_id);
CREATE INDEX idx_initial_wound_assessments_organization_id ON public.initial_wound_assessments(organization_id);
CREATE INDEX idx_initial_wound_assessments_care_home_id ON public.initial_wound_assessments(care_home_id);
CREATE INDEX idx_initial_wound_assessments_assessment_date ON public.initial_wound_assessments(assessment_date DESC);
CREATE INDEX idx_initial_wound_assessments_created_at ON public.initial_wound_assessments(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_initial_wound_assessments_updated_at
  BEFORE UPDATE ON public.initial_wound_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.initial_wound_assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for initial_wound_assessments

-- View policy: Users within organization can view assessments
CREATE POLICY "Users within organization can view initial wound assessments"
  ON public.initial_wound_assessments
  FOR SELECT
  USING (public.can_access_organization(organization_id));

-- Insert policy: Care staff can create assessments
CREATE POLICY "Care staff can insert initial wound assessments"
  ON public.initial_wound_assessments
  FOR INSERT
  WITH CHECK (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('nurse', 'manager', 'owner', 'care_assistant', 'saas_admin')
  );

-- Update policy: Assessor or managers can update
CREATE POLICY "Staff can update initial wound assessments"
  ON public.initial_wound_assessments
  FOR UPDATE
  USING (
    public.can_access_organization(organization_id)
    AND (
      recorded_by = auth.uid()
      OR public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin')
    )
  );

-- Delete policy: Managers only
CREATE POLICY "Managers can delete initial wound assessments"
  ON public.initial_wound_assessments
  FOR DELETE
  USING (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin')
  );

-- Add comments for documentation
COMMENT ON TABLE public.initial_wound_assessments IS 'Initial wound assessment tracking (matches paper form format)';
COMMENT ON COLUMN public.initial_wound_assessments.date_wound_occurred IS 'Date the wound was first noted or occurred';
COMMENT ON COLUMN public.initial_wound_assessments.wound_location IS 'Anatomical location of the wound';
COMMENT ON COLUMN public.initial_wound_assessments.type_of_wound IS 'Classification/type of wound';
COMMENT ON COLUMN public.initial_wound_assessments.evidence_of_infection IS 'Whether there is evidence of infection (Y/N)';
COMMENT ON COLUMN public.initial_wound_assessments.pain_severity IS 'Pain severity on scale of 1-10';

-- Verify the table was created successfully
SELECT
  'SUCCESS! Initial wound assessments table created' as status,
  COUNT(*) as row_count
FROM public.initial_wound_assessments;

-- Show table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'initial_wound_assessments'
ORDER BY ordinal_position;
