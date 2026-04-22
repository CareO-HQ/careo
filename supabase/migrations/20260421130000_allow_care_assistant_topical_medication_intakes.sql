-- Allow care assistants to manage topical medication intake records only.
-- This is additive to existing stricter medication_intakes policy for other roles.

DROP POLICY IF EXISTS "Care assistants can manage topical medication intakes in scope"
ON public.medication_intakes;

CREATE POLICY "Care assistants can manage topical medication intakes in scope"
  ON public.medication_intakes FOR ALL
  TO authenticated
  USING (
    public.current_user_role() = 'care_assistant'
    AND public.can_access_care_home(care_home_id)
    AND EXISTS (
      SELECT 1
      FROM public.medications m
      WHERE m.id = medication_intakes.medication_id
        AND (
          m.schedule_type = 'Topical'
          OR lower(coalesce(m.route, '')) = 'topical'
        )
    )
  )
  WITH CHECK (
    public.current_user_role() = 'care_assistant'
    AND public.can_access_care_home(care_home_id)
    AND EXISTS (
      SELECT 1
      FROM public.medications m
      WHERE m.id = medication_intakes.medication_id
        AND (
          m.schedule_type = 'Topical'
          OR lower(coalesce(m.route, '')) = 'topical'
        )
    )
  );
