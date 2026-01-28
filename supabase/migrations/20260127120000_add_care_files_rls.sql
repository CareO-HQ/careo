-- ============================================
-- CARE FILE FORMS RLS POLICIES
-- Allow owner, manager, and nurse to manage care file forms
-- ============================================

-- List of tables:
-- 1. pre_admission_care_files
-- 2. infection_prevention_assessments
-- 3. bladder_bowel_assessments
-- 4. moving_handling_assessments
-- 5. bedrail_consents
-- 6. bedrails_risk_assessments
-- 7. long_term_falls_risk_assessments
-- 8. admission_assessments
-- 9. photography_consents
-- 10. dnacprs
-- 11. peeps
-- 12. dependency_assessments
-- 13. timl_assessments
-- 14. skin_integrity_assessments
-- 15. resident_valuables_assessments
-- 16. resident_handling_profiles
-- 17. pain_assessments
-- 18. nutritional_assessments
-- 19. oral_assessments
-- 20. diet_notifications
-- 21. choking_risk_assessments
-- 22. cornell_depression_scales
-- 23. best_interest_decisions
-- 24. care_plan_assessments

-- Helper macro-like execution isn't standard SQL, so we repeat the policy block for each table.

-- 1. pre_admission_care_files
ALTER TABLE public.pre_admission_care_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS admins manage pre_admission_care_files" ON public.pre_admission_care_files;
CREATE POLICY "SaaS admins manage pre_admission_care_files" ON public.pre_admission_care_files FOR ALL TO authenticated USING (public.is_saas_admin()) WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view pre_admission_care_files in their organization" ON public.pre_admission_care_files;
CREATE POLICY "Users can view pre_admission_care_files in their organization" ON public.pre_admission_care_files FOR SELECT TO authenticated USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage pre_admission_care_files" ON public.pre_admission_care_files;
CREATE POLICY "Staff can manage pre_admission_care_files" ON public.pre_admission_care_files FOR ALL TO authenticated USING (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')) WITH CHECK (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse'));


-- 2. infection_prevention_assessments
ALTER TABLE public.infection_prevention_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS admins manage infection_prevention_assessments" ON public.infection_prevention_assessments;
CREATE POLICY "SaaS admins manage infection_prevention_assessments" ON public.infection_prevention_assessments FOR ALL TO authenticated USING (public.is_saas_admin()) WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view infection_prevention_assessments in their organization" ON public.infection_prevention_assessments;
CREATE POLICY "Users can view infection_prevention_assessments in their organization" ON public.infection_prevention_assessments FOR SELECT TO authenticated USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage infection_prevention_assessments" ON public.infection_prevention_assessments;
CREATE POLICY "Staff can manage infection_prevention_assessments" ON public.infection_prevention_assessments FOR ALL TO authenticated USING (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')) WITH CHECK (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse'));


-- 3. bladder_bowel_assessments
ALTER TABLE public.bladder_bowel_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS admins manage bladder_bowel_assessments" ON public.bladder_bowel_assessments;
CREATE POLICY "SaaS admins manage bladder_bowel_assessments" ON public.bladder_bowel_assessments FOR ALL TO authenticated USING (public.is_saas_admin()) WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view bladder_bowel_assessments in their organization" ON public.bladder_bowel_assessments;
CREATE POLICY "Users can view bladder_bowel_assessments in their organization" ON public.bladder_bowel_assessments FOR SELECT TO authenticated USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage bladder_bowel_assessments" ON public.bladder_bowel_assessments;
CREATE POLICY "Staff can manage bladder_bowel_assessments" ON public.bladder_bowel_assessments FOR ALL TO authenticated USING (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')) WITH CHECK (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse'));


