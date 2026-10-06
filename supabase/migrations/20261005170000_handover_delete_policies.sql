-- Handover: allow the deletes the app relies on.
--
-- handover_comments and handover_reports had SELECT / INSERT / UPDATE policies but no
-- permissive DELETE policy, so every delete silently affected 0 rows:
--   * "Save Handover" never cleared the archived shift notes from the live sheet;
--   * overwriting an existing shift report kept the old report and inserted a second one.
-- The RESTRICTIVE zz_scope_care_home and zz_role_delete policies still apply on top.

DROP POLICY IF EXISTS "Users can delete handover comments in their organization" ON public.handover_comments;
CREATE POLICY "Users can delete handover comments in their organization"
  ON public.handover_comments FOR DELETE
  USING ( public.can_access_organization(organization_id) );

DROP POLICY IF EXISTS "Users can delete handover reports in their organization" ON public.handover_reports;
CREATE POLICY "Users can delete handover reports in their organization"
  ON public.handover_reports FOR DELETE
  USING ( public.can_access_organization(organization_id) );
