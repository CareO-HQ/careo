-- ========================================
-- WOUND ASSESSMENT TABLE SETUP
-- COPY THIS ENTIRE FILE AND RUN IN SUPABASE SQL EDITOR
-- ========================================

-- Create storage bucket for wound photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('wound-photos', 'wound-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Drop table if exists
DROP TABLE IF EXISTS public.wound_assessments CASCADE;

-- Create wound_assessments table
CREATE TABLE public.wound_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wound_folder_id UUID NOT NULL REFERENCES public.wound_folders(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  care_home_id UUID REFERENCES public.care_homes(id) ON DELETE CASCADE,
  assessment_date DATE NOT NULL,
  wound_number TEXT NOT NULL,
  analgesia_required BOOLEAN DEFAULT false,
  regular_ongoing_analgesia BOOLEAN DEFAULT false,
  pre_dressing_only BOOLEAN DEFAULT false,
  length_cm DECIMAL(10, 2),
  width_cm DECIMAL(10, 2),
  depth_cm DECIMAL(10, 2),
  tracking_undermining BOOLEAN DEFAULT false,
  photograph_taken_date DATE,
  photograph_storage_path TEXT,
  necrotic_percentage INTEGER DEFAULT 0 CHECK (necrotic_percentage >= 0 AND necrotic_percentage <= 100),
  sloughy_percentage INTEGER DEFAULT 0 CHECK (sloughy_percentage >= 0 AND sloughy_percentage <= 100),
  granulating_percentage INTEGER DEFAULT 0 CHECK (granulating_percentage >= 0 AND granulating_percentage <= 100),
  epithelialising_percentage INTEGER DEFAULT 0 CHECK (epithelialising_percentage >= 0 AND epithelialising_percentage <= 100),
  hypergranulating_percentage INTEGER DEFAULT 0 CHECK (hypergranulating_percentage >= 0 AND hypergranulating_percentage <= 100),
  haematoma_percentage INTEGER DEFAULT 0 CHECK (haematoma_percentage >= 0 AND haematoma_percentage <= 100),
  bone_tendon_percentage INTEGER DEFAULT 0 CHECK (bone_tendon_percentage >= 0 AND bone_tendon_percentage <= 100),
  exudate_level TEXT CHECK (exudate_level IN ('low', 'moderate', 'high')),
  exudate_type TEXT CHECK (exudate_type IN ('serous', 'haemoserous', 'purulent')),
  periwound_skin TEXT[] DEFAULT '{}',
  signs_of_infection TEXT[] DEFAULT '{}',
  treatment_objectives TEXT[] NOT NULL DEFAULT '{}',
  assessor_initials TEXT NOT NULL,
  dressing_renewed BOOLEAN DEFAULT true,
  reassessment_date DATE NOT NULL,
  clinical_notes TEXT,
  recorded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_wound_assessments_wound_folder_id ON public.wound_assessments(wound_folder_id);
CREATE INDEX idx_wound_assessments_resident_id ON public.wound_assessments(resident_id);
CREATE INDEX idx_wound_assessments_organization_id ON public.wound_assessments(organization_id);
CREATE INDEX idx_wound_assessments_care_home_id ON public.wound_assessments(care_home_id);
CREATE INDEX idx_wound_assessments_wound_number ON public.wound_assessments(wound_number);
CREATE INDEX idx_wound_assessments_assessment_date ON public.wound_assessments(assessment_date DESC);
CREATE INDEX idx_wound_assessments_signs_of_infection ON public.wound_assessments USING GIN (signs_of_infection);

-- Create trigger
CREATE TRIGGER update_wound_assessments_updated_at
  BEFORE UPDATE ON public.wound_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.wound_assessments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users within organization can view wound assessments"
  ON public.wound_assessments FOR SELECT
  USING (public.can_access_organization(organization_id));

CREATE POLICY "Care staff can insert wound assessments"
  ON public.wound_assessments FOR INSERT
  WITH CHECK (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('nurse', 'manager', 'owner', 'care_assistant', 'saas_admin')
  );

CREATE POLICY "Staff can update wound assessments"
  ON public.wound_assessments FOR UPDATE
  USING (
    public.can_access_organization(organization_id)
    AND (
      recorded_by = auth.uid()
      OR public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin')
    )
  );

CREATE POLICY "Managers can delete wound assessments"
  ON public.wound_assessments FOR DELETE
  USING (
    public.can_access_organization(organization_id)
    AND public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin')
  );

-- Storage policies for wound photos
CREATE POLICY "Users can upload wound photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'wound-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view wound photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wound-photos' AND auth.role() = 'authenticated');

-- Success message
SELECT 'SUCCESS! Wound assessment table created' as message;