-- 4. moving_handling_assessments
ALTER TABLE public.moving_handling_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS admins manage moving_handling_assessments" ON public.moving_handling_assessments;
CREATE POLICY "SaaS admins manage moving_handling_assessments" ON public.moving_handling_assessments FOR ALL TO authenticated USING (public.is_saas_admin()) WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view moving_handling_assessments in their organization" ON public.moving_handling_assessments;
CREATE POLICY "Users can view moving_handling_assessments in their organization" ON public.moving_handling_assessments FOR SELECT TO authenticated USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage moving_handling_assessments" ON public.moving_handling_assessments;
CREATE POLICY "Staff can manage moving_handling_assessments" ON public.moving_handling_assessments FOR ALL TO authenticated USING (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')) WITH CHECK (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse'));


-- 5. bedrail_consents
ALTER TABLE public.bedrail_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS admins manage bedrail_consents" ON public.bedrail_consents;
CREATE POLICY "SaaS admins manage bedrail_consents" ON public.bedrail_consents FOR ALL TO authenticated USING (public.is_saas_admin()) WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view bedrail_consents in their organization" ON public.bedrail_consents;
CREATE POLICY "Users can view bedrail_consents in their organization" ON public.bedrail_consents FOR SELECT TO authenticated USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage bedrail_consents" ON public.bedrail_consents;
CREATE POLICY "Staff can manage bedrail_consents" ON public.bedrail_consents FOR ALL TO authenticated USING (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')) WITH CHECK (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse'));


-- 6. bedrails_risk_assessments
ALTER TABLE public.bedrails_risk_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS admins manage bedrails_risk_assessments" ON public.bedrails_risk_assessments;
CREATE POLICY "SaaS admins manage bedrails_risk_assessments" ON public.bedrails_risk_assessments FOR ALL TO authenticated USING (public.is_saas_admin()) WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view bedrails_risk_assessments in their organization" ON public.bedrails_risk_assessments;
CREATE POLICY "Users can view bedrails_risk_assessments in their organization" ON public.bedrails_risk_assessments FOR SELECT TO authenticated USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage bedrails_risk_assessments" ON public.bedrails_risk_assessments;
CREATE POLICY "Staff can manage bedrails_risk_assessments" ON public.bedrails_risk_assessments FOR ALL TO authenticated USING (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')) WITH CHECK (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse'));


-- 7. long_term_falls_risk_assessments
ALTER TABLE public.long_term_falls_risk_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS admins manage long_term_falls_risk_assessments" ON public.long_term_falls_risk_assessments;
CREATE POLICY "SaaS admins manage long_term_falls_risk_assessments" ON public.long_term_falls_risk_assessments FOR ALL TO authenticated USING (public.is_saas_admin()) WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view long_term_falls_risk_assessments in their organization" ON public.long_term_falls_risk_assessments;
CREATE POLICY "Users can view long_term_falls_risk_assessments in their organization" ON public.long_term_falls_risk_assessments FOR SELECT TO authenticated USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage long_term_falls_risk_assessments" ON public.long_term_falls_risk_assessments;
CREATE POLICY "Staff can manage long_term_falls_risk_assessments" ON public.long_term_falls_risk_assessments FOR ALL TO authenticated USING (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')) WITH CHECK (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse'));


-- 8. admission_assessments
ALTER TABLE public.admission_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS admins manage admission_assessments" ON public.admission_assessments;
CREATE POLICY "SaaS admins manage admission_assessments" ON public.admission_assessments FOR ALL TO authenticated USING (public.is_saas_admin()) WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view admission_assessments in their organization" ON public.admission_assessments;
CREATE POLICY "Users can view admission_assessments in their organization" ON public.admission_assessments FOR SELECT TO authenticated USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage admission_assessments" ON public.admission_assessments;
CREATE POLICY "Staff can manage admission_assessments" ON public.admission_assessments FOR ALL TO authenticated USING (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')) WITH CHECK (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse'));


