-- Restrict medication record access for care assistants while preserving
-- topical medication intake administration capability.

-- Helper: evaluate whether a medication is topical without requiring
-- direct table read permissions for the caller.
CREATE OR REPLACE FUNCTION public.is_topical_medication(target_medication_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.medications m
    WHERE m.id = target_medication_id
      AND (
        m.schedule_type = 'Topical'
        OR lower(coalesce(m.route, '')) = 'topical'
      )
  );
$$;

-- Tighten medication table policy: care assistants should not be able to
-- read/create/update/delete medication records.
DROP POLICY IF EXISTS "Medication isolation" ON public.medications;

CREATE POLICY "Medication in scope for clinical/admin roles"
  ON public.medications FOR ALL
  TO authenticated
  USING (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_organization(organization_id)
  )
  WITH CHECK (
    public.current_user_role() IN ('owner', 'manager', 'nurse', 'saas_admin')
    AND public.can_access_organization(organization_id)
  );

-- Keep care assistants limited to topical intake entries only.
DROP POLICY IF EXISTS "Care assistants can manage topical medication intakes in scope"
ON public.medication_intakes;

CREATE POLICY "Care assistants can manage topical medication intakes in scope"
  ON public.medication_intakes FOR ALL
  TO authenticated
  USING (
    public.current_user_role() = 'care_assistant'
    AND public.can_access_care_home(care_home_id)
    AND public.is_topical_medication(medication_id)
  )
  WITH CHECK (
    public.current_user_role() = 'care_assistant'
    AND public.can_access_care_home(care_home_id)
    AND public.is_topical_medication(medication_id)
  );
