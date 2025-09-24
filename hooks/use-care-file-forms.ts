import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  CareFileFormKey,
  CareFileFormState,
  CareFileFormsState,
  CareFileFormStatus
} from "@/types/care-files";
import { useMemo } from "react";
import { authClient } from "@/lib/auth-client";

interface UseCareFileFormsProps {
  residentId: Id<"residents">;
}

export function useCareFileForms({ residentId }: UseCareFileFormsProps) {
  const { data: activeOrg } = authClient.useActiveOrganization();

  // Query all form data
  const preAdmissionForms = useQuery(
    api.careFiles.preadmission.getPreAdmissionFormsByResident,
    { residentId }
  );

  const infectionPreventionAssessments = useQuery(
    api.careFiles.infectionPrevention
      .getInfectionPreventionAssessmentsByResident,
    { residentId }
  );

  const bladderBowelAssessments = useQuery(
    api.careFiles.bladderBowel.getBladderBowelAssessmentsByResident,
    { residentId }
  );

  const movingHandlingAssessments = useQuery(
    api.careFiles.movingHandling.getMovingHandlingAssessmentsByResident,
    { residentId }
  );

  const longTermFallsAssessment = useQuery(
    api.careFiles.longTermFalls.getLatestAssessmentByResident,
    activeOrg?.id
      ? {
          residentId,
          organizationId: activeOrg.id
        }
      : "skip"
  );

  const admissionAssessments = useQuery(
    api.careFiles.admission.getAdmissionAssessmentsByResident,
    { residentId }
  );

  const photographyConsents = useQuery(
    api.careFiles.photographyConsent.getPhotographyConsentsByResident,
    { residentId }
  );

  // Get PDF URLs for the latest forms (newest _creationTime first)
  const latestPreAdmissionForm = preAdmissionForms?.sort(
    (a, b) => b._creationTime - a._creationTime
  )?.[0];
  const latestInfectionPreventionAssessment =
    infectionPreventionAssessments?.sort(
      (a, b) => b._creationTime - a._creationTime
    )?.[0];
  const latestBladderBowelAssessment = bladderBowelAssessments?.sort(
    (a, b) => b._creationTime - a._creationTime
  )?.[0];
  const latestMovingHandlingAssessment = movingHandlingAssessments?.sort(
    (a, b) => b._creationTime - a._creationTime
  )?.[0];
  const latestLongTermFallsAssessment = longTermFallsAssessment;
  const latestAdmissionAssessment = admissionAssessments?.sort(
    (a, b) => b._creationTime - a._creationTime
  )?.[0];
  const latestPhotographyConsent = photographyConsents?.sort(
    (a, b) => b._creationTime - a._creationTime
  )?.[0];

  const preAdmissionPdfUrl = useQuery(
    api.careFiles.preadmission.getPDFUrl,
    latestPreAdmissionForm ? { formId: latestPreAdmissionForm._id } : "skip"
  );

  const infectionPreventionPdfUrl = useQuery(
    api.careFiles.infectionPrevention.getPDFUrl,
    latestInfectionPreventionAssessment
      ? { assessmentId: latestInfectionPreventionAssessment._id }
      : "skip"
  );

  const bladderBowelPdfUrl = useQuery(
    api.careFiles.bladderBowel.getPDFUrl,
    latestBladderBowelAssessment
      ? { assessmentId: latestBladderBowelAssessment._id }
      : "skip"
  );

  const movingHandlingPdfUrl = useQuery(
    api.careFiles.movingHandling.getPDFUrl,
    latestMovingHandlingAssessment
      ? { assessmentId: latestMovingHandlingAssessment._id }
      : "skip"
  );

  const longTermFallsPdfUrl = useQuery(
    api.careFiles.longTermFalls.getPDFUrl,
    latestLongTermFallsAssessment
      ? { assessmentId: latestLongTermFallsAssessment._id }
      : "skip"
  );

  const admissionPdfUrl = useQuery(
    api.careFiles.admission.getPDFUrl,
    latestAdmissionAssessment
      ? { assessmentId: latestAdmissionAssessment._id }
      : "skip"
  );

  const photographyConsentPdfUrl = useQuery(
    api.careFiles.photographyConsent.getPDFUrl,
    latestPhotographyConsent
      ? { consentId: latestPhotographyConsent._id }
      : "skip"
  );

  // Query audit status for all latest forms
  const formIds = useMemo(() => {
    const ids: string[] = [];
    if (latestPreAdmissionForm) ids.push(latestPreAdmissionForm._id);
    if (latestInfectionPreventionAssessment)
      ids.push(latestInfectionPreventionAssessment._id);
    if (latestBladderBowelAssessment)
      ids.push(latestBladderBowelAssessment._id);
    if (latestMovingHandlingAssessment)
      ids.push(latestMovingHandlingAssessment._id);
    if (latestLongTermFallsAssessment)
      ids.push(latestLongTermFallsAssessment._id);
    if (latestAdmissionAssessment) ids.push(latestAdmissionAssessment._id);
    if (latestPhotographyConsent) ids.push(latestPhotographyConsent._id);
    return ids;
  }, [
    latestPreAdmissionForm,
    latestInfectionPreventionAssessment,
    latestBladderBowelAssessment,
    latestMovingHandlingAssessment,
    latestLongTermFallsAssessment,
    latestAdmissionAssessment,
    latestPhotographyConsent
  ]);

  const auditStatus = useQuery(
    api.managerAudits.getFormAuditStatus,
    activeOrg?.id && formIds.length > 0
      ? {
          residentId,
          organizationId: activeOrg.id,
          formIds
        }
      : "skip"
  );

  // Debug logging
  console.log("=== AUDIT STATUS DEBUG ===");
  console.log("Raw form data:");
  console.log("  preAdmissionForms:", preAdmissionForms);
  console.log(
    "  infectionPreventionAssessments:",
    infectionPreventionAssessments
  );
  console.log("  bladderBowelAssessments:", bladderBowelAssessments);
  console.log("  movingHandlingAssessments:", movingHandlingAssessments);
  console.log("  longTermFallsAssessment:", longTermFallsAssessment);
  console.log("  admissionAssessments:", admissionAssessments);
  console.log("  photographyConsents:", photographyConsents);
  console.log("formIds:", formIds);
  console.log("auditStatus:", auditStatus);
  console.log("latestPreAdmissionForm ID:", latestPreAdmissionForm?._id);
  console.log(
    "latestInfectionPreventionAssessment ID:",
    latestInfectionPreventionAssessment?._id
  );
  console.log(
    "latestBladderBowelAssessment ID:",
    latestBladderBowelAssessment?._id
  );
  console.log(
    "latestMovingHandlingAssessment ID:",
    latestMovingHandlingAssessment?._id
  );
  console.log(
    "latestLongTermFallsAssessment ID:",
    latestLongTermFallsAssessment?._id
  );
  console.log("latestAdmissionAssessment ID:", latestAdmissionAssessment?._id);
  console.log("latestPhotographyConsent ID:", latestPhotographyConsent?._id);

  // Helper function to determine form status
  const getFormStatus = (
    hasData: boolean,
    savedAsDraft: boolean | undefined,
    hasPdfFileId: boolean,
    pdfUrl: string | null | undefined
  ): CareFileFormStatus => {
    if (!hasData) return "not-started";
    if (savedAsDraft) return "in-progress";
    // If we have a valid PDF URL, consider it completed even if pdfFileId isn't synced yet
    if (pdfUrl) return "completed";
    if (!hasPdfFileId) return "pdf-generating";
    return "completed";
  };

  // Compute forms state
  const formsState: CareFileFormsState = useMemo(() => {
    const state: CareFileFormsState = {};

    // Pre-admission form
    const hasPreAdmissionData = !!latestPreAdmissionForm;
    const preAdmissionHasPdfFileId = !!latestPreAdmissionForm?.pdfFileId;
    const preAdmissionAudit = latestPreAdmissionForm
      ? auditStatus?.[latestPreAdmissionForm._id as string]
      : undefined;

    console.log("Pre-admission audit lookup:");
    console.log("  Form ID:", latestPreAdmissionForm?._id);
    console.log("  Audit found:", preAdmissionAudit);
    console.log("  Is audited:", preAdmissionAudit?.isAudited);

    state["preAdmission-form"] = {
      status: getFormStatus(
        hasPreAdmissionData,
        latestPreAdmissionForm?.savedAsDraft,
        preAdmissionHasPdfFileId,
        preAdmissionPdfUrl
      ),
      hasData: hasPreAdmissionData,
      hasPdfFileId: preAdmissionHasPdfFileId,
      pdfUrl: preAdmissionPdfUrl,
      lastUpdated: latestPreAdmissionForm?._creationTime,
      completedAt: !latestPreAdmissionForm?.savedAsDraft
        ? latestPreAdmissionForm?.createdAt
        : undefined,
      isAudited: preAdmissionAudit?.isAudited || false,
      auditedAt: preAdmissionAudit?.auditedAt,
      auditedBy: preAdmissionAudit?.auditedBy
    };

    // Infection prevention assessment
    const hasInfectionPreventionData = !!latestInfectionPreventionAssessment;
    const infectionPreventionHasPdfFileId =
      !!latestInfectionPreventionAssessment?.pdfFileId;
    const infectionPreventionAudit = latestInfectionPreventionAssessment
      ? auditStatus?.[latestInfectionPreventionAssessment._id as string]
      : undefined;

    console.log("Infection prevention audit lookup:");
    console.log("  Form ID:", latestInfectionPreventionAssessment?._id);
    console.log("  Audit found:", infectionPreventionAudit);
    console.log("  Is audited:", infectionPreventionAudit?.isAudited);

    state["infection-prevention"] = {
      status: getFormStatus(
        hasInfectionPreventionData,
        latestInfectionPreventionAssessment?.savedAsDraft,
        infectionPreventionHasPdfFileId,
        infectionPreventionPdfUrl
      ),
      hasData: hasInfectionPreventionData,
      hasPdfFileId: infectionPreventionHasPdfFileId,
      pdfUrl: infectionPreventionPdfUrl,
      lastUpdated: latestInfectionPreventionAssessment?._creationTime,
      completedAt: !latestInfectionPreventionAssessment?.savedAsDraft
        ? latestInfectionPreventionAssessment?.createdAt
        : undefined,
      isAudited: infectionPreventionAudit?.isAudited || false,
      auditedAt: infectionPreventionAudit?.auditedAt,
      auditedBy: infectionPreventionAudit?.auditedBy
    };

    // Bladder bowel assessment
    const hasBladderBowelData = !!latestBladderBowelAssessment;
    const bladderBowelHasPdfFileId = !!latestBladderBowelAssessment?.pdfFileId;
    const bladderBowelAudit = latestBladderBowelAssessment
      ? auditStatus?.[latestBladderBowelAssessment._id as string]
      : undefined;

    console.log("Bladder bowel audit lookup:");
    console.log("  Form ID:", latestBladderBowelAssessment?._id);
    console.log("  Audit found:", bladderBowelAudit);
    console.log("  Is audited:", bladderBowelAudit?.isAudited);

    state["blader-bowel-form"] = {
      status: getFormStatus(
        hasBladderBowelData,
        latestBladderBowelAssessment?.savedAsDraft,
        bladderBowelHasPdfFileId,
        bladderBowelPdfUrl
      ),
      hasData: hasBladderBowelData,
      hasPdfFileId: bladderBowelHasPdfFileId,
      pdfUrl: bladderBowelPdfUrl,
      lastUpdated: latestBladderBowelAssessment?._creationTime,
      completedAt: !latestBladderBowelAssessment?.savedAsDraft
        ? latestBladderBowelAssessment?.createdAt
        : undefined,
      isAudited: bladderBowelAudit?.isAudited || false,
      auditedAt: bladderBowelAudit?.auditedAt,
      auditedBy: bladderBowelAudit?.auditedBy
    };

    // Moving handling assessment
    const hasMovingHandlingData = !!latestMovingHandlingAssessment;
    const movingHandlingHasPdfFileId =
      !!latestMovingHandlingAssessment?.pdfFileId;
    const movingHandlingAudit = latestMovingHandlingAssessment
      ? auditStatus?.[latestMovingHandlingAssessment._id as string]
      : undefined;

    console.log("Moving handling audit lookup:");
    console.log("  Form ID:", latestMovingHandlingAssessment?._id);
    console.log("  Audit found:", movingHandlingAudit);
    console.log("  Is audited:", movingHandlingAudit?.isAudited);

    state["moving-handling-form"] = {
      status: getFormStatus(
        hasMovingHandlingData,
        latestMovingHandlingAssessment?.savedAsDraft,
        movingHandlingHasPdfFileId,
        movingHandlingPdfUrl
      ),
      hasData: hasMovingHandlingData,
      hasPdfFileId: movingHandlingHasPdfFileId,
      pdfUrl: movingHandlingPdfUrl,
      lastUpdated: latestMovingHandlingAssessment?._creationTime,
      completedAt: !latestMovingHandlingAssessment?.savedAsDraft
        ? latestMovingHandlingAssessment?.createdAt
        : undefined,
      isAudited: movingHandlingAudit?.isAudited || false,
      auditedAt: movingHandlingAudit?.auditedAt,
      auditedBy: movingHandlingAudit?.auditedBy
    };

    // Long Term Falls Risk Assessment
    const hasLongTermFallsData = !!latestLongTermFallsAssessment;
    const longTermFallsHasPdfFileId =
      !!latestLongTermFallsAssessment?.pdfFileId;
    const longTermFallsAudit = latestLongTermFallsAssessment
      ? auditStatus?.[latestLongTermFallsAssessment._id as string]
      : undefined;

    console.log("Long Term Falls audit lookup:");
    console.log("  Form ID:", latestLongTermFallsAssessment?._id);
    console.log("  Audit found:", longTermFallsAudit);
    console.log("  Is audited:", longTermFallsAudit?.isAudited);

    state["long-term-fall-risk-form"] = {
      status: getFormStatus(
        hasLongTermFallsData,
        latestLongTermFallsAssessment?.savedAsDraft,
        longTermFallsHasPdfFileId,
        longTermFallsPdfUrl
      ),
      hasData: hasLongTermFallsData,
      hasPdfFileId: longTermFallsHasPdfFileId,
      pdfUrl: longTermFallsPdfUrl,
      lastUpdated: latestLongTermFallsAssessment?._creationTime,
      completedAt: !latestLongTermFallsAssessment?.savedAsDraft
        ? latestLongTermFallsAssessment?.createdAt
        : undefined,
      isAudited: longTermFallsAudit?.isAudited || false,
      auditedAt: longTermFallsAudit?.auditedAt,
      auditedBy: longTermFallsAudit?.auditedBy
    };

    // Admission assessment
    const hasAdmissionData = !!latestAdmissionAssessment;
    const admissionHasPdfFileId = !!(latestAdmissionAssessment as any)
      ?.pdfFileId;
    const admissionAudit = latestAdmissionAssessment
      ? auditStatus?.[latestAdmissionAssessment._id as string]
      : undefined;

    console.log("Admission audit lookup:");
    console.log("  Form ID:", latestAdmissionAssessment?._id);
    console.log("  Audit found:", admissionAudit);
    console.log("  Is audited:", admissionAudit?.isAudited);

    state["admission-form"] = {
      status: getFormStatus(
        hasAdmissionData,
        latestAdmissionAssessment?.status === "draft",
        admissionHasPdfFileId,
        admissionPdfUrl
      ),
      hasData: hasAdmissionData,
      hasPdfFileId: admissionHasPdfFileId,
      pdfUrl: admissionPdfUrl,
      lastUpdated: latestAdmissionAssessment?._creationTime,
      completedAt:
        latestAdmissionAssessment?.status !== "draft"
          ? latestAdmissionAssessment?.submittedAt
          : undefined,
      isAudited: admissionAudit?.isAudited || false,
      auditedAt: admissionAudit?.auditedAt,
      auditedBy: admissionAudit?.auditedBy
    };

    // Photography consent
    const hasPhotographyConsentData = !!latestPhotographyConsent;
    const photographyConsentHasPdfFileId = !!(latestPhotographyConsent as any)
      ?.pdfFileId;
    const photographyConsentAudit = latestPhotographyConsent
      ? auditStatus?.[latestPhotographyConsent._id as string]
      : undefined;

    console.log("Photography consent audit lookup:");
    console.log("  Form ID:", latestPhotographyConsent?._id);
    console.log("  Audit found:", photographyConsentAudit);
    console.log("  Is audited:", photographyConsentAudit?.isAudited);

    state["photography-consent"] = {
      status: getFormStatus(
        hasPhotographyConsentData,
        latestPhotographyConsent?.status === "draft",
        photographyConsentHasPdfFileId,
        photographyConsentPdfUrl
      ),
      hasData: hasPhotographyConsentData,
      hasPdfFileId: photographyConsentHasPdfFileId,
      pdfUrl: photographyConsentPdfUrl,
      lastUpdated: latestPhotographyConsent?._creationTime,
      completedAt:
        latestPhotographyConsent?.status !== "draft"
          ? latestPhotographyConsent?.submittedAt
          : undefined,
      isAudited: photographyConsentAudit?.isAudited || false,
      auditedAt: photographyConsentAudit?.auditedAt,
      auditedBy: photographyConsentAudit?.auditedBy
    };

    // Add other forms here as they are implemented
    // state["discharge-form"] = { ... };

    return state;
  }, [
    latestPreAdmissionForm,
    latestInfectionPreventionAssessment,
    latestBladderBowelAssessment,
    latestMovingHandlingAssessment,
    latestLongTermFallsAssessment,
    latestAdmissionAssessment,
    latestPhotographyConsent,
    preAdmissionPdfUrl,
    infectionPreventionPdfUrl,
    bladderBowelPdfUrl,
    movingHandlingPdfUrl,
    longTermFallsPdfUrl,
    admissionPdfUrl,
    photographyConsentPdfUrl,
    auditStatus
  ]);

  // Helper functions
  const getFormState = (formKey: CareFileFormKey): CareFileFormState => {
    return (
      formsState[formKey] || {
        status: "not-started",
        hasData: false,
        hasPdfFileId: false,
        pdfUrl: null
      }
    );
  };

  const isFormCompleted = (formKey: CareFileFormKey): boolean => {
    return getFormState(formKey).status === "completed";
  };

  const isFormInProgress = (formKey: CareFileFormKey): boolean => {
    return getFormState(formKey).status === "in-progress";
  };

  const canDownloadPdf = (formKey: CareFileFormKey): boolean => {
    const state = getFormState(formKey);
    return !!state.pdfUrl;
  };

  const areAllFormsCompleted = (formKeys: CareFileFormKey[]): boolean => {
    return formKeys.every((key) => isFormCompleted(key));
  };

  const getFolderStatus = (formKeys: CareFileFormKey[]): CareFileFormStatus => {
    if (areAllFormsCompleted(formKeys)) return "completed";

    const hasAnyInProgress = formKeys.some((key) => isFormInProgress(key));
    if (hasAnyInProgress) return "in-progress";

    const hasAnyData = formKeys.some((key) => getFormState(key).hasData);
    if (hasAnyData) return "pdf-generating";

    return "not-started";
  };

  const getCompletedFormsCount = (formKeys: CareFileFormKey[]): number => {
    return formKeys.filter((key) => isFormCompleted(key)).length;
  };

  return {
    formsState,
    getFormState,
    isFormCompleted,
    isFormInProgress,
    canDownloadPdf,
    areAllFormsCompleted,
    getFolderStatus,
    getCompletedFormsCount,
    // Raw data for backward compatibility or specific needs
    preAdmissionForms,
    infectionPreventionAssessments,
    bladderBowelAssessments,
    movingHandlingAssessments,
    longTermFallsAssessment,
    latestPreAdmissionForm,
    latestInfectionPreventionAssessment,
    latestBladderBowelAssessment,
    latestMovingHandlingAssessment,
    latestLongTermFallsAssessment,
    latestAdmissionAssessment,
    latestPhotographyConsent,
    // All assessments for reference
    admissionAssessments,
    photographyConsents
  };
}