-- 9. photography_consents
ALTER TABLE public.photography_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS admins manage photography_consents" ON public.photography_consents;
CREATE POLICY "SaaS admins manage photography_consents" ON public.photography_consents FOR ALL TO authenticated USING (public.is_saas_admin()) WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view photography_consents in their organization" ON public.photography_consents;
CREATE POLICY "Users can view photography_consents in their organization" ON public.photography_consents FOR SELECT TO authenticated USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage photography_consents" ON public.photography_consents;
CREATE POLICY "Staff can manage photography_consents" ON public.photography_consents FOR ALL TO authenticated USING (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')) WITH CHECK (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse'));


-- 10. dnacprs
ALTER TABLE public.dnacprs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS admins manage dnacprs" ON public.dnacprs;
CREATE POLICY "SaaS admins manage dnacprs" ON public.dnacprs FOR ALL TO authenticated USING (public.is_saas_admin()) WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view dnacprs in their organization" ON public.dnacprs;
CREATE POLICY "Users can view dnacprs in their organization" ON public.dnacprs FOR SELECT TO authenticated USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage dnacprs" ON public.dnacprs;
CREATE POLICY "Staff can manage dnacprs" ON public.dnacprs FOR ALL TO authenticated USING (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')) WITH CHECK (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse'));


-- 11. peeps
ALTER TABLE public.peeps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS admins manage peeps" ON public.peeps;
CREATE POLICY "SaaS admins manage peeps" ON public.peeps FOR ALL TO authenticated USING (public.is_saas_admin()) WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view peeps in their organization" ON public.peeps;
CREATE POLICY "Users can view peeps in their organization" ON public.peeps FOR SELECT TO authenticated USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage peeps" ON public.peeps;
CREATE POLICY "Staff can manage peeps" ON public.peeps FOR ALL TO authenticated USING (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')) WITH CHECK (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse'));


-- 12. dependency_assessments
ALTER TABLE public.dependency_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS admins manage dependency_assessments" ON public.dependency_assessments;
CREATE POLICY "SaaS admins manage dependency_assessments" ON public.dependency_assessments FOR ALL TO authenticated USING (public.is_saas_admin()) WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view dependency_assessments in their organization" ON public.dependency_assessments;
CREATE POLICY "Users can view dependency_assessments in their organization" ON public.dependency_assessments FOR SELECT TO authenticated USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage dependency_assessments" ON public.dependency_assessments;
CREATE POLICY "Staff can manage dependency_assessments" ON public.dependency_assessments FOR ALL TO authenticated USING (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')) WITH CHECK (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse'));


-- 13. timl_assessments
ALTER TABLE public.timl_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS admins manage timl_assessments" ON public.timl_assessments;
CREATE POLICY "SaaS admins manage timl_assessments" ON public.timl_assessments FOR ALL TO authenticated USING (public.is_saas_admin()) WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view timl_assessments in their organization" ON public.timl_assessments;
CREATE POLICY "Users can view timl_assessments in their organization" ON public.timl_assessments FOR SELECT TO authenticated USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage timl_assessments" ON public.timl_assessments;
CREATE POLICY "Staff can manage timl_assessments" ON public.timl_assessments FOR ALL TO authenticated USING (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')) WITH CHECK (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse'));


-- 14. skin_integrity_assessments
ALTER TABLE public.skin_integrity_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS admins manage skin_integrity_assessments" ON public.skin_integrity_assessments;
CREATE POLICY "SaaS admins manage skin_integrity_assessments" ON public.skin_integrity_assessments FOR ALL TO authenticated USING (public.is_saas_admin()) WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view skin_integrity_assessments in their organization" ON public.skin_integrity_assessments;
CREATE POLICY "Users can view skin_integrity_assessments in their organization" ON public.skin_integrity_assessments FOR SELECT TO authenticated USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage skin_integrity_assessments" ON public.skin_integrity_assessments;
CREATE POLICY "Staff can manage skin_integrity_assessments" ON public.skin_integrity_assessments FOR ALL TO authenticated USING (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')) WITH CHECK (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse'));


