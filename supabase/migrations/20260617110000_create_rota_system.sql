-- Migration to create Rota and Workforce Planning tables

-- 1. Add workforce fields and Manager-Approved Nurse flag to public.users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_manager_approved_nurse BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS contracted_weekly_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_weekly_hours NUMERIC DEFAULT 48,
ADD COLUMN IF NOT EXISTS availability_rules JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS preferred_working_days TEXT[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS annual_leave_balance NUMERIC DEFAULT 28,
ADD COLUMN IF NOT EXISTS sick_leave_days_taken INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS training_days JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS overtime_permitted BOOLEAN DEFAULT true;

-- Add comments for clarity
COMMENT ON COLUMN public.users.is_manager_approved_nurse IS 'Elevated role flag allowing nurses manager-like access for their specific unit';
COMMENT ON COLUMN public.users.contracted_weekly_hours IS 'Target contracted hours per week for scheduling compliance checks';

-- 2. Shift Templates Table
CREATE TABLE IF NOT EXISTS public.shift_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 0,
  hours NUMERIC NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, name)
);

CREATE TRIGGER update_shift_templates_updated_at BEFORE UPDATE ON public.shift_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Shift Staffing Requirements Table
CREATE TABLE IF NOT EXISTS public.shift_staffing_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  shift_template_id UUID NOT NULL REFERENCES public.shift_templates(id) ON DELETE CASCADE,
  nurses_required INTEGER DEFAULT 1,
  care_assistants_required INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, shift_template_id)
);

CREATE TRIGGER update_shift_staffing_reqs_updated_at BEFORE UPDATE ON public.shift_staffing_requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Rotas Table
CREATE TABLE IF NOT EXISTS public.rotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, start_date)
);

CREATE TRIGGER update_rotas_updated_at BEFORE UPDATE ON public.rotas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Rota Shifts Table
CREATE TABLE IF NOT EXISTS public.rota_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rota_id UUID NOT NULL REFERENCES public.rotas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shift_template_id UUID REFERENCES public.shift_templates(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 0,
  hours NUMERIC NOT NULL,
  is_agency BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_rota_shifts_updated_at BEFORE UPDATE ON public.rota_shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Leave Requests Table
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('annual_leave', 'sick_leave', 'training')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  rejection_reason TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Shift Swaps Table
CREATE TABLE IF NOT EXISTS public.shift_swaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requesting_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  requesting_shift_id UUID NOT NULL REFERENCES public.rota_shifts(id) ON DELETE CASCADE,
  target_shift_id UUID REFERENCES public.rota_shifts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted_by_colleague', 'approved', 'rejected')),
  rejection_reason TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_shift_swaps_updated_at BEFORE UPDATE ON public.shift_swaps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Rota Audit Logs Table
CREATE TABLE IF NOT EXISTS public.rota_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'rota_created', 'rota_edited', 'rota_published', 
    'shift_added', 'shift_removed', 'shift_swapped', 
    'leave_requested', 'leave_approved', 'leave_rejected', 
    'manager_approved_nurse_granted', 'manager_approved_nurse_revoked', 
    'staffing_rule_changed', 'shift_template_created', 
    'shift_template_edited', 'shift_template_deleted'
  )),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Row Level Security policies

ALTER TABLE public.shift_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_staffing_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rota_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_swaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rota_audit_logs ENABLE ROW LEVEL SECURITY;

