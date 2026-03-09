-- Create wound_treatment_evaluations table
CREATE TABLE IF NOT EXISTS public.wound_treatment_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wound_folder_id UUID NOT NULL REFERENCES public.wound_folders(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Form fields
  evaluation_date DATE NOT NULL,
  wound_number TEXT NOT NULL,
  cleansing_method TEXT,
  dressing_choice TEXT,
  frequency TEXT,
  rationale_for_change TEXT,
  wound_evaluation TEXT,
  signature TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wound_treatment_evaluations_wound_folder
  ON public.wound_treatment_evaluations(wound_folder_id);
CREATE INDEX IF NOT EXISTS idx_wound_treatment_evaluations_resident
  ON public.wound_treatment_evaluations(resident_id);
CREATE INDEX IF NOT EXISTS idx_wound_treatment_evaluations_organization
  ON public.wound_treatment_evaluations(organization_id);
CREATE INDEX IF NOT EXISTS idx_wound_treatment_evaluations_date
  ON public.wound_treatment_evaluations(evaluation_date DESC);

-- Enable RLS
ALTER TABLE public.wound_treatment_evaluations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view wound treatment evaluations in their organization"
  ON public.wound_treatment_evaluations
  FOR SELECT
  USING ( public.can_access_organization(organization_id) );

CREATE POLICY "Users can insert wound treatment evaluations in their organization"
  ON public.wound_treatment_evaluations
  FOR INSERT
  WITH CHECK ( public.can_access_organization(organization_id) );

CREATE POLICY "Users can update wound treatment evaluations in their organization"
  ON public.wound_treatment_evaluations
  FOR UPDATE
  USING ( public.can_access_organization(organization_id) );

CREATE POLICY "Users can delete wound treatment evaluations in their organization"
  ON public.wound_treatment_evaluations
  FOR DELETE
  USING ( public.can_access_organization(organization_id) );

-- Create updated_at trigger
CREATE TRIGGER set_wound_treatment_evaluations_updated_at
  BEFORE UPDATE ON public.wound_treatment_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
