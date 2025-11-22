import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { CareFileFormKey } from "@/types/care-files";
import { useMemo } from "react";

interface UseFolderFormsProps {
  residentId: Id<"residents"> | undefined;
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
  // Conditionally query forms based on folderFormKeys
  const allPreAdmissionForms = useQuery(
    api.careFiles.preadmission.getPreAdmissionFormsByResident,
    folderFormKeys.includes("preAdmission-form") && residentId
      ? { residentId }
      : "skip"
  );

  const allInfectionPreventionForms = useQuery(
    api.careFiles.infectionPrevention
      .getInfectionPreventionAssessmentsByResident,
    folderFormKeys.includes("infection-prevention") && residentId
      ? { residentId }
      : "skip"
  );

  const allBladderBowelForms = useQuery(
    api.careFiles.bladderBowel.getBladderBowelAssessmentsByResident,
    folderFormKeys.includes("blader-bowel-form") && residentId
      ? { residentId }
      : "skip"
  );

  const allMovingHandlingForms = useQuery(
    api.careFiles.movingHandling.getMovingHandlingAssessmentsByResident,
    folderFormKeys.includes("moving-handling-form") && residentId
      ? { residentId }
      : "skip"
  );

  const allLongTermFallsForms = useQuery(
    api.careFiles.longTermFalls.getLatestAssessmentByResident,
    folderFormKeys.includes("long-term-fall-risk-form") &&
      residentId &&
      organizationId
      ? {
          residentId,
          organizationId
        }
      : "skip"
  );

  const allAdmissionForms = useQuery(
    api.careFiles.admission.getAdmissionAssessmentsByResident,
    folderFormKeys.includes("admission-form") && residentId
      ? { residentId }
      : "skip"
  );

  const allPhotographyConsentForms = useQuery(
    api.careFiles.photographyConsent.getPhotographyConsentsByResident,
    folderFormKeys.includes("photography-consent") && residentId
      ? { residentId }
      : "skip"
  );

  const allDnacprForms = useQuery(
    api.careFiles.dnacpr.getDnacprsByResident,
    folderFormKeys.includes("dnacpr") && residentId ? { residentId } : "skip"
  );

  const allPeepForms = useQuery(
    api.careFiles.peep.getPeepsByResident,
    folderFormKeys.includes("peep") && residentId ? { residentId } : "skip"
  );

  const allDependencyAssessmentForms = useQuery(
    api.careFiles.dependency.getDependencyAssessmentsByResident,
    folderFormKeys.includes("dependency-assessment") && residentId
      ? { residentId }
      : "skip"
  );

  const allTimlAssessmentForms = useQuery(
    api.careFiles.timl.getTimlAssessmentsByResident,
    folderFormKeys.includes("timl") && residentId ? { residentId } : "skip"
  );

  const allSkinIntegrityForms = useQuery(
    api.careFiles.skinIntegrity.getSkinIntegrityAssessmentsByResident,
    folderFormKeys.includes("skin-integrity-form") &&
      residentId &&
      organizationId
      ? { residentId, organizationId }
      : "skip"
  );

  const allResidentValuablesForms = useQuery(
    api.careFiles.residentValuables.getResidentValuablesByResidentId,
    folderFormKeys.includes("resident-valuables-form") && residentId
      ? { residentId }
      : "skip"
  );

  const allHandlingProfileForms = useQuery(
    api.careFiles.handlingProfile.getHandlingProfilesByResident,
    folderFormKeys.includes("resident-handling-profile-form") && residentId
      ? { residentId }
      : "skip"
  );

  const latestCarePlanForm = useQuery(
    api.careFiles.carePlan.getLatestCarePlanByResidentAndFolder,
    includeCarePlans && residentId && folderKey
      ? { residentId, folderKey }
      : "skip"
  );

