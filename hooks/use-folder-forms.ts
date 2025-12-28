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

  const allPainAssessmentForms = useQuery(
    api.careFiles.painAssessment.getPainAssessmentsByResident,
    folderFormKeys.includes("pain-assessment-form") &&
      residentId &&
      organizationId
      ? { residentId, organizationId }
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

    // Process Pre-admission forms (only show latest)
    if (allPreAdmissionForms && folderFormKeys.includes("preAdmission-form")) {
      const sortedForms = [...allPreAdmissionForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      if (sortedForms.length > 0) {
        pdfFiles.push({
          formKey: "preAdmission-form",
          formId: sortedForms[0]._id,
          name: "Pre-Admission Assessment",
          completedAt: sortedForms[0]._creationTime,
          isLatest: true
        });
      }
    }

    // Process Infection Prevention forms (only show latest)
    if (
      allInfectionPreventionForms &&
      folderFormKeys.includes("infection-prevention")
    ) {
      const sortedForms = [...allInfectionPreventionForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      if (sortedForms.length > 0) {
        pdfFiles.push({
          formKey: "infection-prevention",
          formId: sortedForms[0]._id,
          name: "Infection Prevention Assessment",
          completedAt: sortedForms[0]._creationTime,
          isLatest: true
        });
      }
    }

    // Process Bladder/Bowel forms (only show latest)
    if (allBladderBowelForms && folderFormKeys.includes("blader-bowel-form")) {
      const sortedForms = [...allBladderBowelForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      if (sortedForms.length > 0) {
        pdfFiles.push({
          formKey: "blader-bowel-form",
          formId: sortedForms[0]._id,
          name: "Bladder & Bowel Assessment",
          completedAt: sortedForms[0]._creationTime,
          isLatest: true
        });
      }
    }

    // Process Moving & Handling forms (only show latest)
    if (
      allMovingHandlingForms &&
      folderFormKeys.includes("moving-handling-form")
    ) {
      const sortedForms = [...allMovingHandlingForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      // Only add the latest form to Files section, older ones go to Archive
      if (sortedForms.length > 0) {
        pdfFiles.push({
          formKey: "moving-handling-form",
          formId: sortedForms[0]._id,
          name: "Moving & Handling Assessment",
          completedAt: sortedForms[0]._creationTime,
          isLatest: true
        });
      }
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

    // Process Admission forms (only show latest)
    if (allAdmissionForms && folderFormKeys.includes("admission-form")) {
      const sortedForms = [...allAdmissionForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      // Only add the latest form to Files section, older ones go to Archive
      if (sortedForms.length > 0) {
        pdfFiles.push({
          formKey: "admission-form",
          formId: sortedForms[0]._id,
          name: "Admission Assessment",
          completedAt: sortedForms[0]._creationTime,
          isLatest: true
        });
      }
    }

    // Process Photography Consent forms (only show latest)
    if (
      allPhotographyConsentForms &&
      folderFormKeys.includes("photography-consent")
    ) {
      const sortedForms = [...allPhotographyConsentForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      if (sortedForms.length > 0) {
        pdfFiles.push({
          formKey: "photography-consent",
          formId: sortedForms[0]._id,
          name: "Photography Consent Form",
          completedAt: sortedForms[0]._creationTime,
          isLatest: true
        });
      }
    }

    // Process DNACPR forms (only show latest)
    if (allDnacprForms && folderFormKeys.includes("dnacpr")) {
      const sortedForms = [...allDnacprForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      if (sortedForms.length > 0) {
        pdfFiles.push({
          formKey: "dnacpr",
          formId: sortedForms[0]._id,
          name: "DNACPR Form",
          completedAt: sortedForms[0]._creationTime,
          isLatest: true
        });
      }
    }

    // Process PEEP forms (only show latest)
    if (allPeepForms && folderFormKeys.includes("peep")) {
      const sortedForms = [...allPeepForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      if (sortedForms.length > 0) {
        pdfFiles.push({
          formKey: "peep",
          formId: sortedForms[0]._id,
          name: "Personal Emergency Evacuation Plan",
          completedAt: sortedForms[0]._creationTime,
          isLatest: true
        });
      }
    }

    // Process Dependency Assessment forms (only show latest)
    if (
      allDependencyAssessmentForms &&
      folderFormKeys.includes("dependency-assessment")
    ) {
      const sortedForms = [...allDependencyAssessmentForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      if (sortedForms.length > 0) {
        pdfFiles.push({
          formKey: "dependency-assessment",
          formId: sortedForms[0]._id,
          name: "Dependency Assessment",
          completedAt: sortedForms[0]._creationTime,
          isLatest: true
        });
      }
    }

    // Process TIML Assessment forms (only show latest)
    if (allTimlAssessmentForms && folderFormKeys.includes("timl")) {
      const sortedForms = [...allTimlAssessmentForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      if (sortedForms.length > 0) {
        pdfFiles.push({
          formKey: "timl",
          formId: sortedForms[0]._id,
          name: "This Is My Life Assessment",
          completedAt: sortedForms[0]._creationTime,
          isLatest: true
        });
      }
    }

    // Process Skin Integrity Assessment forms (only show latest)
    if (
      allSkinIntegrityForms &&
      folderFormKeys.includes("skin-integrity-form")
    ) {
      const sortedForms = [...allSkinIntegrityForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      if (sortedForms.length > 0) {
        pdfFiles.push({
          formKey: "skin-integrity-form",
          formId: sortedForms[0]._id,
          name: "Skin Integrity Assessment",
          completedAt: sortedForms[0]._creationTime,
          isLatest: true
        });
      }
    }

    // Process Resident Valuables forms (only show latest)
    if (
      allResidentValuablesForms &&
      folderFormKeys.includes("resident-valuables-form")
    ) {
      const sortedForms = [...allResidentValuablesForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      if (sortedForms.length > 0) {
        pdfFiles.push({
          formKey: "resident-valuables-form",
          formId: sortedForms[0]._id,
          name: "Resident Valuables Assessment",
          completedAt: sortedForms[0]._creationTime,
          isLatest: true
        });
      }
    }

    // Process Resident Handling Profile forms (only show latest)
    if (
      allHandlingProfileForms &&
      folderFormKeys.includes("resident-handling-profile-form")
    ) {
      const sortedForms = [...allHandlingProfileForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      if (sortedForms.length > 0) {
        pdfFiles.push({
          formKey: "resident-handling-profile-form",
          formId: sortedForms[0]._id,
          name: "Resident Handling Profile",
          completedAt: sortedForms[0]._creationTime,
          isLatest: true
        });
      }
    }

    // Process Pain Assessment forms (only show latest)
    if (
      allPainAssessmentForms &&
      folderFormKeys.includes("pain-assessment-form")
    ) {
      const sortedForms = [...allPainAssessmentForms].sort(
        (a, b) => b._creationTime - a._creationTime
      );
      // Only add the latest form to Files section, older ones go to Archive
      if (sortedForms.length > 0) {
        pdfFiles.push({
          formKey: "pain-assessment-form",
          formId: sortedForms[0]._id,
          name: "Pain Assessment and Evaluation",
          completedAt: sortedForms[0]._creationTime,
          isLatest: true
        });
      }
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
    allPainAssessmentForms,
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
    allPainAssessmentForms,
    latestCarePlanForm,
    // Computed data
    getAllPdfFiles
  };
}
