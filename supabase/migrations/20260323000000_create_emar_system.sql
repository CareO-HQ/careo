-- ============================================
-- eMAR (Electronic Medication Administration Record) System
-- Migration: 20260323000000_create_emar_system.sql
-- Description: Creates tables for monthly MAR sheets, administration records, and digital signatures
-- ============================================

-- ============================================
-- 1. ENUMS
-- ============================================

-- MAR sheet types
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'emar_sheet_type') THEN
    CREATE TYPE emar_sheet_type AS ENUM ('medication', 'prn');
  END IF;
END $$;

-- MAR sheet status
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'emar_sheet_status') THEN
    CREATE TYPE emar_sheet_status AS ENUM ('active', 'archived');
  END IF;
END $$;

-- Administration status for scheduled medications
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'emar_admin_status') THEN
    CREATE TYPE emar_admin_status AS ENUM ('scheduled', 'given', 'refused', 'omitted', 'not_required');
  END IF;
END $$;

-- ============================================
-- 2. TABLES
-- ============================================

-- eMAR Sheets (Monthly MAR containers)
CREATE TABLE IF NOT EXISTS public.emar_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  type emar_sheet_type NOT NULL,
  status emar_sheet_status DEFAULT 'active',

  -- Metadata
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  care_home_id UUID NOT NULL REFERENCES public.care_homes(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES auth.users(id),

  -- Unique constraint: one active sheet per resident per month per type
  UNIQUE(resident_id, month, year, type, status)
);

-- eMAR Administration Records (Daily medication administration entries)
CREATE TABLE IF NOT EXISTS public.emar_administrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emar_sheet_id UUID NOT NULL REFERENCES public.emar_sheets(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,

  -- Date and time information
  administration_date DATE NOT NULL,
  scheduled_time TIME,  -- NULL for PRN medications

  -- Administration details for scheduled medications
  status emar_admin_status DEFAULT 'scheduled',
  administered_at TIMESTAMPTZ,
  administered_by UUID REFERENCES auth.users(id),

  -- PRN-specific fields
  prn_reason TEXT,          -- Reason for PRN administration
  prn_outcome TEXT,         -- Outcome after PRN administration
  prn_dose_administered TEXT, -- Dose given for PRN

  -- Signatures and witnesses
  administered_signature TEXT,  -- Digital signature
  witness_id UUID REFERENCES auth.users(id),
  witness_signature TEXT,
  witness_at TIMESTAMPTZ,

  -- Additional notes
  notes TEXT,

  -- Quantity administered
  quantity INTEGER DEFAULT 1,

  -- Metadata
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  care_home_id UUID NOT NULL REFERENCES public.care_homes(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Digital Signatures (Reusable staff signatures)
CREATE TABLE IF NOT EXISTS public.emar_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signature_data TEXT NOT NULL,  -- Base64 encoded signature image or signature text
  signature_type TEXT DEFAULT 'text', -- 'text' or 'image'

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One active signature per user
  UNIQUE(user_id, is_active)
);

-- ============================================
-- 3. INDEXES
-- ============================================

-- eMAR Sheets indexes
CREATE INDEX IF NOT EXISTS idx_emar_sheets_resident ON public.emar_sheets(resident_id);
CREATE INDEX IF NOT EXISTS idx_emar_sheets_month_year ON public.emar_sheets(month, year);
CREATE INDEX IF NOT EXISTS idx_emar_sheets_status ON public.emar_sheets(status);
CREATE INDEX IF NOT EXISTS idx_emar_sheets_org ON public.emar_sheets(organization_id);
CREATE INDEX IF NOT EXISTS idx_emar_sheets_care_home ON public.emar_sheets(care_home_id);

-- eMAR Administrations indexes
CREATE INDEX IF NOT EXISTS idx_emar_admin_sheet ON public.emar_administrations(emar_sheet_id);
CREATE INDEX IF NOT EXISTS idx_emar_admin_medication ON public.emar_administrations(medication_id);
CREATE INDEX IF NOT EXISTS idx_emar_admin_date ON public.emar_administrations(administration_date);
CREATE INDEX IF NOT EXISTS idx_emar_admin_status ON public.emar_administrations(status);
CREATE INDEX IF NOT EXISTS idx_emar_admin_org ON public.emar_administrations(organization_id);

-- eMAR Signatures indexes
CREATE INDEX IF NOT EXISTS idx_emar_signatures_user ON public.emar_signatures(user_id);

-- ============================================
-- 4. TRIGGERS
-- ============================================

-- Update updated_at timestamp for emar_administrations
CREATE TRIGGER tr_emar_admin_updated_at
  BEFORE UPDATE ON public.emar_administrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp for emar_signatures
CREATE TRIGGER tr_emar_signatures_updated_at
  BEFORE UPDATE ON public.emar_signatures
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. FUNCTIONS
-- ============================================

-- Function to automatically archive MAR sheets at month end
CREATE OR REPLACE FUNCTION public.archive_previous_month_emar_sheets()
RETURNS void AS $$
DECLARE
  current_month INTEGER;
  current_year INTEGER;
BEGIN
  current_month := EXTRACT(MONTH FROM CURRENT_DATE);
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);

  -- Archive all active sheets from previous months
  UPDATE public.emar_sheets
  SET
    status = 'archived',
    archived_at = NOW()
  WHERE
    status = 'active'
    AND (year < current_year OR (year = current_year AND month < current_month));

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create or get current month's MAR sheet for a resident
CREATE OR REPLACE FUNCTION public.get_or_create_emar_sheet(
  p_resident_id UUID,
  p_type emar_sheet_type,
  p_organization_id UUID,
  p_care_home_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_sheet_id UUID;
  v_current_month INTEGER;
  v_current_year INTEGER;
BEGIN
  v_current_month := EXTRACT(MONTH FROM CURRENT_DATE);
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);

  -- Try to find existing active sheet
  SELECT id INTO v_sheet_id
  FROM public.emar_sheets
  WHERE
    resident_id = p_resident_id
    AND type = p_type
    AND month = v_current_month
    AND year = v_current_year
    AND status = 'active';

  -- Create if doesn't exist
  IF v_sheet_id IS NULL THEN
    INSERT INTO public.emar_sheets (
      resident_id,
      month,
      year,
      type,
      organization_id,
      care_home_id
    ) VALUES (
      p_resident_id,
      v_current_month,
      v_current_year,
      p_type,
      p_organization_id,
      p_care_home_id
    )
    RETURNING id INTO v_sheet_id;
  END IF;

  RETURN v_sheet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE public.emar_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emar_administrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emar_signatures ENABLE ROW LEVEL SECURITY;