  // Helper function to get all PDFs from all form submissions for this folder
  const getAllPdfFiles = useMemo(() => {
    const pdfFiles: Array<{
      formKey: string;
      formId: string;
      name: string;
      url?: string;
      completedAt: number;
      isLatest: boolean;
    }> = [];

    // Process Pre-admission forms
    if (allPreAdmissionForms && folderFormKeys.includes("preAdmission-form")) {
      const sortedForms = [...allPreAdmissionForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      sortedForms.forEach((form, index) => {
        pdfFiles.push({
          formKey: "preAdmission-form",
          formId: form._id,
          name: "Pre-Admission Assessment",
          completedAt: form._creationTime,
          isLatest: index === 0
        });
      });
    }

    // Process Infection Prevention forms
    if (
      allInfectionPreventionForms &&
      folderFormKeys.includes("infection-prevention")
    ) {
      const sortedForms = [...allInfectionPreventionForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      sortedForms.forEach((form, index) => {
        pdfFiles.push({
          formKey: "infection-prevention",
          formId: form._id,
          name: "Infection Prevention Assessment",
          completedAt: form._creationTime,
          isLatest: index === 0
        });
      });
    }

    // Process Bladder/Bowel forms
    if (allBladderBowelForms && folderFormKeys.includes("blader-bowel-form")) {
      const sortedForms = [...allBladderBowelForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      sortedForms.forEach((form, index) => {
        pdfFiles.push({
          formKey: "blader-bowel-form",
          formId: form._id,
          name: "Bladder & Bowel Assessment",
          completedAt: form._creationTime,
          isLatest: index === 0
        });
      });
    }

    // Process Moving & Handling forms
    if (
      allMovingHandlingForms &&
      folderFormKeys.includes("moving-handling-form")
    ) {
      const sortedForms = [...allMovingHandlingForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      sortedForms.forEach((form, index) => {
        pdfFiles.push({
          formKey: "moving-handling-form",
          formId: form._id,
          name: "Moving & Handling Assessment",
          completedAt: form._creationTime,
          isLatest: index === 0
        });
      });
    }

    // Process Long Term Falls forms
    if (
      allLongTermFallsForms &&
      folderFormKeys.includes("long-term-fall-risk-form")
    ) {
      pdfFiles.push({
        formKey: "long-term-fall-risk-form",
        formId: allLongTermFallsForms._id,
        name: "Long Term Falls Risk Assessment",
        completedAt: allLongTermFallsForms._creationTime,
        isLatest: true // Since we only get the latest one
      });
    }

    // Process Admission forms
    if (allAdmissionForms && folderFormKeys.includes("admission-form")) {
      const sortedForms = [...allAdmissionForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      sortedForms.forEach((form, index) => {
        pdfFiles.push({
          formKey: "admission-form",
          formId: form._id,
          name: "Admission Assessment",
          completedAt: form._creationTime,
          isLatest: index === 0
        });
      });
    }

    // Process Photography Consent forms
    if (
      allPhotographyConsentForms &&
      folderFormKeys.includes("photography-consent")
    ) {
      const sortedForms = [...allPhotographyConsentForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      sortedForms.forEach((form, index) => {
        pdfFiles.push({
          formKey: "photography-consent",
          formId: form._id,
          name: "Photography Consent Form",
          completedAt: form._creationTime,
          isLatest: index === 0
        });
      });
    }

    // Process DNACPR forms
    if (allDnacprForms && folderFormKeys.includes("dnacpr")) {
      const sortedForms = [...allDnacprForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      sortedForms.forEach((form, index) => {
        pdfFiles.push({
          formKey: "dnacpr",
          formId: form._id,
          name: "DNACPR Form",
          completedAt: form._creationTime,
          isLatest: index === 0
        });
      });
    }

    // Process PEEP forms
    if (allPeepForms && folderFormKeys.includes("peep")) {
      const sortedForms = [...allPeepForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      sortedForms.forEach((form, index) => {
        pdfFiles.push({
          formKey: "peep",
          formId: form._id,
          name: "Personal Emergency Evacuation Plan",
          completedAt: form._creationTime,
          isLatest: index === 0
        });
      });
    }

    // Process Dependency Assessment forms
    if (
      allDependencyAssessmentForms &&
      folderFormKeys.includes("dependency-assessment")
    ) {
      const sortedForms = [...allDependencyAssessmentForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      sortedForms.forEach((form, index) => {
        pdfFiles.push({
          formKey: "dependency-assessment",
          formId: form._id,
          name: "Dependency Assessment",
          completedAt: form._creationTime,
          isLatest: index === 0
        });
      });
    }

    // Process TIML Assessment forms
    if (allTimlAssessmentForms && folderFormKeys.includes("timl")) {
      const sortedForms = [...allTimlAssessmentForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      sortedForms.forEach((form, index) => {
        pdfFiles.push({
          formKey: "timl",
          formId: form._id,
          name: "This Is My Life Assessment",
          completedAt: form._creationTime,
          isLatest: index === 0
        });
      });
    }

    // Process Skin Integrity Assessment forms
    if (
      allSkinIntegrityForms &&
      folderFormKeys.includes("skin-integrity-form")
    ) {
      const sortedForms = [...allSkinIntegrityForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      sortedForms.forEach((form, index) => {
        pdfFiles.push({
          formKey: "skin-integrity-form",
          formId: form._id,
          name: "Skin Integrity Assessment",
          completedAt: form._creationTime,
          isLatest: index === 0
        });
      });
    }

    // Process Resident Valuables forms
    if (
      allResidentValuablesForms &&
      folderFormKeys.includes("resident-valuables-form")
    ) {
      const sortedForms = [...allResidentValuablesForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      sortedForms.forEach((form, index) => {
        pdfFiles.push({
          formKey: "resident-valuables-form",
          formId: form._id,
          name: "Resident Valuables Assessment",
          completedAt: form._creationTime,
          isLatest: index === 0
        });
      });
    }

    // Process Resident Handling Profile forms
    if (
      allHandlingProfileForms &&
      folderFormKeys.includes("resident-handling-profile-form")
    ) {
      const sortedForms = [...allHandlingProfileForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      sortedForms.forEach((form, index) => {
        pdfFiles.push({
          formKey: "resident-handling-profile-form",
          formId: form._id,
          name: "Resident Handling Profile",
          completedAt: form._creationTime,
          isLatest: index === 0
        });
      });
    }

    // Sort all PDFs by completion date (newest first)
    const sortedPdfFiles = pdfFiles.sort(
      (a, b) => b.completedAt - a.completedAt
    );

    return sortedPdfFiles;
  }, [
    allPreAdmissionForms,
    allInfectionPreventionForms,
    allBladderBowelForms,
    allMovingHandlingForms,
    allLongTermFallsForms,
    allAdmissionForms,
    allPhotographyConsentForms,
    allDnacprForms,
    allPeepForms,
    allDependencyAssessmentForms,
    allTimlAssessmentForms,
    allSkinIntegrityForms,
    allResidentValuablesForms,
    allHandlingProfileForms,
    folderFormKeys
  ]);

  return {
    // All form arrays
    allPreAdmissionForms,
    allInfectionPreventionForms,
    allBladderBowelForms,
    allMovingHandlingForms,
    allLongTermFallsForms,
    allAdmissionForms,
    allPhotographyConsentForms,
    allDnacprForms,
    allPeepForms,
    allDependencyAssessmentForms,
    allTimlAssessmentForms,
    allSkinIntegrityForms,
    allResidentValuablesForms,
    allHandlingProfileForms,
    latestCarePlanForm,
    // Computed data
    getAllPdfFiles
  };
}
