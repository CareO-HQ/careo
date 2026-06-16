import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { CareFileFormKey } from "@/types/care-files";

const FORM_TABLE_REGISTRY: Partial<Record<CareFileFormKey, string>> = {
  "preAdmission-form": "pre_admission_care_files",
  "infection-prevention": "infection_prevention_assessments",
  "blader-bowel-form": "bladder_bowel_assessments",
  "moving-handling-form": "moving_handling_assessments",
  "bedrail-consent-form": "bedrail_consents",
  "bed-rails-risk-assessment-form": "bedrails_risk_assessments",
  "long-term-fall-risk-form": "long_term_falls_risk_assessments",
  "admission-form": "admission_assessments",
  "photography-consent": "photography_consents",
  "dnacpr": "dnacprs",
  "peep": "peeps",
  "dependency-assessment": "dependency_assessments",
  "timl": "timl_assessments",
  "resident-valuables-form": "resident_valuables_assessments",
  "resident-handling-profile-form": "handling_profiles",
  "pain-assessment-form": "pain_assessments",
  "nutritional-assessment-form": "nutritional_assessments",
  "oral-assessment-form": "oral_assessments",
  "diet-notification-form": "diet_notifications",
  "choking-risk-assessment-form": "choking_risk_assessments",
  "cornell-depression-scale-form": "cornell_depression_scales",
  "best-interest-decision-form": "best_interest_decisions",
  "braden-risk-assessment-form": "braden_risk_assessments",
  "v2-restraints-risk": "restraints_consents",
  "fall-risk-assessment": "fall_risk_assessments",
  "smoking-risk-assessment": "smoking_risk_assessments",
  "v2-specimen-log": "specimen_records",
  "v2-capacity-consent": "capacity_consents",
  "v2-night-obs-consent": "night_observation_consents",
  "v2-general-risk": "general_risk_assessments",
  "v2-personal-profile": "personal_profiles",
  "v2-abbey-pain": "abbey_pain_assessments"
};

interface UseFolderFormsProps {
  residentId: string | undefined; // Changed from Id<"residents"> to string for Supabase
  folderFormKeys: CareFileFormKey[];
  organizationId?: string;
  folderKey?: string;
  includeCarePlans?: boolean;
}

