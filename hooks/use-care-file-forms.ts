import {
  CareFileFormKey,
  CareFileFormState,
  CareFileFormsState,
  CareFileFormStatus
} from "@/types/care-files";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface UseCareFileFormsProps {
  residentId: string | undefined;
}

export function useCareFileForms({ residentId }: UseCareFileFormsProps) {
  const [formsState, setFormsState] = useState<CareFileFormsState>({});
  const [loading, setLoading] = useState(true);

  const fetchLatestForms = useCallback(async () => {
    if (!residentId) return;
    setLoading(true);

    const formKeys: CareFileFormKey[] = [
      "preAdmission-form",
      "infection-prevention",
      "blader-bowel-form",
      "moving-handling-form",
      "bedrail-consent-form",
      "bed-rails-risk-assessment-form",
      "long-term-fall-risk-form",
      "admission-form",
      "photography-consent",
      "dnacpr",
      "peep",
      "dependency-assessment",
      "timl",
      "skin-integrity-form",
      "resident-valuables-form",
      "resident-handling-profile-form",
      "pain-assessment-form",
      "nutritional-assessment-form",
      "oral-assessment-form",
      "diet-notification-form",
      "choking-risk-assessment-form",
      "cornell-depression-scale-form",
      "braden-risk-assessment-form",
      "best-interest-decision-form",
      "v2-restraints-risk",
      "smoking-risk-assessment"
    ];

    const tableMap: Partial<Record<CareFileFormKey, string>> = {
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
      "skin-integrity-form": "skin_integrity_assessments",
      "resident-valuables-form": "resident_valuables_assessments",
      "resident-handling-profile-form": "handling_profiles",
      "pain-assessment-form": "pain_assessments",
      "nutritional-assessment-form": "nutritional_assessments",
      "oral-assessment-form": "oral_assessments",
      "diet-notification-form": "diet_notifications",
      "choking-risk-assessment-form": "choking_risk_assessments",
      "cornell-depression-scale-form": "cornell_depression_scales",
      "braden-risk-assessment-form": "braden_risk_assessments",
      "best-interest-decision-form": "best_interest_decisions",
      "v2-restraints-risk": "restraints_consents",
      "smoking-risk-assessment": "smoking_risk_assessments",
      "care-plan-form": "care_plan_assessments" // Included for completeness
    };

    const newState: CareFileFormsState = {};

    await Promise.all(formKeys.map(async (key) => {
      const table = tableMap[key];
      if (!table) return;

      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('resident_id', residentId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // It's okay if not found (error code PGRST116 usually, or null data)
        const latestForm = data;

        // Audit Logic (Stubbed for now, assuming not audited until migrated)
        // const audit = ...

        const hasData = !!latestForm;
        // Map Supabase fields to status
        // Most tables have 'status' column or 'saved_as_draft' or implicit
        let isDraft = false;
        if (latestForm && 'saved_as_draft' in latestForm) isDraft = latestForm.saved_as_draft;
        if (latestForm && 'status' in latestForm) isDraft = latestForm.status === 'draft';

        newState[key] = {
          status: !hasData ? 'not-started' : (isDraft ? 'in-progress' : 'completed'),
          hasData,
          hasPdfFileId: !!latestForm?.pdf_file_id, // valid for admission
          pdfUrl: null, // Stubbed
          lastUpdated: latestForm ? new Date(latestForm.created_at).getTime() : undefined,
          completedAt: (latestForm && !isDraft) ? new Date(latestForm.created_at).getTime() : undefined,
          isAudited: false, // Stubbed
          auditedAt: undefined,
          auditedBy: undefined
        };

      } catch (e) {
        // Ignore fetch errors (likely no data)
        console.warn(`Error fetching ${key}`, e);
      }
    }));

    setFormsState(newState);
    setLoading(false);
  }, [residentId]);

  useEffect(() => {
    fetchLatestForms();
  }, [fetchLatestForms]);


  const getFormState = (key: CareFileFormKey): CareFileFormState => {
    return (
      formsState[key] || {
        status: "not-started",
        hasData: false,
        hasPdfFileId: false,
        pdfUrl: undefined,
        isAudited: false
      }
    );
  };

  const canDownloadPdf = (key: CareFileFormKey): boolean => {
    const formState = formsState[key];
    if (!formState) return false;

    if (key === "smoking-risk-assessment") return formState.hasData;

    // Original logic: needs hasData and (hasPdfFileId OR pdfUrl)
    return formState.hasData && (!!formState.hasPdfFileId || !!formState.pdfUrl);
  };

  const getCompletedFormsCount = (keys: CareFileFormKey[]): number => {
    return keys.filter((key) => {
      const state = formsState[key];
      return state?.status === "completed";
    }).length;
  };

  return {
    formsState,
    getFormState,
    canDownloadPdf,
    getCompletedFormsCount,
    loading,
    refreshForms: fetchLatestForms
  };
}