-- 15. resident_valuables_assessments
ALTER TABLE public.resident_valuables_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS admins manage resident_valuables_assessments" ON public.resident_valuables_assessments;
CREATE POLICY "SaaS admins manage resident_valuables_assessments" ON public.resident_valuables_assessments FOR ALL TO authenticated USING (public.is_saas_admin()) WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view resident_valuables_assessments in their organization" ON public.resident_valuables_assessments;
CREATE POLICY "Users can view resident_valuables_assessments in their organization" ON public.resident_valuables_assessments FOR SELECT TO authenticated USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage resident_valuables_assessments" ON public.resident_valuables_assessments;
CREATE POLICY "Staff can manage resident_valuables_assessments" ON public.resident_valuables_assessments FOR ALL TO authenticated USING (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')) WITH CHECK (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse'));


-- 16. resident_handling_profiles
ALTER TABLE public.resident_handling_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS admins manage resident_handling_profiles" ON public.resident_handling_profiles;
CREATE POLICY "SaaS admins manage resident_handling_profiles" ON public.resident_handling_profiles FOR ALL TO authenticated USING (public.is_saas_admin()) WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view resident_handling_profiles in their organization" ON public.resident_handling_profiles;
CREATE POLICY "Users can view resident_handling_profiles in their organization" ON public.resident_handling_profiles FOR SELECT TO authenticated USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage resident_handling_profiles" ON public.resident_handling_profiles;
CREATE POLICY "Staff can manage resident_handling_profiles" ON public.resident_handling_profiles FOR ALL TO authenticated USING (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')) WITH CHECK (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse'));


-- 17. pain_assessments
ALTER TABLE public.pain_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS admins manage pain_assessments" ON public.pain_assessments;
CREATE POLICY "SaaS admins manage pain_assessments" ON public.pain_assessments FOR ALL TO authenticated USING (public.is_saas_admin()) WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view pain_assessments in their organization" ON public.pain_assessments;
CREATE POLICY "Users can view pain_assessments in their organization" ON public.pain_assessments FOR SELECT TO authenticated USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage pain_assessments" ON public.pain_assessments;
CREATE POLICY "Staff can manage pain_assessments" ON public.pain_assessments FOR ALL TO authenticated USING (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')) WITH CHECK (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse'));


-- 18. nutritional_assessments
ALTER TABLE public.nutritional_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS admins manage nutritional_assessments" ON public.nutritional_assessments;
CREATE POLICY "SaaS admins manage nutritional_assessments" ON public.nutritional_assessments FOR ALL TO authenticated USING (public.is_saas_admin()) WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view nutritional_assessments in their organization" ON public.nutritional_assessments;
CREATE POLICY "Users can view nutritional_assessments in their organization" ON public.nutritional_assessments FOR SELECT TO authenticated USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage nutritional_assessments" ON public.nutritional_assessments;
CREATE POLICY "Staff can manage nutritional_assessments" ON public.nutritional_assessments FOR ALL TO authenticated USING (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')) WITH CHECK (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse'));


-- 19. oral_assessments
ALTER TABLE public.oral_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS admins manage oral_assessments" ON public.oral_assessments;
CREATE POLICY "SaaS admins manage oral_assessments" ON public.oral_assessments FOR ALL TO authenticated USING (public.is_saas_admin()) WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view oral_assessments in their organization" ON public.oral_assessments;
CREATE POLICY "Users can view oral_assessments in their organization" ON public.oral_assessments FOR SELECT TO authenticated USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage oral_assessments" ON public.oral_assessments;
CREATE POLICY "Staff can manage oral_assessments" ON public.oral_assessments FOR ALL TO authenticated USING (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')) WITH CHECK (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse'));


