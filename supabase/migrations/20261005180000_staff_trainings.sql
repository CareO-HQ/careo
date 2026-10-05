-- Staff training records (Staff > member > Trainings).
--
-- The Trainings page previously kept records only in browser memory, so they were lost on
-- reload although the page reported "added successfully". This table stores them.
--
-- Access:
--   * read:  the staff member themselves, and owners / managers who can access the
--            staff member's care home (owners: any home in their organisation);
--   * write: owners / managers who can access that care home.
-- organization_id and care_home_id are always taken from the staff member's users row, so
-- a record cannot be attached to another organisation or care home from the browser.

CREATE TABLE IF NOT EXISTS public.staff_trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  care_home_id UUID REFERENCES public.care_homes(id) ON DELETE SET NULL,
  training_type TEXT NOT NULL CHECK (training_type IN ('online', 'inperson')),
  name TEXT NOT NULL CHECK (length(btrim(name)) > 0),
  provider TEXT NOT NULL CHECK (length(btrim(provider)) > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'expired')),
  completion_date DATE,
  expiry_period TEXT CHECK (expiry_period IN ('6_months', '1_year', '2_years')),
  expiry_date DATE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT staff_trainings_expiry_after_completion
    CHECK (expiry_date IS NULL OR completion_date IS NULL OR expiry_date >= completion_date)
);

CREATE INDEX IF NOT EXISTS idx_staff_trainings_user ON public.staff_trainings (user_id);
CREATE INDEX IF NOT EXISTS idx_staff_trainings_care_home ON public.staff_trainings (care_home_id);

-- Tenancy columns come from the staff member, never from the client.
CREATE OR REPLACE FUNCTION public.staff_trainings_set_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID;
  v_home UUID;
BEGIN
  SELECT COALESCE(u.active_organization_id, u.organization_id), u.active_care_home_id
    INTO v_org, v_home
    FROM public.users u
   WHERE u.id = NEW.user_id;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Staff member % does not belong to an organisation', NEW.user_id;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- A record stays with its staff member.
    NEW.user_id := OLD.user_id;
    NEW.created_by := OLD.created_by;
    NEW.created_at := OLD.created_at;
  ELSE
    NEW.created_by := COALESCE(auth.uid(), NEW.created_by);
  END IF;

  NEW.organization_id := v_org;
  NEW.care_home_id := v_home;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS staff_trainings_set_scope ON public.staff_trainings;
CREATE TRIGGER staff_trainings_set_scope
  BEFORE INSERT OR UPDATE ON public.staff_trainings
  FOR EACH ROW EXECUTE FUNCTION public.staff_trainings_set_scope();

ALTER TABLE public.staff_trainings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff and their managers read training records" ON public.staff_trainings;
CREATE POLICY "Staff and their managers read training records"
  ON public.staff_trainings FOR SELECT TO authenticated
  USING (
    (user_id = auth.uid() AND NOT public.current_user_login_blocked())
    OR (
      public.can_access_care_home(care_home_id)
      AND (public.is_saas_admin() OR public.current_user_role() IN ('owner', 'manager'))
    )
  );

DROP POLICY IF EXISTS "Managers add training records" ON public.staff_trainings;
CREATE POLICY "Managers add training records"
  ON public.staff_trainings FOR INSERT TO authenticated
  WITH CHECK (
    public.can_access_care_home(care_home_id)
    AND (public.is_saas_admin() OR public.current_user_role() IN ('owner', 'manager'))
  );

DROP POLICY IF EXISTS "Managers update training records" ON public.staff_trainings;
CREATE POLICY "Managers update training records"
  ON public.staff_trainings FOR UPDATE TO authenticated
  USING (
    public.can_access_care_home(care_home_id)
    AND (public.is_saas_admin() OR public.current_user_role() IN ('owner', 'manager'))
  )
  WITH CHECK (
    public.can_access_care_home(care_home_id)
    AND (public.is_saas_admin() OR public.current_user_role() IN ('owner', 'manager'))
  );

DROP POLICY IF EXISTS "Managers delete training records" ON public.staff_trainings;
CREATE POLICY "Managers delete training records"
  ON public.staff_trainings FOR DELETE TO authenticated
  USING (
    public.can_access_care_home(care_home_id)
    AND (public.is_saas_admin() OR public.current_user_role() IN ('owner', 'manager'))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_trainings TO authenticated;
