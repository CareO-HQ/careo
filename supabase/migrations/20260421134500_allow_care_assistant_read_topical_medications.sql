-- Restore topical medication visibility for care assistants without granting
-- broader medication CRUD permissions.

DROP POLICY IF EXISTS "Care assistants can view topical medications in scope"
ON public.medications;

CREATE POLICY "Care assistants can view topical medications in scope"
  ON public.medications FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'care_assistant'
    AND public.can_access_resident(resident_id)
    AND (
      schedule_type = 'Topical'
      OR lower(coalesce(route, '')) = 'topical'
    )
  );
