-- ============================================
-- CREATE WOUND ASSESSMENTS TABLE
-- Migration: 20260307000000
-- Purpose: Clinical wound assessment tracking (Appendix H - RQIA Compliant)
-- ============================================

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.wound_assessments CASCADE;

-- Create storage bucket for wound photos (if doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('wound-photos', 'wound-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Create the wound_assessments table
CREATE TABLE public.wound_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wound_folder_id UUID NOT NULL REFERENCES public.wound_folders(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  care_home_id UUID REFERENCES public.care_homes(id) ON DELETE CASCADE,

  -- Section 1: Resident Information
  assessment_date DATE NOT NULL,
  wound_number TEXT NOT NULL,

  -- Section 2: Pain / Analgesia
  analgesia_required BOOLEAN DEFAULT false,
  regular_ongoing_analgesia BOOLEAN DEFAULT false,
  pre_dressing_only BOOLEAN DEFAULT false,

  -- Section 3: Wound Dimensions
  length_cm DECIMAL(10, 2),
  width_cm DECIMAL(10, 2),
  depth_cm DECIMAL(10, 2),
  tracking_undermining BOOLEAN DEFAULT false,
  photograph_taken_date DATE,
  photograph_storage_path TEXT,

  -- Section 4: Tissue Type on Wound Bed (percentages)
  necrotic_percentage INTEGER DEFAULT 0 CHECK (necrotic_percentage >= 0 AND necrotic_percentage <= 100),
  sloughy_percentage INTEGER DEFAULT 0 CHECK (sloughy_percentage >= 0 AND sloughy_percentage <= 100),
  granulating_percentage INTEGER DEFAULT 0 CHECK (granulating_percentage >= 0 AND granulating_percentage <= 100),
  epithelialising_percentage INTEGER DEFAULT 0 CHECK (epithelialising_percentage >= 0 AND epithelialising_percentage <= 100),
  hypergranulating_percentage INTEGER DEFAULT 0 CHECK (hypergranulating_percentage >= 0 AND hypergranulating_percentage <= 100),
  haematoma_percentage INTEGER DEFAULT 0 CHECK (haematoma_percentage >= 0 AND haematoma_percentage <= 100),
  bone_tendon_percentage INTEGER DEFAULT 0 CHECK (bone_tendon_percentage >= 0 AND bone_tendon_percentage <= 100),

  -- Section 5: Wound Exudate
  exudate_level TEXT CHECK (exudate_level IN ('low', 'moderate', 'high')),
  exudate_type TEXT CHECK (exudate_type IN ('serous', 'haemoserous', 'purulent')),

  -- Section 6: Peri-wound Skin (array of conditions)
  periwound_skin TEXT[] DEFAULT '{}',

  -- Section 7: Signs of Infection (array of signs)
  signs_of_infection TEXT[] DEFAULT '{}',

  -- Section 8: Treatment Objectives (array of objectives)
  treatment_objectives TEXT[] NOT NULL DEFAULT '{}',

  -- Section 9: Clinical Record
  assessor_initials TEXT NOT NULL,
  dressing_renewed BOOLEAN DEFAULT true,
  reassessment_date DATE NOT NULL,
  clinical_notes TEXT,

  -- Audit fields
  recorded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_wound_assessments_wound_folder_id ON public.wound_assessments(wound_folder_id);
CREATE INDEX idx_wound_assessments_resident_id ON public.wound_assessments(resident_id);
CREATE INDEX idx_wound_assessments_organization_id ON public.wound_assessments(organization_id);
CREATE INDEX idx_wound_assessments_care_home_id ON public.wound_assessments(care_home_id);
CREATE INDEX idx_wound_assessments_wound_number ON public.wound_assessments(wound_number);
CREATE INDEX idx_wound_assessments_assessment_date ON public.wound_assessments(assessment_date DESC);
CREATE INDEX idx_wound_assessments_reassessment_date ON public.wound_assessments(reassessment_date);
CREATE INDEX idx_wound_assessments_created_at ON public.wound_assessments(created_at DESC);

-- Create GIN index for array searches
CREATE INDEX idx_wound_assessments_signs_of_infection ON public.wound_assessments USING GIN (signs_of_infection);
CREATE INDEX idx_wound_assessments_periwound_skin ON public.wound_assessments USING GIN (periwound_skin);
CREATE INDEX idx_wound_assessments_treatment_objectives ON public.wound_assessments USING GIN (treatment_objectives);

-- Create trigger for updated_at
CREATE TRIGGER update_wound_assessments_updated_at
  BEFORE UPDATE ON public.wound_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.wound_assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wound_assessments

-- View policy: Users within organization can view assessments
CREATE POLICY "Users within organization can view wound assessments"
  ON public.wound_assessments
  FOR SELECT
  USING (public.can_access_organization(organization_id));

-- Insert policy: Care staff can create assessments
CREATE POLICY "Care staff can insert wound assessments"
  ON public.wound_assessments
  FOR INSERT
  WITH CHECK (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('nurse', 'manager', 'owner', 'care_assistant', 'saas_admin')
  );

-- Update policy: Assessor or managers can update
CREATE POLICY "Staff can update wound assessments"
  ON public.wound_assessments
  FOR UPDATE
  USING (
    public.can_access_organization(organization_id)
    AND (
      recorded_by = auth.uid()
      OR public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin')
    )
  );

-- Delete policy: Managers only
CREATE POLICY "Managers can delete wound assessments"
  ON public.wound_assessments
  FOR DELETE
  USING (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin')
  );

-- Storage policies for wound photos
CREATE POLICY "Users can upload wound photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'wound-photos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can view wound photos in their organization"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'wound-photos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their wound photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'wound-photos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Managers can delete wound photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'wound-photos'
    AND auth.role() = 'authenticated'
  );

-- Add comments for documentation
COMMENT ON TABLE public.wound_assessments IS 'Clinical wound assessment tracking (Appendix H - RQIA compliant)';
COMMENT ON COLUMN public.wound_assessments.wound_number IS 'Unique identifier for wound tracking';
COMMENT ON COLUMN public.wound_assessments.analgesia_required IS 'Whether pain relief is needed';
COMMENT ON COLUMN public.wound_assessments.periwound_skin IS 'Array of peri-wound skin conditions';
COMMENT ON COLUMN public.wound_assessments.signs_of_infection IS 'Array of infection indicators';
COMMENT ON COLUMN public.wound_assessments.treatment_objectives IS 'Array of treatment goals';

-- Create a view for wound healing progress tracking
CREATE OR REPLACE VIEW public.wound_healing_progress AS
SELECT
  wa.resident_id,
  wa.wound_number,
  wa.assessment_date,
  wa.length_cm,
  wa.width_cm,
  wa.depth_cm,
  (wa.length_cm * wa.width_cm) AS wound_area_cm2,
  wa.granulating_percentage,
  wa.epithelialising_percentage,
  wa.exudate_level,
  COALESCE(array_length(wa.signs_of_infection, 1), 0) AS infection_sign_count,
  CASE
    WHEN COALESCE(array_length(wa.signs_of_infection, 1), 0) > 0 THEN 'infection_suspected'
    WHEN wa.granulating_percentage + wa.epithelialising_percentage >= 80 THEN 'healing_well'
    WHEN wa.necrotic_percentage + wa.sloughy_percentage >= 50 THEN 'deteriorating'
    ELSE 'stable'
  END AS healing_status,
  wa.reassessment_date,
  r.first_name || ' ' || r.last_name AS resident_name,
  u.name AS assessor_name,
  wa.created_at
FROM public.wound_assessments wa
LEFT JOIN public.residents r ON wa.resident_id = r.id
LEFT JOIN public.users u ON wa.recorded_by = u.id
ORDER BY wa.resident_id, wa.wound_number, wa.assessment_date DESC;

-- Grant access to the view
GRANT SELECT ON public.wound_healing_progress TO authenticated;

-- Add RLS to the view (inherits from base table policies)
ALTER VIEW public.wound_healing_progress SET (security_invoker = true);

-- Verify the table was created successfully
SELECT
  'SUCCESS! Wound assessments table created' as status,
  COUNT(*) as row_count
FROM public.wound_assessments;

-- Show table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'wound_assessments'
ORDER BY ordinal_position;
