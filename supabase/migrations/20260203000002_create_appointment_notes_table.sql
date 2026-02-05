-- Create appointment_notes table for storing appointment-related notes
CREATE TABLE IF NOT EXISTS public.appointment_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  
  -- Category
  category TEXT NOT NULL CHECK (category IN ('preparation', 'preferences', 'special_instructions', 'transportation', 'medical_requirements')),
  
  -- Preparation fields
  preparation_time TEXT CHECK (preparation_time IN ('30_minutes', '1_hour', '2_hours')),
  preparation_notes TEXT,
  
  -- Preferences fields
  preferred_time TEXT CHECK (preferred_time IN ('morning', 'afternoon', 'evening')),
  transport_preference TEXT CHECK (transport_preference IN ('wheelchair', 'walking_aid', 'independent', 'stretcher')),
  
  -- Special instructions
  instructions TEXT,
  
  -- Transportation requirements (array)
  transportation_needs TEXT[],
  
  -- Medical requirements (array)
  medical_needs TEXT[],
  
  -- Priority
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Audit fields
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_appointment_notes_resident_id ON public.appointment_notes(resident_id);
CREATE INDEX IF NOT EXISTS idx_appointment_notes_organization_id ON public.appointment_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_appointment_notes_category ON public.appointment_notes(category);
CREATE INDEX IF NOT EXISTS idx_appointment_notes_is_active ON public.appointment_notes(is_active);
CREATE INDEX IF NOT EXISTS idx_appointment_notes_resident_active ON public.appointment_notes(resident_id, is_active);

-- Enable RLS
ALTER TABLE public.appointment_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view appointment notes for residents in their organization
CREATE POLICY "Users can view appointment notes in their organization"
  ON public.appointment_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.active_organization_id = appointment_notes.organization_id
    )
  );

-- Users can create appointment notes for residents in their organization
CREATE POLICY "Users can create appointment notes in their organization"
  ON public.appointment_notes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.active_organization_id = appointment_notes.organization_id
    )
  );

-- Users can update appointment notes in their organization
CREATE POLICY "Users can update appointment notes in their organization"
  ON public.appointment_notes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.active_organization_id = appointment_notes.organization_id
    )
  );

-- Users can delete appointment notes in their organization
CREATE POLICY "Users can delete appointment notes in their organization"
  ON public.appointment_notes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.active_organization_id = appointment_notes.organization_id
    )
  );
