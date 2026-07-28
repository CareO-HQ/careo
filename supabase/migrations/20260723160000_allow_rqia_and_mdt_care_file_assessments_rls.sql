-- Allow rqia, mdt, care_assistant, agency_nurse, agency_care_assistant roles to view care file assessment forms in scope
-- Migration: 20260723160000_allow_rqia_and_mdt_care_file_assessments_rls.sql

DO $$
DECLARE
  target_table TEXT;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'pre_admission_care_files',
    'infection_prevention_assessments',
    'bladder_bowel_assessments',
    'moving_handling_assessments',
    'bedrail_consents',
    'bedrails_risk_assessments',
    'long_term_falls_risk_assessments',
    'admission_assessments',
    'photography_consents',
    'dnacprs',
    'peeps',
    'dependency_assessments',
    'timl_assessments',
    'skin_integrity_assessments',
    'resident_valuables_assessments',
    'handling_profiles',
    'pain_assessments',
    'nutritional_assessments',
    'oral_assessments',
    'diet_notifications',
    'choking_risk_assessments',
    'cornell_depression_scales',
    'best_interest_decisions',
    'care_plan_assessments',
    'general_risk_assessments',
    'restraints_consents',
    'abbey_pain_assessments',
    'fall_risk_assessments',
    'smoking_risk_assessments',
    'capacity_consents',
    'night_observation_consents',
    'personal_profiles',
    'weight_records',
    'specimen_records',
    'must_assessments',
    'key_worker_diary',
    'progress_notes'
  ] LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables t
      WHERE t.table_schema = 'public'
        AND t.table_name = target_table
    ) THEN
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.%I',
        'Users can view ' || target_table || ' in their organization',
        target_table
      );

      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.%I',
        'Authorized roles can view ' || target_table || ' in scope',
        target_table
      );

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.current_user_role() IN (''owner'', ''manager'', ''nurse'', ''saas_admin'', ''care_assistant'', ''agency_nurse'', ''agency_care_assistant'', ''mdt'', ''rqia'') AND public.can_access_resident(resident_id))',
        'Users can view ' || target_table || ' in their organization',
        target_table
      );
    END IF;
  END LOOP;
END;
$$;
