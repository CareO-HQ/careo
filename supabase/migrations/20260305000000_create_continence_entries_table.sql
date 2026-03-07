-- ============================================
-- CONTINENCE TRACKING SYSTEM
-- ============================================
-- Create continence_entries table for tracking bowel and urine entries
-- RESET: Drop table if exists to start fresh
DROP TABLE IF EXISTS public.continence_entries CASCADE;

CREATE TABLE public.continence_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  care_home_id UUID REFERENCES public.care_homes(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,

  -- Entry Details
  entry_type TEXT NOT NULL CHECK (entry_type IN ('bowel', 'urine')),
  date DATE NOT NULL,
  time TIME NOT NULL,

  -- Bowel-specific fields (Bristol Stool Chart)
  stool_type TEXT CHECK (
    stool_type IS NULL OR
    stool_type IN ('type_1', 'type_2', 'type_3', 'type_4', 'type_5', 'type_6', 'type_7')
  ),
  bowel_size TEXT CHECK (bowel_size IS NULL OR bowel_size IN ('s', 'm', 'l', 'xl')),

  -- Urine-specific fields
  urine_color TEXT,
  urine_amount TEXT,
  urine_odor TEXT,

  -- Common fields
  notes TEXT,
  continence_aid TEXT, -- e.g., "Pad", "Commode", "Toilet"
  assistance_required BOOLEAN DEFAULT false,

  -- Audit trail
  recorded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_continence_entries_resident_id ON public.continence_entries(resident_id);
CREATE INDEX idx_continence_entries_organization_id ON public.continence_entries(organization_id);
CREATE INDEX idx_continence_entries_care_home_id ON public.continence_entries(care_home_id);
CREATE INDEX idx_continence_entries_team_id ON public.continence_entries(team_id);
CREATE INDEX idx_continence_entries_date ON public.continence_entries(date);
CREATE INDEX idx_continence_entries_entry_type ON public.continence_entries(entry_type);
CREATE INDEX idx_continence_entries_created_at ON public.continence_entries(created_at DESC);
CREATE INDEX idx_continence_entries_recorded_by ON public.continence_entries(recorded_by);

-- Add updated_at trigger
CREATE TRIGGER update_continence_entries_updated_at
  BEFORE UPDATE ON public.continence_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.continence_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for continence_entries
CREATE POLICY "Users within organization can view continence entries"
    ON public.continence_entries FOR SELECT
    USING ( public.can_access_organization(organization_id) );

CREATE POLICY "All staff can insert continence entries"
    ON public.continence_entries FOR INSERT
    WITH CHECK (
        public.can_access_organization(organization_id)
        AND (public.get_user_role(auth.uid()) IN ('nurse', 'manager', 'owner', 'care_assistant', 'saas_admin'))
    );

CREATE POLICY "All staff can update their own continence entries"
    ON public.continence_entries FOR UPDATE
    USING (
        public.can_access_organization(organization_id)
        AND (
            recorded_by = auth.uid()
            OR public.get_user_role(auth.uid()) IN ('nurse', 'manager', 'owner', 'saas_admin')
        )
    );

CREATE POLICY "Manager/Owner can delete continence entries"
    ON public.continence_entries FOR DELETE
    USING (
        public.can_access_organization(organization_id)
        AND (public.get_user_role(auth.uid()) IN ('manager', 'owner', 'saas_admin'))
    );