export function useFolderForms({
  residentId,
  folderFormKeys,
  organizationId,
  folderKey,
  includeCarePlans = false
}: UseFolderFormsProps) {
  // Centralized state dictionary for dynamic forms
  const [formsState, setFormsState] = useState<Record<string, any[] | undefined>>({});
  const [activeCarePlanForms, setActiveCarePlanForms] = useState<any[] | undefined>(undefined);
  const [archivedCarePlans, setArchivedCarePlans] = useState<any[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all care plans once (not dependent on folderKey)
  const fetchAllCarePlans = useCallback(async () => {
    if (!residentId || !includeCarePlans) return;
    setIsLoading(true);

    try {
      // Fetch latest active care plans
      const { data: activePlans } = await supabase
        .from('care_plan_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      setActiveCarePlanForms(activePlans || []);

      // Fetch archived care plans
      const { data: archivedPlans } = await supabase
        .from('care_plan_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .eq('status', 'archived')
        .order('created_at', { ascending: false });

      setArchivedCarePlans(archivedPlans || []);
    } catch (error) {
      console.error("Error fetching care plans:", error);
      setActiveCarePlanForms([]);
      setArchivedCarePlans([]);
    } finally {
      setIsLoading(false);
    }
  }, [residentId, includeCarePlans]);

  // Serialize keys to prevent fetchForms ref change loop
  const serializedFormKeys = useMemo(() => {
    return (folderFormKeys || []).join(",");
  }, [folderFormKeys]);

  // Dynamic fetchForms utilizing table registry
  const fetchForms = useCallback(async () => {
    if (!residentId) return;
    setIsLoading(true);

    try {
      const activeKeys = (folderFormKeys || []).filter(key => FORM_TABLE_REGISTRY[key]);
      const promises = activeKeys.map(async (key) => {
        const table = FORM_TABLE_REGISTRY[key];
        if (!table) return { key, data: [] };
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('resident_id', residentId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error(`Error fetching form data for key "${key}" from table "${table}":`, error);
          return { key, data: [] };
        }
        return { key, data: data || [] };
      });

      const results = await Promise.all(promises);
      setFormsState(prev => {
        const nextState = { ...prev };
        results.forEach(res => {
          nextState[res.key] = res.data;
        });
        return nextState;
      });
    } catch (error) {
      console.error("Error batch fetching folder forms:", error);
    } finally {
      setIsLoading(false);
    }
  }, [residentId, serializedFormKeys]);

  // Initial fetch
  useEffect(() => {
    if (!residentId) return;
    fetchForms();
  }, [residentId, fetchForms]);

  // Fetch care plans separately without folderKey dependency to avoid infinite loops
  useEffect(() => {
    fetchAllCarePlans();
  }, [fetchAllCarePlans]);

  // Conform to existing return signature but with Supabase data structure
  // The existing Consumers expect _creationTime, _id. Supabase gives created_at, id.
  // We map them here to preserve compatibility.
  const mapToConvexLike = (data: any[] | any | undefined | null) => {
    if (!data) return undefined;
    if (Array.isArray(data)) {
      return data.map(item => ({
        ...item,
        _id: item.id,
        _creationTime: new Date(item.created_at).getTime()
      }));
    }
    // Ensure data is an object before spreading
    if (typeof data === 'object' && data !== null) {
      return { ...data, _id: data.id, _creationTime: new Date(data.created_at).getTime() };
    }
    return undefined;
  };

  const allPreAdmissionFormsMapped = useMemo(() => mapToConvexLike(formsState["preAdmission-form"]), [formsState]);
  const allInfectionPreventionFormsMapped = useMemo(() => mapToConvexLike(formsState["infection-prevention"]), [formsState]);
  const allBladderBowelFormsMapped = useMemo(() => mapToConvexLike(formsState["blader-bowel-form"]), [formsState]);
  const allMovingHandlingFormsMapped = useMemo(() => mapToConvexLike(formsState["moving-handling-form"]), [formsState]);
  const allBedrailConsentFormsMapped = useMemo(() => mapToConvexLike(formsState["bedrail-consent-form"]), [formsState]);
  const allBedRailsRiskAssessmentFormsMapped = useMemo(() => mapToConvexLike(formsState["bed-rails-risk-assessment-form"]), [formsState]);
  const allLongTermFallsFormsMapped = useMemo(() => mapToConvexLike(formsState["long-term-fall-risk-form"]), [formsState]);
  const allAdmissionFormsMapped = useMemo(() => mapToConvexLike(formsState["admission-form"]), [formsState]);
  const allPhotographyConsentFormsMapped = useMemo(() => mapToConvexLike(formsState["photography-consent"]), [formsState]);
  const allDnacprFormsMapped = useMemo(() => mapToConvexLike(formsState["dnacpr"]), [formsState]);
  const allPeepFormsMapped = useMemo(() => mapToConvexLike(formsState["peep"]), [formsState]);
  const allDependencyAssessmentFormsMapped = useMemo(() => mapToConvexLike(formsState["dependency-assessment"]), [formsState]);
  const allTimlAssessmentFormsMapped = useMemo(() => mapToConvexLike(formsState["timl"]), [formsState]);
  const allResidentValuablesFormsMapped = useMemo(() => mapToConvexLike(formsState["resident-valuables-form"]), [formsState]);
  const allHandlingProfileFormsMapped = useMemo(() => mapToConvexLike(formsState["resident-handling-profile-form"]), [formsState]);
  const allPainAssessmentFormsMapped = useMemo(() => mapToConvexLike(formsState["pain-assessment-form"]), [formsState]);
  const allNutritionalAssessmentFormsMapped = useMemo(() => mapToConvexLike(formsState["nutritional-assessment-form"]), [formsState]);
  const allOralAssessmentFormsMapped = useMemo(() => mapToConvexLike(formsState["oral-assessment-form"]), [formsState]);
  const allDietNotificationFormsMapped = useMemo(() => mapToConvexLike(formsState["diet-notification-form"]), [formsState]);
  const allChokingRiskAssessmentFormsMapped = useMemo(() => mapToConvexLike(formsState["choking-risk-assessment-form"]), [formsState]);
  const allCornellDepressionScaleFormsMapped = useMemo(() => mapToConvexLike(formsState["cornell-depression-scale-form"]), [formsState]);
  const allBestInterestDecisionFormsMapped = useMemo(() => mapToConvexLike(formsState["best-interest-decision-form"]), [formsState]);
  const allBradenRiskAssessmentFormsMapped = useMemo(() => mapToConvexLike(formsState["braden-risk-assessment-form"]), [formsState]);
  const allRestraintsRiskFormsMapped = useMemo(() => mapToConvexLike(formsState["v2-restraints-risk"]), [formsState]);
  const allFallRiskAssessmentFormsMapped = useMemo(() => mapToConvexLike(formsState["fall-risk-assessment"]), [formsState]);
  const allSmokingRiskAssessmentFormsMapped = useMemo(() => mapToConvexLike(formsState["smoking-risk-assessment"]), [formsState]);
  const allSpecimenLogFormsMapped = useMemo(() => mapToConvexLike(formsState["v2-specimen-log"]), [formsState]);
  const allCapacityConsentsFormsMapped = useMemo(() => mapToConvexLike(formsState["v2-capacity-consent"]), [formsState]);
  const allNightObservationFormsMapped = useMemo(() => mapToConvexLike(formsState["v2-night-obs-consent"]), [formsState]);
  const allGeneralRiskFormsMapped = useMemo(() => mapToConvexLike(formsState["v2-general-risk"]), [formsState]);
  const allPersonalProfileFormsMapped = useMemo(() => mapToConvexLike(formsState["v2-personal-profile"]), [formsState]);
  const allAbbeyPainFormsMapped = useMemo(() => mapToConvexLike(formsState["v2-abbey-pain"]), [formsState]);

  const latestPersonalProfileForm = useMemo(() => 
    allPersonalProfileFormsMapped && allPersonalProfileFormsMapped.length > 0 
      ? allPersonalProfileFormsMapped[0] 
      : undefined
  , [allPersonalProfileFormsMapped]);

  const activeCarePlanFormsMapped = useMemo(() => mapToConvexLike(activeCarePlanForms), [activeCarePlanForms]);
  const archivedCarePlansMapped = useMemo(() => mapToConvexLike(archivedCarePlans), [archivedCarePlans]);

  // Filter care plans by folderKey in useMemo to avoid infinite loops
  const filteredActiveCarePlans = useMemo(() => {
    if (!activeCarePlanForms || !folderKey) return [];
    return activeCarePlanForms.filter((cp: any) => {
      const savedFolderKey = cp.goals?.folderKey || cp.folder_key;
      // Match if the saved folderKey equals the current folderKey, OR
      // if no folderKey was saved at all (legacy data), show in all folders is too broad,
      // so only match if it explicitly matches.
      return savedFolderKey === folderKey;
    });
  }, [activeCarePlanForms, folderKey]);

  const filteredArchivedCarePlans = useMemo(() => {
    if (!archivedCarePlans || !folderKey) return [];
    return archivedCarePlans.filter((cp: any) => {
      const savedFolderKey = cp.goals?.folderKey || cp.folder_key;
      return savedFolderKey === folderKey;
    });
  }, [archivedCarePlans, folderKey]);

  const filteredActiveCarePlansMapped = useMemo(() => mapToConvexLike(filteredActiveCarePlans), [filteredActiveCarePlans]);
  const filteredArchivedCarePlansMapped = useMemo(() => mapToConvexLike(filteredArchivedCarePlans), [filteredArchivedCarePlans]);

  // Unified File List
  const getAllPdfFiles = useMemo(() => {
    const pdfFiles: Array<{
      formKey: string;
      formId: string;
      name: string;
      url?: string;
      completedAt: number;
      isLatest: boolean;
      data?: any; // Include full data reference if needed
    }> = [];

    const processForms = (forms: any[] | undefined, key: string, name: string, forceInclude = false) => {
      if (forms && (folderFormKeys.includes(key as CareFileFormKey) || forceInclude)) {
        const sorted = [...forms].sort((a, b) => b._creationTime - a._creationTime);
        sorted.forEach((form, index) => {
          // Use care_plan_type or nameOfCarePlan if available for care plans, otherwise use the provided name
          const displayName = (key === "care-plan-form")
            ? (form.care_plan_type || form.nameOfCarePlan || name)
            : name;

          pdfFiles.push({
            formKey: key,
            formId: form._id,
            name: `${displayName}${index > 0 ? ` (Version ${sorted.length - index})` : ''}`,
            completedAt: form._creationTime,
            isLatest: index === 0,
            data: form
          });
        });
      }
    };

    processForms(allPreAdmissionFormsMapped, "preAdmission-form", "Pre-Admission Assessment");
    processForms(allInfectionPreventionFormsMapped, "infection-prevention", "Infection Prevention Assessment");
    processForms(allBladderBowelFormsMapped, "blader-bowel-form", "Bladder & Bowel Assessment");
    processForms(allMovingHandlingFormsMapped, "moving-handling-form", "Moving & Handling Assessment");
    processForms(allBedrailConsentFormsMapped, "bedrail-consent-form", "Bedrails Consent / Agreement");
    processForms(allBedRailsRiskAssessmentFormsMapped, "bed-rails-risk-assessment-form", "Risk Assessment for Use of Bed Rails");
    processForms(allLongTermFallsFormsMapped, "long-term-fall-risk-form", "Long Term Falls Risk Assessment");
    processForms(allAdmissionFormsMapped, "admission-form", "Admission Assessment");
    processForms(allPhotographyConsentFormsMapped, "photography-consent", "Photography Consent Form");
    processForms(allDnacprFormsMapped, "dnacpr", "DNACPR Form");
    processForms(allPeepFormsMapped, "peep", "Personal Emergency Evacuation Plan");
    processForms(allDependencyAssessmentFormsMapped, "dependency-assessment", "Dependency Assessment");
    processForms(allTimlAssessmentFormsMapped, "timl", "This Is My Life Assessment");
    processForms(allResidentValuablesFormsMapped, "resident-valuables-form", "Resident Valuables Assessment");
    processForms(allHandlingProfileFormsMapped, "resident-handling-profile-form", "Resident Handling Profile");
    processForms(allPainAssessmentFormsMapped, "pain-assessment-form", "Pain Assessment and Evaluation");
    processForms(allNutritionalAssessmentFormsMapped, "nutritional-assessment-form", "Nutritional Assessment");
    processForms(allOralAssessmentFormsMapped, "oral-assessment-form", "Oral Assessment");
    processForms(allDietNotificationFormsMapped, "diet-notification-form", "Diet Notification");
    processForms(allChokingRiskAssessmentFormsMapped, "choking-risk-assessment-form", "Choking Risk Assessment");
    processForms(allCornellDepressionScaleFormsMapped, "cornell-depression-scale-form", "Cornell Scale for Depression in Dementia");
    processForms(allBestInterestDecisionFormsMapped, "best-interest-decision-form", "Best Interest Decision");
    processForms(allBradenRiskAssessmentFormsMapped, "braden-risk-assessment-form", "Braden Risk Assessment");
    processForms(allRestraintsRiskFormsMapped, "v2-restraints-risk", "Consent and Risk Assessment for Restraints");
    processForms(allFallRiskAssessmentFormsMapped, "fall-risk-assessment", "Fall Risk Assessment");
    processForms(allSmokingRiskAssessmentFormsMapped, "smoking-risk-assessment", "Smoking Risk Assessment");
    processForms(allSpecimenLogFormsMapped, "v2-specimen-log", "Specimen Record Log");
    processForms(allCapacityConsentsFormsMapped, "v2-capacity-consent", "Capacity & Consent Assessment");
    processForms(allNightObservationFormsMapped, "v2-night-obs-consent", "Night Observation Consent");
    processForms(allPersonalProfileFormsMapped, "v2-personal-profile", "Personal Profile");
    processForms(allAbbeyPainFormsMapped, "v2-abbey-pain", "Abbey Pain Tool");

    // Process Care Plans
    if (includeCarePlans) {
      const allCarePlans: any[] = [];
      if (filteredActiveCarePlansMapped && filteredActiveCarePlansMapped.length > 0) {
        allCarePlans.push(...filteredActiveCarePlansMapped);
      }
      if (filteredArchivedCarePlansMapped && filteredArchivedCarePlansMapped.length > 0) {
        allCarePlans.push(...filteredArchivedCarePlansMapped);
      }
      // If we have any care plans, process them
      if (allCarePlans.length > 0) {
        processForms(allCarePlans, "care-plan-form", "Care Plan", true);
      }
    }

    return pdfFiles.sort((a, b) => b.completedAt - a.completedAt);

  }, [
    allPreAdmissionFormsMapped,
    allInfectionPreventionFormsMapped,
    allBladderBowelFormsMapped,
    allMovingHandlingFormsMapped,
    allBedrailConsentFormsMapped,
    allBedRailsRiskAssessmentFormsMapped,
    allLongTermFallsFormsMapped,
    allAdmissionFormsMapped,
    allPhotographyConsentFormsMapped,
    allDnacprFormsMapped,
    allPeepFormsMapped,
    allDependencyAssessmentFormsMapped,
    allTimlAssessmentFormsMapped,
    allResidentValuablesFormsMapped,
    allHandlingProfileFormsMapped,
    allPainAssessmentFormsMapped,
    allNutritionalAssessmentFormsMapped,
    allOralAssessmentFormsMapped,
    allDietNotificationFormsMapped,
    allChokingRiskAssessmentFormsMapped,
    allCornellDepressionScaleFormsMapped,
    allBestInterestDecisionFormsMapped,
    allBradenRiskAssessmentFormsMapped,
    allRestraintsRiskFormsMapped,
    allFallRiskAssessmentFormsMapped,
    allSmokingRiskAssessmentFormsMapped,
    allSpecimenLogFormsMapped,
    allCapacityConsentsFormsMapped,
    allNightObservationFormsMapped,
    allGeneralRiskFormsMapped,
    allPersonalProfileFormsMapped,
    allAbbeyPainFormsMapped,
    filteredActiveCarePlansMapped,
    filteredArchivedCarePlansMapped,
    folderFormKeys
  ]);

  const handleRefetch = useCallback(async () => {
    await Promise.all([
      fetchForms(),
      fetchAllCarePlans()
    ]);
  }, [fetchForms, fetchAllCarePlans]);

  return {
    allPreAdmissionForms: allPreAdmissionFormsMapped,
    allInfectionPreventionForms: allInfectionPreventionFormsMapped,
    allBladderBowelForms: allBladderBowelFormsMapped,
    allMovingHandlingForms: allMovingHandlingFormsMapped,
    allBedrailConsentForms: allBedrailConsentFormsMapped,
    allLongTermFallsForms: allLongTermFallsFormsMapped,
    allAdmissionForms: allAdmissionFormsMapped,
    allPhotographyConsentForms: allPhotographyConsentFormsMapped,
    allDnacprForms: allDnacprFormsMapped,
    allPeepForms: allPeepFormsMapped,
    allDependencyAssessmentForms: allDependencyAssessmentFormsMapped,
    allTimlAssessmentForms: allTimlAssessmentFormsMapped,
    allResidentValuablesForms: allResidentValuablesFormsMapped,
    allHandlingProfileForms: allHandlingProfileFormsMapped,
    allPainAssessmentForms: allPainAssessmentFormsMapped,
    allNutritionalAssessmentForms: allNutritionalAssessmentFormsMapped,
    allOralAssessmentForms: allOralAssessmentFormsMapped,
    allDietNotificationForms: allDietNotificationFormsMapped,
    allChokingRiskAssessmentForms: allChokingRiskAssessmentFormsMapped,
    allCornellDepressionScaleForms: allCornellDepressionScaleFormsMapped,
    allBestInterestDecisionForms: allBestInterestDecisionFormsMapped,
    allBradenRiskAssessmentForms: allBradenRiskAssessmentFormsMapped,
    allRestraintsRiskForms: allRestraintsRiskFormsMapped,
    allFallRiskAssessmentForms: allFallRiskAssessmentFormsMapped,
    allSmokingRiskAssessmentForms: allSmokingRiskAssessmentFormsMapped,
    allSpecimenLogForms: allSpecimenLogFormsMapped,
    allCapacityConsentsForms: allCapacityConsentsFormsMapped,
    allNightObservationForms: allNightObservationFormsMapped,
    allGeneralRiskForms: allGeneralRiskFormsMapped,
    allPersonalProfileForms: allPersonalProfileFormsMapped,
    allAbbeyPainForms: allAbbeyPainFormsMapped,
    latestPersonalProfileForm: latestPersonalProfileForm,
    allBedRailsRiskAssessmentForms: allBedRailsRiskAssessmentFormsMapped,
    activeCarePlanForms: filteredActiveCarePlansMapped,
    latestCarePlanForm: filteredActiveCarePlansMapped && filteredActiveCarePlansMapped.length > 0 ? filteredActiveCarePlansMapped[0] : null,
    archivedCarePlans: filteredArchivedCarePlansMapped,
    getAllPdfFiles,
    isLoading,
    refetch: handleRefetch // Expose combined refetch method
  };
}