-- Dynamic function to determine if user can manage rotas for a unit
CREATE OR REPLACE FUNCTION public.can_manage_rota(target_team_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  caller_role TEXT;
  caller_team_id UUID;
  caller_is_approved_nurse BOOLEAN;
BEGIN
  -- 1. SaaS Admin check
  IF (auth.jwt() -> 'app_metadata' ->> 'is_saas_admin')::BOOLEAN = true THEN
    RETURN true;
  END IF;

  -- Get caller properties
  SELECT role, active_team_id, is_manager_approved_nurse 
  INTO caller_role, caller_team_id, caller_is_approved_nurse
  FROM public.users 
  WHERE id = auth.uid();

  -- 2. Owner & Manager can manage all teams
  IF caller_role IN ('owner', 'manager') THEN
    RETURN true;
  END IF;

  -- 3. Manager-Approved Nurse can manage their assigned team only
  IF caller_role = 'nurse' AND caller_is_approved_nurse = true AND caller_team_id = target_team_id THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
DROP POLICY IF EXISTS "View shift templates" ON public.shift_templates;
DROP POLICY IF EXISTS "Manage shift templates" ON public.shift_templates;
CREATE POLICY "View shift templates" ON public.shift_templates FOR SELECT USING (true);
CREATE POLICY "Manage shift templates" ON public.shift_templates FOR ALL USING (public.can_manage_rota(team_id));

DROP POLICY IF EXISTS "View staffing requirements" ON public.shift_staffing_requirements;
DROP POLICY IF EXISTS "Manage staffing requirements" ON public.shift_staffing_requirements;
CREATE POLICY "View staffing requirements" ON public.shift_staffing_requirements FOR SELECT USING (true);
CREATE POLICY "Manage staffing requirements" ON public.shift_staffing_requirements FOR ALL USING (public.can_manage_rota(team_id));

DROP POLICY IF EXISTS "View rotas" ON public.rotas;
DROP POLICY IF EXISTS "Manage rotas" ON public.rotas;
CREATE POLICY "View rotas" ON public.rotas FOR SELECT USING (true);
CREATE POLICY "Manage rotas" ON public.rotas FOR ALL USING (public.can_manage_rota(team_id));

DROP POLICY IF EXISTS "View rota shifts" ON public.rota_shifts;
DROP POLICY IF EXISTS "Manage rota shifts" ON public.rota_shifts;
CREATE POLICY "View rota shifts" ON public.rota_shifts FOR SELECT USING (true);
CREATE POLICY "Manage rota shifts" ON public.rota_shifts FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.rotas r 
    WHERE r.id = rota_id AND public.can_manage_rota(r.team_id)
  )
);

DROP POLICY IF EXISTS "View leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Create leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Manage leave requests" ON public.leave_requests;
CREATE POLICY "View leave requests" ON public.leave_requests FOR SELECT USING (
  user_id = auth.uid() OR public.can_manage_rota(team_id)
);
CREATE POLICY "Create leave requests" ON public.leave_requests FOR INSERT WITH CHECK (
  user_id = auth.uid()
);
CREATE POLICY "Manage leave requests" ON public.leave_requests FOR ALL USING (
  public.can_manage_rota(team_id)
);

DROP POLICY IF EXISTS "View shift swaps" ON public.shift_swaps;
DROP POLICY IF EXISTS "Create shift swaps" ON public.shift_swaps;
DROP POLICY IF EXISTS "Manage shift swaps" ON public.shift_swaps;
CREATE POLICY "View shift swaps" ON public.shift_swaps FOR SELECT USING (
  requesting_user_id = auth.uid() OR target_user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.rota_shifts rs 
    JOIN public.rotas r ON r.id = rs.rota_id 
    WHERE rs.id = requesting_shift_id AND public.can_manage_rota(r.team_id)
  )
);
CREATE POLICY "Create shift swaps" ON public.shift_swaps FOR INSERT WITH CHECK (
  requesting_user_id = auth.uid()
);
CREATE POLICY "Manage shift swaps" ON public.shift_swaps FOR ALL USING (
  target_user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.rota_shifts rs 
    JOIN public.rotas r ON r.id = rs.rota_id 
    WHERE rs.id = requesting_shift_id AND public.can_manage_rota(r.team_id)
  )
);

DROP POLICY IF EXISTS "View audit logs" ON public.rota_audit_logs;
DROP POLICY IF EXISTS "Insert audit logs" ON public.rota_audit_logs;
CREATE POLICY "View audit logs" ON public.rota_audit_logs FOR SELECT USING (
  public.can_manage_rota(team_id)
);
CREATE POLICY "Insert audit logs" ON public.rota_audit_logs FOR INSERT WITH CHECK (
  actor_id = auth.uid()
);