-- 20. diet_notifications
ALTER TABLE public.diet_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS admins manage diet_notifications" ON public.diet_notifications;
CREATE POLICY "SaaS admins manage diet_notifications" ON public.diet_notifications FOR ALL TO authenticated USING (public.is_saas_admin()) WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view diet_notifications in their organization" ON public.diet_notifications;
CREATE POLICY "Users can view diet_notifications in their organization" ON public.diet_notifications FOR SELECT TO authenticated USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage diet_notifications" ON public.diet_notifications;
CREATE POLICY "Staff can manage diet_notifications" ON public.diet_notifications FOR ALL TO authenticated USING (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')) WITH CHECK (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse'));


-- 21. choking_risk_assessments
ALTER TABLE public.choking_risk_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS admins manage choking_risk_assessments" ON public.choking_risk_assessments;
CREATE POLICY "SaaS admins manage choking_risk_assessments" ON public.choking_risk_assessments FOR ALL TO authenticated USING (public.is_saas_admin()) WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view choking_risk_assessments in their organization" ON public.choking_risk_assessments;
CREATE POLICY "Users can view choking_risk_assessments in their organization" ON public.choking_risk_assessments FOR SELECT TO authenticated USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage choking_risk_assessments" ON public.choking_risk_assessments;
CREATE POLICY "Staff can manage choking_risk_assessments" ON public.choking_risk_assessments FOR ALL TO authenticated USING (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')) WITH CHECK (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse'));


-- 22. cornell_depression_scales
ALTER TABLE public.cornell_depression_scales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS admins manage cornell_depression_scales" ON public.cornell_depression_scales;
CREATE POLICY "SaaS admins manage cornell_depression_scales" ON public.cornell_depression_scales FOR ALL TO authenticated USING (public.is_saas_admin()) WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view cornell_depression_scales in their organization" ON public.cornell_depression_scales;
CREATE POLICY "Users can view cornell_depression_scales in their organization" ON public.cornell_depression_scales FOR SELECT TO authenticated USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage cornell_depression_scales" ON public.cornell_depression_scales;
CREATE POLICY "Staff can manage cornell_depression_scales" ON public.cornell_depression_scales FOR ALL TO authenticated USING (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')) WITH CHECK (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse'));


-- 23. best_interest_decisions
ALTER TABLE public.best_interest_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS admins manage best_interest_decisions" ON public.best_interest_decisions;
CREATE POLICY "SaaS admins manage best_interest_decisions" ON public.best_interest_decisions FOR ALL TO authenticated USING (public.is_saas_admin()) WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view best_interest_decisions in their organization" ON public.best_interest_decisions;
CREATE POLICY "Users can view best_interest_decisions in their organization" ON public.best_interest_decisions FOR SELECT TO authenticated USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage best_interest_decisions" ON public.best_interest_decisions;
CREATE POLICY "Staff can manage best_interest_decisions" ON public.best_interest_decisions FOR ALL TO authenticated USING (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')) WITH CHECK (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse'));


-- 24. care_plan_assessments
ALTER TABLE public.care_plan_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS admins manage care_plan_assessments" ON public.care_plan_assessments;
CREATE POLICY "SaaS admins manage care_plan_assessments" ON public.care_plan_assessments FOR ALL TO authenticated USING (public.is_saas_admin()) WITH CHECK (public.is_saas_admin());

DROP POLICY IF EXISTS "Users can view care_plan_assessments in their organization" ON public.care_plan_assessments;
CREATE POLICY "Users can view care_plan_assessments in their organization" ON public.care_plan_assessments FOR SELECT TO authenticated USING (public.can_access_organization(organization_id));

DROP POLICY IF EXISTS "Staff can manage care_plan_assessments" ON public.care_plan_assessments;
CREATE POLICY "Staff can manage care_plan_assessments" ON public.care_plan_assessments FOR ALL TO authenticated USING (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse')) WITH CHECK (public.can_access_organization(organization_id) AND public.get_user_role(auth.uid()) IN ('owner', 'manager', 'nurse'));
