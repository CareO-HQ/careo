import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { CareFileFormKey } from "@/types/care-files";

type PdfUrlConfig = {
  query: any;
  buildArgs: (
    formId: string,
    organizationId?: string
  ) => Record<string, any> | "skip";
};

// Configuration mapping for form keys to their PDF URL queries
const PDF_URL_CONFIG: Record<CareFileFormKey, PdfUrlConfig> = {
  "preAdmission-form": {
    query: api.careFiles.preadmission.getPDFUrl,
    buildArgs: (formId) => ({ formId: formId as Id<"preAdmissionCareFiles"> })
  },
  "infection-prevention": {
    query: api.careFiles.infectionPrevention.getPDFUrl,
    buildArgs: (formId) => ({
      assessmentId: formId as Id<"infectionPreventionAssessments">
    })
  },
  "blader-bowel-form": {
    query: api.careFiles.bladderBowel.getPDFUrl,
    buildArgs: (formId) => ({
      assessmentId: formId as Id<"bladderBowelAssessments">
    })
  },
  "moving-handling-form": {
    query: api.careFiles.movingHandling.getPDFUrl,
    buildArgs: (formId) => ({
      assessmentId: formId as Id<"movingHandlingAssessments">
    })
  },
  "long-term-fall-risk-form": {
    query: api.careFiles.longTermFalls.getPDFUrl,
    buildArgs: (formId) => ({
      assessmentId: formId as Id<"longTermFallsRiskAssessments">
    })
  },
  "care-plan-form": {
    query: api.careFiles.carePlan.getPDFUrl,
    buildArgs: (formId) => ({
      assessmentId: formId as Id<"carePlanAssessments">
    })
  },
  "admission-form": {
    query: api.careFiles.admission.getPDFUrl,
    buildArgs: (formId) => ({
      assessmentId: formId as Id<"admissionAssesments">
    })
  },
  "photography-consent": {
    query: api.careFiles.photographyConsent.getPDFUrl,
    buildArgs: (formId) => ({
      consentId: formId as Id<"photographyConsents">
    })
  },
  dnacpr: {
    query: api.careFiles.dnacpr.getPDFUrl,
    buildArgs: (formId) => ({
      dnacprId: formId as Id<"dnacprs">
    })
  },
  peep: {
    query: api.careFiles.peep.getPDFUrl,
    buildArgs: (formId) => ({
      peepId: formId as Id<"peeps">
    })
  },
  "dependency-assessment": {
    query: api.careFiles.dependency.getPDFUrl,
    buildArgs: (formId) => ({
      assessmentId: formId as Id<"dependencyAssessments">
    })
  },
  timl: {
    query: api.careFiles.timl.getPDFUrl,
    buildArgs: (formId) => ({
      assessmentId: formId as Id<"timlAssessments">
    })
  },
  "skin-integrity-form": {
    query: api.careFiles.skinIntegrity.getPDFUrl,
    buildArgs: (formId, organizationId) => ({
      assessmentId: formId as Id<"skinIntegrityAssessments">,
      organizationId: organizationId ?? ""
    })
  },
  "resident-valuables-form": {
    query: api.careFiles.residentValuables.getPDFUrl,
    buildArgs: (formId, organizationId) => ({
      assessmentId: formId as Id<"residentValuablesAssessments">,
      organizationId: organizationId ?? ""
    })
  },
  "resident-handling-profile-form": {
    query: api.careFiles.handlingProfile.getPDFUrl,
    buildArgs: (formId) => ({
      profileId: formId as Id<"residentHandlingProfileForm">
    })
  },
  "pain-assessment-form": {
    query: api.careFiles.painAssessment.getPDFUrl,
    buildArgs: (formId, organizationId) => ({
      assessmentId: formId as Id<"painAssessments">,
      organizationId: organizationId ?? ""
    })
  },
  "nutritional-assessment-form": {
    query: api.careFiles.nutritionalAssessment.getPDFUrl,
    buildArgs: (formId, organizationId) => ({
      assessmentId: formId as Id<"nutritionalAssessments">,
      organizationId: organizationId ?? ""
    })
  },
  "oral-assessment-form": {
    query: api.careFiles.oralAssessment.getPDFUrl,
    buildArgs: (formId, organizationId) => ({
      assessmentId: formId as Id<"oralAssessments">,
      organizationId: organizationId ?? ""
    })
  },
  "diet-notification-form": {
    query: api.careFiles.dietNotification.getPDFUrl,
    buildArgs: (formId, organizationId) => ({
      notificationId: formId as Id<"dietNotifications">,
      organizationId: organizationId ?? ""
    })
  },
  "choking-risk-assessment-form": {
    query: api.careFiles.chokingRiskAssessment.getPDFUrl,
    buildArgs: (formId, organizationId) => ({
      assessmentId: formId as Id<"chokingRiskAssessments">,
      organizationId: organizationId ?? ""
    })
  },
  "cornell-depression-scale-form": {
    query: api.careFiles.cornellDepressionScale.getPDFUrl,
    buildArgs: (formId, organizationId) => ({
      assessmentId: formId as Id<"cornellDepressionScales">,
      organizationId: organizationId ?? ""
    })
  }
};

interface UsePdfUrlProps {
  formKey: CareFileFormKey;
  formId: string;
  organizationId?: string;
}

/**
 * Custom hook to fetch PDF URL for a given form
 * @param formKey - The type of form (e.g., "preAdmission-form")
 * @param formId - The ID of the form document
 * @param organizationId - Optional organization ID (required for some forms)
 * @returns The PDF URL or null
 */
export function usePdfUrl({ formKey, formId, organizationId }: UsePdfUrlProps) {
  const config = PDF_URL_CONFIG[formKey];

  if (!config) {
    console.warn(`No PDF URL configuration found for form key: ${formKey}`);
  }

  const args = config?.buildArgs(formId, organizationId) ?? "skip";

  return useQuery(config?.query ?? ("skip" as any), args);
}
