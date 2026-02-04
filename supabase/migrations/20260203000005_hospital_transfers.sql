-- ============================================
-- HOSPITAL TRANSFERS MIGRATION
-- ============================================

-- Hospital Passports Table
CREATE TABLE IF NOT EXISTS public.hospital_passports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  
  -- JSONB fields for grouped data
  general_details JSONB DEFAULT '{}'::jsonb NOT NULL,
  medical_care_needs JSONB DEFAULT '{}'::jsonb NOT NULL,
  skin_medication_attachments JSONB DEFAULT '{}'::jsonb NOT NULL,
  sign_off JSONB DEFAULT '{}'::jsonb NOT NULL,
  
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL, -- References auth.users(id) theoretically, but just UUID for now
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeces for Hospital Passports
CREATE INDEX IF NOT EXISTS idx_hospital_passports_resident_id ON public.hospital_passports(resident_id);
CREATE INDEX IF NOT EXISTS idx_hospital_passports_organization_id ON public.hospital_passports(organization_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_hospital_passports_updated_at ON public.hospital_passports;
CREATE TRIGGER update_hospital_passports_updated_at
BEFORE UPDATE ON public.hospital_passports
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Hospital Transfer Logs Table
CREATE TABLE IF NOT EXISTS public.hospital_transfer_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  
  date DATE NOT NULL,
  hospital_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  outcome TEXT,
  follow_up TEXT,
  
  -- JSONB fields for changes
  files_changed JSONB DEFAULT '{}'::jsonb,
  medication_changes JSONB DEFAULT '{}'::jsonb,
  
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safety check: Ensure date column exists (if table pre-existed)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hospital_transfer_logs' AND column_name = 'date') THEN
        ALTER TABLE public.hospital_transfer_logs ADD COLUMN date DATE NOT NULL DEFAULT CURRENT_DATE;
    END IF;
END $$;

-- Indeces for Hospital Transfer Logs
CREATE INDEX IF NOT EXISTS idx_hospital_transfer_logs_resident_id ON public.hospital_transfer_logs(resident_id);
CREATE INDEX IF NOT EXISTS idx_hospital_transfer_logs_organization_id ON public.hospital_transfer_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_hospital_transfer_logs_date ON public.hospital_transfer_logs(date);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_hospital_transfer_logs_updated_at ON public.hospital_transfer_logs;
CREATE TRIGGER update_hospital_transfer_logs_updated_at
BEFORE UPDATE ON public.hospital_transfer_logs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies

-- Enable RLS
ALTER TABLE public.hospital_passports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_transfer_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check organization access (SECURITY DEFINER to bypass RLS on users table)
CREATE OR REPLACE FUNCTION public.hospital_can_access_org(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_org_id UUID;
  care_home_org_id UUID;
  team_org_id UUID;
  is_admin BOOLEAN;
BEGIN
  -- Check if user is SaaS admin
  SELECT COALESCE(is_saas_admin, false) INTO is_admin
  FROM public.users WHERE id = auth.uid();
  
  IF is_admin THEN
    RETURN true;
  END IF;

  -- Check direct active_organization_id
  SELECT active_organization_id INTO user_org_id
  FROM public.users WHERE id = auth.uid();
  
  IF user_org_id = target_org_id THEN
    RETURN true;
  END IF;

  -- Check via care_home relationship
  SELECT ch.organization_id INTO care_home_org_id
  FROM public.users u
  JOIN public.care_homes ch ON ch.id = u.active_care_home_id
  WHERE u.id = auth.uid();
  
  IF care_home_org_id = target_org_id THEN
    RETURN true;
  END IF;

  -- Check via team relationship
  SELECT t.organization_id INTO team_org_id
  FROM public.users u
  JOIN public.teams t ON t.id = u.active_team_id
  WHERE u.id = auth.uid();
  
  IF team_org_id = target_org_id THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Grant permissions
GRANT ALL ON TABLE public.hospital_passports TO authenticated;
GRANT ALL ON TABLE public.hospital_transfer_logs TO authenticated;

-- Policies for hospital_passports
CREATE POLICY "Users can view hospital passports for their organization"
ON public.hospital_passports FOR SELECT
USING (
  public.hospital_can_access_org(organization_id)
);

CREATE POLICY "Users can insert hospital passports for their organization"
ON public.hospital_passports FOR INSERT
WITH CHECK (
  public.hospital_can_access_org(organization_id)
);

CREATE POLICY "Users can update hospital passports for their organization"
ON public.hospital_passports FOR UPDATE
USING (
  public.hospital_can_access_org(organization_id)
);

CREATE POLICY "Users can delete hospital passports for their organization"
ON public.hospital_passports FOR DELETE
USING (
  public.hospital_can_access_org(organization_id)
);

-- Policies for hospital_transfer_logs
CREATE POLICY "Users can view hospital transfer logs for their organization"
ON public.hospital_transfer_logs FOR SELECT
USING (
  public.hospital_can_access_org(organization_id)
);

CREATE POLICY "Users can insert hospital transfer logs for their organization"
ON public.hospital_transfer_logs FOR INSERT
WITH CHECK (
  public.hospital_can_access_org(organization_id)
);

CREATE POLICY "Users can update hospital transfer logs for their organization"
ON public.hospital_transfer_logs FOR UPDATE
USING (
  public.hospital_can_access_org(organization_id)
);

CREATE POLICY "Users can delete hospital transfer logs for their organization"
ON public.hospital_transfer_logs FOR DELETE
USING (
  public.hospital_can_access_org(organization_id)
);

