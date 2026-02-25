import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { CareFileFormKey } from "@/types/care-files";

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

  // Helper to fetch forms - no longer needed as it's handled inline in useEffect
  // Keeping fetchForms available for manual refetch if needed in future
  const fetchForms = useCallback(async () => {
    if (!residentId) return;
    setIsLoading(true);
    const promises: PromiseLike<any>[] = [];

    // Pre-Admission
    if (folderFormKeys?.includes("preAdmission-form")) {
      promises.push(supabase
        .from('pre_admission_care_files')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllPreAdmissionForms(data || [])));
    }

    // Infection Prevention
    if (folderFormKeys?.includes("infection-prevention")) {
      promises.push(supabase
        .from('infection_prevention_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllInfectionPreventionForms(data || [])));
    }

    // Bladder & Bowel
    if (folderFormKeys?.includes("blader-bowel-form")) {
      promises.push(supabase
        .from('bladder_bowel_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllBladderBowelForms(data || [])));
    }

    // Moving & Handling
    if (folderFormKeys?.includes("moving-handling-form")) {
      promises.push(supabase
        .from('moving_handling_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllMovingHandlingForms(data || [])));
    }

    // Bedrail Consent
    if (folderFormKeys?.includes("bedrail-consent-form")) {
      promises.push(supabase
        .from('bedrail_consents')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllBedrailConsentForms(data || [])));
    }

    // Bed Rails Risk Assessment
    if (folderFormKeys?.includes("bed-rails-risk-assessment-form")) {
      promises.push(supabase
        .from('bedrails_risk_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllBedRailsRiskAssessmentForms(data || [])));
    }

    // Long Term Falls
    if (folderFormKeys?.includes("long-term-fall-risk-form")) {
      promises.push(supabase
        .from('long_term_falls_risk_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllLongTermFallsForms(data || [])));
    }

    // Admission
    if (folderFormKeys?.includes("admission-form")) {
      promises.push(supabase
        .from('admission_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllAdmissionForms(data || [])));
    }

    // Photography Consent
    if (folderFormKeys?.includes("photography-consent")) {
      promises.push(supabase
        .from('photography_consents')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllPhotographyConsentForms(data || [])));
    }

    // DNACPR
    if (folderFormKeys?.includes("dnacpr")) {
      promises.push(supabase
        .from('dnacprs')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllDnacprForms(data || [])));
    }

    // PEEP
    if (folderFormKeys?.includes("peep")) {
      promises.push(supabase
        .from('peeps')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllPeepForms(data || [])));
    }

    // Dependency Assessment
    if (folderFormKeys?.includes("dependency-assessment")) {
      promises.push(supabase
        .from('dependency_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllDependencyAssessmentForms(data || [])));
    }

    // TIML Assessment
    if (folderFormKeys?.includes("timl")) {
      promises.push(supabase
        .from('timl_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllTimlAssessmentForms(data || [])));
    }

    // Skin Integrity
    if (folderFormKeys?.includes("skin-integrity-form")) {
      promises.push(supabase
        .from('skin_integrity_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllSkinIntegrityForms(data || [])));
    }

    // Resident Valuables
    if (folderFormKeys?.includes("resident-valuables-form")) {
      promises.push(supabase
        .from('resident_valuables_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllResidentValuablesForms(data || [])));
    }

    // Handling Profiles
    if (folderFormKeys?.includes("resident-handling-profile-form")) {
      promises.push(supabase
        .from('handling_profiles')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllHandlingProfileForms(data || [])));
    }

    // Pain Assessment
    if (folderFormKeys?.includes("pain-assessment-form")) {
      promises.push(supabase
        .from('pain_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllPainAssessmentForms(data || [])));
    }

    // Nutritional Assessment
    if (folderFormKeys?.includes("nutritional-assessment-form")) {
      promises.push(supabase
        .from('nutritional_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllNutritionalAssessmentForms(data || [])));
    }

    // Oral Assessment
    if (folderFormKeys?.includes("oral-assessment-form")) {
      promises.push(supabase
        .from('oral_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllOralAssessmentForms(data || [])));
    }

    // Diet Notification
    if (folderFormKeys?.includes("diet-notification-form")) {
      promises.push(supabase
        .from('diet_notifications')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllDietNotificationForms(data || [])));
    }

    // Choking Risk
    if (folderFormKeys?.includes("choking-risk-assessment-form")) {
      promises.push(supabase
        .from('choking_risk_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllChokingRiskAssessmentForms(data || [])));
    }

    // Cornell Depression
    if (folderFormKeys?.includes("cornell-depression-scale-form")) {
      promises.push(supabase
        .from('cornell_depression_scales')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllCornellDepressionScaleForms(data || [])));
    }

    // Best Interest
    if (folderFormKeys?.includes("best-interest-decision-form")) {
      promises.push(supabase
        .from('best_interest_decisions')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllBestInterestDecisionForms(data || [])));
    }

    // Care Plans
    if (includeCarePlans && folderKey) {
      // Fetch is handled in separate fetchAllCarePlans effect
    }

    await Promise.all(promises);
    setIsLoading(false);
  }, [residentId]);

  // Initial fetch - call directly instead of using fetchForms as dependency
  useEffect(() => {
    if (!residentId) return;

    setIsLoading(true);
    const promises: PromiseLike<any>[] = [];

    // Pre-Admission
    if (folderFormKeys?.includes("preAdmission-form")) {
      promises.push(supabase
        .from('pre_admission_care_files')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllPreAdmissionForms(data || [])));
    }

    // Infection Prevention
    if (folderFormKeys?.includes("infection-prevention")) {
      promises.push(supabase
        .from('infection_prevention_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllInfectionPreventionForms(data || [])));
    }

    // Bladder & Bowel
    if (folderFormKeys?.includes("blader-bowel-form")) {
      promises.push(supabase
        .from('bladder_bowel_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllBladderBowelForms(data || [])));
    }

    // Moving & Handling
    if (folderFormKeys?.includes("moving-handling-form")) {
      promises.push(supabase
        .from('moving_handling_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllMovingHandlingForms(data || [])));
    }

    // Bedrail Consent
    if (folderFormKeys?.includes("bedrail-consent-form")) {
      promises.push(supabase
        .from('bedrail_consents')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllBedrailConsentForms(data || [])));
    }

    // Bed Rails Risk Assessment
    if (folderFormKeys?.includes("bed-rails-risk-assessment-form")) {
      promises.push(supabase
        .from('bedrails_risk_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllBedRailsRiskAssessmentForms(data || [])));
    }

    // Long Term Falls
    if (folderFormKeys?.includes("long-term-fall-risk-form")) {
      promises.push(supabase
        .from('long_term_falls_risk_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllLongTermFallsForms(data || [])));
    }

    // Admission
    if (folderFormKeys?.includes("admission-form")) {
      promises.push(supabase
        .from('admission_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllAdmissionForms(data || [])));
    }

    // Photography Consent
    if (folderFormKeys?.includes("photography-consent")) {
      promises.push(supabase
        .from('photography_consents')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllPhotographyConsentForms(data || [])));
    }

    // DNACPR
    if (folderFormKeys?.includes("dnacpr")) {
      promises.push(supabase
        .from('dnacprs')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllDnacprForms(data || [])));
    }

    // PEEP
    if (folderFormKeys?.includes("peep")) {
      promises.push(supabase
        .from('peeps')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllPeepForms(data || [])));
    }

    // Dependency Assessment
    if (folderFormKeys?.includes("dependency-assessment")) {
      promises.push(supabase
        .from('dependency_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllDependencyAssessmentForms(data || [])));
    }

    // TIML Assessment
    if (folderFormKeys?.includes("timl")) {
      promises.push(supabase
        .from('timl_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllTimlAssessmentForms(data || [])));
    }

    // Skin Integrity
    if (folderFormKeys?.includes("skin-integrity-form")) {
      promises.push(supabase
        .from('skin_integrity_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllSkinIntegrityForms(data || [])));
    }

    // Resident Valuables
    if (folderFormKeys?.includes("resident-valuables-form")) {
      promises.push(supabase
        .from('resident_valuables_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllResidentValuablesForms(data || [])));
    }

    // Handling Profiles
    if (folderFormKeys?.includes("resident-handling-profile-form")) {
      promises.push(supabase
        .from('handling_profiles')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllHandlingProfileForms(data || [])));
    }

    // Pain Assessment
    if (folderFormKeys?.includes("pain-assessment-form")) {
      promises.push(supabase
        .from('pain_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllPainAssessmentForms(data || [])));
    }

    // Nutritional Assessment
    if (folderFormKeys?.includes("nutritional-assessment-form")) {
      promises.push(supabase
        .from('nutritional_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllNutritionalAssessmentForms(data || [])));
    }

    // Oral Assessment
    if (folderFormKeys?.includes("oral-assessment-form")) {
      promises.push(supabase
        .from('oral_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllOralAssessmentForms(data || [])));
    }

    // Diet Notification
    if (folderFormKeys?.includes("diet-notification-form")) {
      promises.push(supabase
        .from('diet_notifications')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllDietNotificationForms(data || [])));
    }

    // Choking Risk
    if (folderFormKeys?.includes("choking-risk-assessment-form")) {
      promises.push(supabase
        .from('choking_risk_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllChokingRiskAssessmentForms(data || [])));
    }

    // Cornell Depression
    if (folderFormKeys?.includes("cornell-depression-scale-form")) {
      promises.push(supabase
        .from('cornell_depression_scales')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllCornellDepressionScaleForms(data || [])));
    }

    // Best Interest
    if (folderFormKeys?.includes("best-interest-decision-form")) {
      promises.push(supabase
        .from('best_interest_decisions')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllBestInterestDecisionForms(data || [])));
    }

    Promise.all(promises).finally(() => setIsLoading(false));
  }, [residentId]);

  // Fetch care plans separately without folderKey dependency to avoid infinite loops
  useEffect(() => {
    fetchAllCarePlans();
  }, [fetchAllCarePlans]);

  // Conform to existing return signature but with Supabase data structure
  // The existing Consumers expect _creationTime, _id. Supabase gives created_at, id.
  // We might need to map these or update consumers.
  // Update: I will map them here to preserve compatibility where possible, or update consumers to use unified props.
  // Actually, easiest is to ensure consumers handle 'created_at' or map it here.
  // Let's map created_at -> completedAt (or _creationTime) for the `getAllPdfFiles` logic which is also in this hook.

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
      // Special case for skin integrity key change
      if (folderKey === "skin-integrity" && (savedFolderKey === "skin entry" || savedFolderKey === "skin integrity")) return true;
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
    activeCarePlanForms: filteredActiveCarePlansMapped,
    latestCarePlanForm: filteredActiveCarePlansMapped && filteredActiveCarePlansMapped.length > 0 ? filteredActiveCarePlansMapped[0] : null,
    archivedCarePlans: filteredArchivedCarePlansMapped,
    getAllPdfFiles,
    isLoading,
    refetch: handleRefetch // Expose combined refetch method
  };
}
