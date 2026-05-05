import {
  CareFileFormKey,
  CareFileFormState,
  CareFileFormsState,
} from "@/types/care-files";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface UseCareFileFormsProps {
  residentId: string | undefined;
}

// ─── Module-level cache ────────────────────────────────────────────────────────
// Keyed by residentId. Stores the resolved formsState so all N CareFileFolder
// cards on the same page share ONE set of DB queries instead of firing N×29.
// The cache is per-browser-tab (in-memory only) and is busted when refreshForms
// is called explicitly (e.g. after a form save).
type CacheEntry = {
  state: CareFileFormsState;
  promise: Promise<CareFileFormsState> | null;
};
const formsCache = new Map<string, CacheEntry>();

async function fetchFormsFromDB(residentId: string): Promise<CareFileFormsState> {
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
    "v2-body-map-hygiene",
    "v2-body-map-skin",
    "fall-risk-assessment",
    "smoking-risk-assessment",
    "v2-night-obs-consent",
    "v2-capacity-consent",
    "v2-specimen-log",
    "v2-general-risk",
    "v2-must-assessment",
    "v2-personal-profile",
    "v2-abbey-pain",
    "v2-weight-chart"
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
    "fall-risk-assessment": "fall_risk_assessments",
    "smoking-risk-assessment": "smoking_risk_assessments",
    "care-plan-form": "care_plan_assessments",
    "v2-capacity-consent": "capacity_consents",
    "v2-night-obs-consent": "night_observation_consents",
    "v2-specimen-log": "specimen_records",
    "v2-general-risk": "general_risk_assessments",
    "v2-must-assessment": "must_assessments",
    "v2-personal-profile": "personal_profiles",
    "v2-abbey-pain": "abbey_pain_assessments",
    "v2-weight-chart": "weight_records"
  };

  const newState: CareFileFormsState = {};

  await Promise.all(formKeys.map(async (key) => {
    const table = tableMap[key];
    if (!table) return;

    try {
      let data, error;

      if (key === "v2-body-map-hygiene" || key === "v2-body-map-skin") {
        const folderKey = key === "v2-body-map-hygiene" ? "v2-hygiene" : "v2-skin-integrity";
        ({ data, error } = await supabase
          .from("care_folder_body_maps")
          .select("*")
          .eq("resident_id", residentId)
          .eq("folder_key", folderKey)
          .maybeSingle());

        const hasSessions = data?.body_map_data?.sessions?.length > 0;
        newState[key] = {
          status: hasSessions ? 'completed' : 'not-started',
          hasData: hasSessions,
          lastUpdated: data ? new Date(data.updated_at).getTime() : undefined,
          isAudited: false
        };
        return;
      }

      ({ data, error } = await supabase
        .from(table)
        .select("*")
        .eq("resident_id", residentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single());

      const latestForm = data;
      const hasData = !!latestForm;

      let isDraft = false;
      if (latestForm && 'saved_as_draft' in latestForm) isDraft = latestForm.saved_as_draft;
      if (latestForm && 'status' in latestForm) isDraft = latestForm.status === 'draft';

      newState[key] = {
        status: !hasData ? 'not-started' : (isDraft ? 'in-progress' : 'completed'),
        hasData,
        hasPdfFileId: !!latestForm?.pdf_file_id,
        pdfUrl: null,
        lastUpdated: latestForm ? new Date(latestForm.created_at).getTime() : undefined,
        completedAt: (latestForm && !isDraft) ? new Date(latestForm.created_at).getTime() : undefined,
        isAudited: false,
        auditedAt: undefined,
        auditedBy: undefined
      };

    } catch (e) {
      console.warn(`Error fetching ${key}`, e);
    }
  }));

  return newState;
}

export function useCareFileForms({ residentId }: UseCareFileFormsProps) {
  const [formsState, setFormsState] = useState<CareFileFormsState>({});
  const [loading, setLoading] = useState(true);

  const fetchLatestForms = useCallback(async (bustCache = false) => {
    if (!residentId) return;
    setLoading(true);

    // Bust cache on explicit refresh (e.g. after a form save)
    if (bustCache) {
      formsCache.delete(residentId);
    }

    const cached = formsCache.get(residentId);

    if (cached) {
      if (Object.keys(cached.state).length > 0) {
        // Already resolved — use it immediately
        setFormsState(cached.state);
        setLoading(false);
        return;
      }
      if (cached.promise) {
        // In-flight — piggyback on the existing fetch
        const state = await cached.promise;
        setFormsState(state);
        setLoading(false);
        return;
      }
    }

    // No cache hit — start a fresh fetch and share the Promise
    const promise = fetchFormsFromDB(residentId).then((state) => {
      // Write resolved state into cache
      formsCache.set(residentId, { state, promise: null });
      return state;
    });

    // Store the in-flight promise so other instances can piggyback
    formsCache.set(residentId, { state: {}, promise });

    const state = await promise;
    setFormsState(state);
    setLoading(false);
  }, [residentId]);

  // Explicit refresh (called after saving a form) busts the cache
  const refreshForms = useCallback(() => {
    fetchLatestForms(true);
  }, [fetchLatestForms]);

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
    refreshForms
  };
}
