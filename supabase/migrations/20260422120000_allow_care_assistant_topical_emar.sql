-- Allow care assistants to read topical eMAR sheets and read/write topical eMAR administrations.
-- Complements medication_intakes / medications topical policies; fixes RLS 42501 on Apply for care_assistant.

DROP POLICY IF EXISTS "Care assistants can view topical eMAR sheets in scope"
ON public.emar_sheets;

CREATE POLICY "Care assistants can view topical eMAR sheets in scope"
  ON public.emar_sheets FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'care_assistant'
    AND public.can_access_care_home(care_home_id)
    AND type = 'topical'
  );

DROP POLICY IF EXISTS "Care assistants can view topical eMAR administrations in scope"
ON public.emar_administrations;

DROP POLICY IF EXISTS "Care assistants can insert topical eMAR administrations in scope"
ON public.emar_administrations;

DROP POLICY IF EXISTS "Care assistants can update topical eMAR administrations in scope"
ON public.emar_administrations;

CREATE POLICY "Care assistants can view topical eMAR administrations in scope"
  ON public.emar_administrations FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'care_assistant'
    AND public.can_access_care_home(care_home_id)
    AND EXISTS (
      SELECT 1
      FROM public.emar_sheets es
      INNER JOIN public.medications m ON m.id = emar_administrations.medication_id
      WHERE es.id = emar_administrations.emar_sheet_id
        AND es.type = 'topical'
        AND m.resident_id = es.resident_id
        AND (
          m.schedule_type = 'Topical'
          OR lower(coalesce(m.route, '')) = 'topical'
        )
    )
  );

CREATE POLICY "Care assistants can insert topical eMAR administrations in scope"
  ON public.emar_administrations FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() = 'care_assistant'
    AND public.can_access_care_home(care_home_id)
    AND EXISTS (
      SELECT 1
      FROM public.emar_sheets es
      INNER JOIN public.medications m ON m.id = emar_administrations.medication_id
      WHERE es.id = emar_administrations.emar_sheet_id
        AND es.type = 'topical'
        AND m.resident_id = es.resident_id
        AND (
          m.schedule_type = 'Topical'
          OR lower(coalesce(m.route, '')) = 'topical'
        )
    )
  );

CREATE POLICY "Care assistants can update topical eMAR administrations in scope"
  ON public.emar_administrations FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() = 'care_assistant'
    AND public.can_access_care_home(care_home_id)
    AND EXISTS (
      SELECT 1
      FROM public.emar_sheets es
      INNER JOIN public.medications m ON m.id = emar_administrations.medication_id
      WHERE es.id = emar_administrations.emar_sheet_id
        AND es.type = 'topical'
        AND m.resident_id = es.resident_id
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
      FROM public.emar_sheets es
      INNER JOIN public.medications m ON m.id = emar_administrations.medication_id
      WHERE es.id = emar_administrations.emar_sheet_id
        AND es.type = 'topical'
        AND m.resident_id = es.resident_id
        AND (
          m.schedule_type = 'Topical'
          OR lower(coalesce(m.route, '')) = 'topical'
        )
    )
  );
