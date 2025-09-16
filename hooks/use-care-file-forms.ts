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

interface UseCareFileFormsProps {
  residentId: Id<"residents">;
}

export function useCareFileForms({ residentId }: UseCareFileFormsProps) {
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

  // Get PDF URLs for the latest forms
  const latestPreAdmissionForm = preAdmissionForms?.[0];
  const latestInfectionPreventionAssessment =
    infectionPreventionAssessments?.[0];
  const latestBladderBowelAssessment = bladderBowelAssessments?.[0];
  const latestMovingHandlingAssessment = movingHandlingAssessments?.[0];

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

  // Helper function to determine form status
  const getFormStatus = (
    hasData: boolean,
    savedAsDraft: boolean | undefined,
    hasPdfFileId: boolean,
    pdfUrl: string | null | undefined
  ): CareFileFormStatus => {
    if (!hasData) return "not-started";
    if (savedAsDraft) return "in-progress";
    if (!hasPdfFileId) return "pdf-generating";
    if (hasPdfFileId && !pdfUrl) return "pdf-generating";
    return "completed";
  };

  // Compute forms state
  const formsState: CareFileFormsState = useMemo(() => {
    const state: CareFileFormsState = {};

    // Pre-admission form
    const hasPreAdmissionData = !!latestPreAdmissionForm;
    const preAdmissionHasPdfFileId = !!latestPreAdmissionForm?.pdfFileId;
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
        : undefined
    };

    // Infection prevention assessment
    const hasInfectionPreventionData = !!latestInfectionPreventionAssessment;
    const infectionPreventionHasPdfFileId =
      !!latestInfectionPreventionAssessment?.pdfFileId;
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
        : undefined
    };

    // Bladder bowel assessment
    const hasBladderBowelData = !!latestBladderBowelAssessment;
    const bladderBowelHasPdfFileId = !!latestBladderBowelAssessment?.pdfFileId;
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
        : undefined
    };

    // Moving handling assessment
    const hasMovingHandlingData = !!latestMovingHandlingAssessment;
    const movingHandlingHasPdfFileId =
      !!latestMovingHandlingAssessment?.pdfFileId;
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
        : undefined
    };

    // Add other forms here as they are implemented
    // state["admission-form"] = { ... };
    // state["discharge-form"] = { ... };

    return state;
  }, [
    latestPreAdmissionForm,
    latestInfectionPreventionAssessment,
    latestBladderBowelAssessment,
    latestMovingHandlingAssessment,
    preAdmissionPdfUrl,
    infectionPreventionPdfUrl,
    bladderBowelPdfUrl,
    movingHandlingPdfUrl
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
    return state.hasPdfFileId === true && !!state.pdfUrl;
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
    latestPreAdmissionForm,
    latestInfectionPreventionAssessment,
    latestBladderBowelAssessment,
    latestMovingHandlingAssessment
  };
}
