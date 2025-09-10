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

  // Get PDF URLs for the latest forms
  const latestPreAdmissionForm = preAdmissionForms?.[0];
  const latestInfectionPreventionAssessment =
    infectionPreventionAssessments?.[0];

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

    // Add other forms here as they are implemented
    // state["admission-form"] = { ... };
    // state["discharge-form"] = { ... };

    return state;
  }, [
    latestPreAdmissionForm,
    latestInfectionPreventionAssessment,
    preAdmissionPdfUrl,
    infectionPreventionPdfUrl
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

  return {
    formsState,
    getFormState,
    isFormCompleted,
    isFormInProgress,
    canDownloadPdf,
    // Raw data for backward compatibility or specific needs
    preAdmissionForms,
    infectionPreventionAssessments,
    latestPreAdmissionForm,
    latestInfectionPreventionAssessment
  };
}