-- eMAR Sheets policies
CREATE POLICY "Users can view eMAR sheets in their organization"
  ON public.emar_sheets FOR SELECT
  USING (public.can_access_organization(organization_id));

CREATE POLICY "Users can create eMAR sheets in their organization"
  ON public.emar_sheets FOR INSERT
  WITH CHECK (public.can_access_organization(organization_id));

CREATE POLICY "Users can update eMAR sheets in their organization"
  ON public.emar_sheets FOR UPDATE
  USING (public.can_access_organization(organization_id));

-- eMAR Administrations policies
CREATE POLICY "Users can view eMAR administrations in their organization"
  ON public.emar_administrations FOR SELECT
  USING (public.can_access_organization(organization_id));

CREATE POLICY "Users can create eMAR administrations in their organization"
  ON public.emar_administrations FOR INSERT
  WITH CHECK (public.can_access_organization(organization_id));

CREATE POLICY "Users can update eMAR administrations in their organization"
  ON public.emar_administrations FOR UPDATE
  USING (public.can_access_organization(organization_id));

-- eMAR Signatures policies
CREATE POLICY "Users can view their own signatures"
  ON public.emar_signatures FOR SELECT
  USING (user_id = auth.uid() OR public.is_saas_admin());

CREATE POLICY "Users can create their own signatures"
  ON public.emar_signatures FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own signatures"
  ON public.emar_signatures FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================
-- 7. COMMENTS
-- ============================================

COMMENT ON TABLE public.emar_sheets IS 'Monthly electronic MAR sheets for residents';
COMMENT ON TABLE public.emar_administrations IS 'Individual medication administration records within MAR sheets';
COMMENT ON TABLE public.emar_signatures IS 'Digital signatures for staff members';

COMMENT ON COLUMN public.emar_sheets.type IS 'Type of MAR sheet: medication (scheduled) or prn (as-required)';
COMMENT ON COLUMN public.emar_sheets.status IS 'Sheet status: active (current month) or archived (previous months)';
COMMENT ON COLUMN public.emar_administrations.prn_reason IS 'Reason for administering PRN medication';
COMMENT ON COLUMN public.emar_administrations.prn_outcome IS 'Outcome/effectiveness after PRN administration';
COMMENT ON COLUMN public.emar_administrations.prn_dose_administered IS 'Specific dose administered for PRN medication';
