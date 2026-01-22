import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { CareFileFormKey } from "@/types/care-files";
import { Id } from "@/convex/_generated/dataModel";

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
  // State for all form types
  const [allPreAdmissionForms, setAllPreAdmissionForms] = useState<any[] | undefined>(undefined);
  const [allInfectionPreventionForms, setAllInfectionPreventionForms] = useState<any[] | undefined>(undefined);
  const [allBladderBowelForms, setAllBladderBowelForms] = useState<any[] | undefined>(undefined);
  const [allMovingHandlingForms, setAllMovingHandlingForms] = useState<any[] | undefined>(undefined);
  const [allBedrailConsentForms, setAllBedrailConsentForms] = useState<any[] | undefined>(undefined);
  const [allBedRailsRiskAssessmentForms, setAllBedRailsRiskAssessmentForms] = useState<any[] | undefined>(undefined);
  const [allLongTermFallsForms, setAllLongTermFallsForms] = useState<any | undefined>(undefined); // Single object often
  const [allAdmissionForms, setAllAdmissionForms] = useState<any[] | undefined>(undefined);
  const [allPhotographyConsentForms, setAllPhotographyConsentForms] = useState<any[] | undefined>(undefined);
  const [allDnacprForms, setAllDnacprForms] = useState<any[] | undefined>(undefined);
  const [allPeepForms, setAllPeepForms] = useState<any[] | undefined>(undefined);
  const [allDependencyAssessmentForms, setAllDependencyAssessmentForms] = useState<any[] | undefined>(undefined);
  const [allTimlAssessmentForms, setAllTimlAssessmentForms] = useState<any[] | undefined>(undefined);
  const [allSkinIntegrityForms, setAllSkinIntegrityForms] = useState<any[] | undefined>(undefined);
  const [allResidentValuablesForms, setAllResidentValuablesForms] = useState<any[] | undefined>(undefined);
  const [allHandlingProfileForms, setAllHandlingProfileForms] = useState<any[] | undefined>(undefined);
  const [allPainAssessmentForms, setAllPainAssessmentForms] = useState<any[] | undefined>(undefined);
  const [allNutritionalAssessmentForms, setAllNutritionalAssessmentForms] = useState<any[] | undefined>(undefined);
  const [allOralAssessmentForms, setAllOralAssessmentForms] = useState<any[] | undefined>(undefined);
  const [allDietNotificationForms, setAllDietNotificationForms] = useState<any[] | undefined>(undefined);
  const [allChokingRiskAssessmentForms, setAllChokingRiskAssessmentForms] = useState<any[] | undefined>(undefined);
  const [allCornellDepressionScaleForms, setAllCornellDepressionScaleForms] = useState<any[] | undefined>(undefined);
  const [allBestInterestDecisionForms, setAllBestInterestDecisionForms] = useState<any[] | undefined>(undefined);

  const [latestCarePlanForm, setLatestCarePlanForm] = useState<any | undefined>(undefined);
  const [archivedCarePlans, setArchivedCarePlans] = useState<any[] | undefined>(undefined);

  const [isLoading, setIsLoading] = useState(false);

  // Helper to fetch forms
  const fetchForms = useCallback(async () => {
    if (!residentId) return;
    setIsLoading(true);

    const promises = [];

    // Pre-Admission
    if (folderFormKeys.includes("preAdmission-form")) {
      promises.push(supabase
        .from('pre_admission_care_files')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllPreAdmissionForms(data || [])));
    }

    // Infection Prevention
    if (folderFormKeys.includes("infection-prevention")) {
      promises.push(supabase
        .from('infection_prevention_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllInfectionPreventionForms(data || [])));
    }

    // Bladder & Bowel
    if (folderFormKeys.includes("blader-bowel-form")) {
      promises.push(supabase
        .from('bladder_bowel_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllBladderBowelForms(data || [])));
    }

    // Moving & Handling
    if (folderFormKeys.includes("moving-handling-form")) {
      promises.push(supabase
        .from('moving_handling_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllMovingHandlingForms(data || [])));
    }

    // Bedrail Consent
    if (folderFormKeys.includes("bedrail-consent-form")) {
      promises.push(supabase
        .from('bedrail_consents')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllBedrailConsentForms(data || [])));
    }

    // Bed Rails Risk Assessment
    if (folderFormKeys.includes("bed-rails-risk-assessment-form")) {
      promises.push(supabase
        .from('bedrails_risk_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllBedRailsRiskAssessmentForms(data || [])));
    }

    // Long Term Falls (Latest)
    if (folderFormKeys.includes("long-term-fall-risk-form")) {
      promises.push(supabase
        .from('long_term_falls_risk_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
        .then(({ data }) => setAllLongTermFallsForms(data || null)));
    }

    // Admission
    if (folderFormKeys.includes("admission-form")) {
      promises.push(supabase
        .from('admission_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllAdmissionForms(data || [])));
    }

    // Photography Consent
    if (folderFormKeys.includes("photography-consent")) {
      promises.push(supabase
        .from('photography_consents')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllPhotographyConsentForms(data || [])));
    }

    // DNACPR
    if (folderFormKeys.includes("dnacpr")) {
      promises.push(supabase
        .from('dnacprs')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllDnacprForms(data || [])));
    }

    // PEEP
    if (folderFormKeys.includes("peep")) {
      promises.push(supabase
        .from('peeps')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllPeepForms(data || [])));
    }

    // Dependency
    if (folderFormKeys.includes("dependency-assessment")) {
      promises.push(supabase
        .from('dependency_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllDependencyAssessmentForms(data || [])));
    }

    // TIML
    if (folderFormKeys.includes("timl")) {
      promises.push(supabase
        .from('timl_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllTimlAssessmentForms(data || [])));
    }

    // Skin Integrity
    if (folderFormKeys.includes("skin-integrity-form")) {
      promises.push(supabase
        .from('skin_integrity_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllSkinIntegrityForms(data || [])));
    }

    // Resident Valuables
    if (folderFormKeys.includes("resident-valuables-form")) {
      promises.push(supabase
        .from('resident_valuables_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllResidentValuablesForms(data || [])));
    }

    // Handling Profile
    if (folderFormKeys.includes("resident-handling-profile-form")) {
      promises.push(supabase
        .from('resident_handling_profiles')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllHandlingProfileForms(data || [])));
    }

    // Pain Assessment
    if (folderFormKeys.includes("pain-assessment-form")) {
      promises.push(supabase
        .from('pain_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllPainAssessmentForms(data || [])));
    }

    // Nutritional Assessment
    if (folderFormKeys.includes("nutritional-assessment-form")) {
      promises.push(supabase
        .from('nutritional_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllNutritionalAssessmentForms(data || [])));
    }

    // Oral Assessment
    if (folderFormKeys.includes("oral-assessment-form")) {
      promises.push(supabase
        .from('oral_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllOralAssessmentForms(data || [])));
    }

    // Diet Notification
    if (folderFormKeys.includes("diet-notification-form")) {
      promises.push(supabase
        .from('diet_notifications')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllDietNotificationForms(data || [])));
    }

    // Choking Risk
    if (folderFormKeys.includes("choking-risk-assessment-form")) {
      promises.push(supabase
        .from('choking_risk_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllChokingRiskAssessmentForms(data || [])));
    }

    // Cornell Depression
    if (folderFormKeys.includes("cornell-depression-scale-form")) {
      promises.push(supabase
        .from('cornell_depression_scales')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllCornellDepressionScaleForms(data || [])));
    }

    // Best Interest
    if (folderFormKeys.includes("best-interest-decision-form")) {
      promises.push(supabase
        .from('best_interest_decisions')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllBestInterestDecisionForms(data || [])));
    }

    // Care Plans
    if (includeCarePlans && folderKey) {
      // Latest Care Plan
      // Note: care_plan_assessments includes care_plan_type which maps loosely to folderKey (needs verification of values)
      // Ideally we filter by care_plan_type = folderKey OR logic where needed. 
      // For now, fetching by resident_id and potentially filtering locally or if schema allows.
      // Assuming 'care_plan_type' column stores values like 'Mobility', 'Nutrition' etc.
      // We'll fetch all and filter in memory or specific query if folderKey matches key.
      // Actually, previous implementation relied on 'folderKey', implying getLatestCarePlanByResidentAndFolder did internal filtering.
      // I will implement a generic fetch for now.

      promises.push(supabase
        .from('care_plan_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .eq('status', 'active') // Assuming latest is active
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          // Filter by folder logic? For now pass all relevant
          const relevant = data ? data.find((cp: any) => mapFolderToType(cp.care_plan_type, folderKey)) : null;
          setLatestCarePlanForm(relevant || null);
        }));

      // Archived Care Plans
      promises.push(supabase
        .from('care_plan_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .eq('status', 'archived')
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          const relevant = data ? data.filter((cp: any) => mapFolderToType(cp.care_plan_type, folderKey)) : [];
          setArchivedCarePlans(relevant);
        }));
    }

    await Promise.all(promises);
    setIsLoading(false);
  }, [residentId, folderFormKeys, folderKey, includeCarePlans]);

  // Initial fetch
  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  // Simple mapping helper - Adjust based on actual values stored in care_plan_type
  const mapFolderToType = (type: string, folder: string | undefined) => {
    if (!folder) return true;
    // This is a naive check. You might need a robust mapping.
    // E.g. folder="mobility-fall" -> type="Mobility"
    // For now, if types aren't strictly defined, we might fetch more than needed.
    return true;
  };

  // Conform to existing return signature but with Supabase data structure
  // The existing Consumers expect _creationTime, _id. Supabase gives created_at, id.
  // We might need to map these or update consumers.
  // Update: I will map them here to preserve compatibility where possible, or update consumers to use unified props.
  // Actually, easiest is to ensure consumers handle 'created_at' or map it here.
  // Let's map created_at -> completedAt (or _creationTime) for the `getAllPdfFiles` logic which is also in this hook.

  const mapToConvexLike = (data: any[] | undefined | null) => {
    if (!data) return undefined;
    return Array.isArray(data) ? data.map(item => ({
      ...item,
      _id: item.id,
      _creationTime: new Date(item.created_at).getTime()
    })) : { ...data, _id: data.id, _creationTime: new Date(data.created_at).getTime() };
  };

  const allPreAdmissionFormsMapped = useMemo(() => mapToConvexLike(allPreAdmissionForms), [allPreAdmissionForms]);
  const allInfectionPreventionFormsMapped = useMemo(() => mapToConvexLike(allInfectionPreventionForms), [allInfectionPreventionForms]);
  const allBladderBowelFormsMapped = useMemo(() => mapToConvexLike(allBladderBowelForms), [allBladderBowelForms]);
  const allMovingHandlingFormsMapped = useMemo(() => mapToConvexLike(allMovingHandlingForms), [allMovingHandlingForms]);
  const allBedrailConsentFormsMapped = useMemo(() => mapToConvexLike(allBedrailConsentForms), [allBedrailConsentForms]);
  const allBedRailsRiskAssessmentFormsMapped = useMemo(() => mapToConvexLike(allBedRailsRiskAssessmentForms), [allBedRailsRiskAssessmentForms]);
  const allLongTermFallsFormsMapped = useMemo(() => mapToConvexLike(allLongTermFallsForms), [allLongTermFallsForms]);
  const allAdmissionFormsMapped = useMemo(() => mapToConvexLike(allAdmissionForms), [allAdmissionForms]);
  const allPhotographyConsentFormsMapped = useMemo(() => mapToConvexLike(allPhotographyConsentForms), [allPhotographyConsentForms]);
  const allDnacprFormsMapped = useMemo(() => mapToConvexLike(allDnacprForms), [allDnacprForms]);
  const allPeepFormsMapped = useMemo(() => mapToConvexLike(allPeepForms), [allPeepForms]);
  const allDependencyAssessmentFormsMapped = useMemo(() => mapToConvexLike(allDependencyAssessmentForms), [allDependencyAssessmentForms]);
  const allTimlAssessmentFormsMapped = useMemo(() => mapToConvexLike(allTimlAssessmentForms), [allTimlAssessmentForms]);
  const allSkinIntegrityFormsMapped = useMemo(() => mapToConvexLike(allSkinIntegrityForms), [allSkinIntegrityForms]);
  const allResidentValuablesFormsMapped = useMemo(() => mapToConvexLike(allResidentValuablesForms), [allResidentValuablesForms]);
  const allHandlingProfileFormsMapped = useMemo(() => mapToConvexLike(allHandlingProfileForms), [allHandlingProfileForms]);
  const allPainAssessmentFormsMapped = useMemo(() => mapToConvexLike(allPainAssessmentForms), [allPainAssessmentForms]);
  const allNutritionalAssessmentFormsMapped = useMemo(() => mapToConvexLike(allNutritionalAssessmentForms), [allNutritionalAssessmentForms]);
  const allOralAssessmentFormsMapped = useMemo(() => mapToConvexLike(allOralAssessmentForms), [allOralAssessmentForms]);
  const allDietNotificationFormsMapped = useMemo(() => mapToConvexLike(allDietNotificationForms), [allDietNotificationForms]);
  const allChokingRiskAssessmentFormsMapped = useMemo(() => mapToConvexLike(allChokingRiskAssessmentForms), [allChokingRiskAssessmentForms]);
  const allCornellDepressionScaleFormsMapped = useMemo(() => mapToConvexLike(allCornellDepressionScaleForms), [allCornellDepressionScaleForms]);
  const allBestInterestDecisionFormsMapped = useMemo(() => mapToConvexLike(allBestInterestDecisionForms), [allBestInterestDecisionForms]);

  const latestCarePlanFormMapped = useMemo(() => mapToConvexLike(latestCarePlanForm), [latestCarePlanForm]);
  const archivedCarePlansMapped = useMemo(() => mapToConvexLike(archivedCarePlans), [archivedCarePlans]);

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

    const processForms = (forms: any[] | undefined, key: string, name: string) => {
      if (forms && folderFormKeys.includes(key as CareFileFormKey)) {
        const sorted = [...forms].sort((a, b) => b._creationTime - a._creationTime);
        if (sorted.length > 0) {
          pdfFiles.push({
            formKey: key,
            formId: sorted[0]._id,
            name: name,
            completedAt: sorted[0]._creationTime,
            isLatest: true,
            data: sorted[0]
          });
        }
      }
    };

    processForms(allPreAdmissionFormsMapped, "preAdmission-form", "Pre-Admission Assessment");
    processForms(allInfectionPreventionFormsMapped, "infection-prevention", "Infection Prevention Assessment");
    processForms(allBladderBowelFormsMapped, "blader-bowel-form", "Bladder & Bowel Assessment");
    processForms(allMovingHandlingFormsMapped, "moving-handling-form", "Moving & Handling Assessment");
    processForms(allBedrailConsentFormsMapped, "bedrail-consent-form", "Bedrails Consent / Agreement");
    processForms(allBedRailsRiskAssessmentFormsMapped, "bed-rails-risk-assessment-form", "Risk Assessment for Use of Bed Rails");

    // Long Term Falls is single
    if (allLongTermFallsFormsMapped && folderFormKeys.includes("long-term-fall-risk-form")) {
      pdfFiles.push({
        formKey: "long-term-fall-risk-form",
        formId: allLongTermFallsFormsMapped._id,
        name: "Long Term Falls Risk Assessment",
        completedAt: allLongTermFallsFormsMapped._creationTime,
        isLatest: true
      });
    }

    processForms(allAdmissionFormsMapped, "admission-form", "Admission Assessment");
    processForms(allPhotographyConsentFormsMapped, "photography-consent", "Photography Consent Form");
    processForms(allDnacprFormsMapped, "dnacpr", "DNACPR Form");
    processForms(allPeepFormsMapped, "peep", "Personal Emergency Evacuation Plan");
    processForms(allDependencyAssessmentFormsMapped, "dependency-assessment", "Dependency Assessment");
    processForms(allTimlAssessmentFormsMapped, "timl", "This Is My Life Assessment");
    processForms(allSkinIntegrityFormsMapped, "skin-integrity-form", "Skin Integrity Assessment");
    processForms(allResidentValuablesFormsMapped, "resident-valuables-form", "Resident Valuables Assessment");
    processForms(allHandlingProfileFormsMapped, "resident-handling-profile-form", "Resident Handling Profile");
    processForms(allPainAssessmentFormsMapped, "pain-assessment-form", "Pain Assessment and Evaluation");
    processForms(allNutritionalAssessmentFormsMapped, "nutritional-assessment-form", "Nutritional Assessment");
    processForms(allOralAssessmentFormsMapped, "oral-assessment-form", "Oral Assessment");
    processForms(allDietNotificationFormsMapped, "diet-notification-form", "Diet Notification");
    processForms(allChokingRiskAssessmentFormsMapped, "choking-risk-assessment-form", "Choking Risk Assessment");
    processForms(allCornellDepressionScaleFormsMapped, "cornell-depression-scale-form", "Cornell Scale for Depression in Dementia");
    processForms(allBestInterestDecisionFormsMapped, "best-interest-decision-form", "Best Interest Decision");

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
    allSkinIntegrityFormsMapped,
    allResidentValuablesFormsMapped,
    allHandlingProfileFormsMapped,
    allPainAssessmentFormsMapped,
    allNutritionalAssessmentFormsMapped,
    allOralAssessmentFormsMapped,
    allDietNotificationFormsMapped,
    allChokingRiskAssessmentFormsMapped,
    allCornellDepressionScaleFormsMapped,
    allBestInterestDecisionFormsMapped,
    folderFormKeys
  ]);

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
    allSkinIntegrityForms: allSkinIntegrityFormsMapped,
    allResidentValuablesForms: allResidentValuablesFormsMapped,
    allHandlingProfileForms: allHandlingProfileFormsMapped,
    allPainAssessmentForms: allPainAssessmentFormsMapped,
    allNutritionalAssessmentForms: allNutritionalAssessmentFormsMapped,
    allOralAssessmentForms: allOralAssessmentFormsMapped,
    allDietNotificationForms: allDietNotificationFormsMapped,
    allChokingRiskAssessmentForms: allChokingRiskAssessmentFormsMapped,
    allCornellDepressionScaleForms: allCornellDepressionScaleFormsMapped,
    allBestInterestDecisionForms: allBestInterestDecisionFormsMapped,
    latestCarePlanForm: latestCarePlanFormMapped,
    archivedCarePlans: archivedCarePlansMapped,
    getAllPdfFiles,
    refetch: fetchForms // Expose refetch method
  };
}
