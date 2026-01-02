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

  const dnacprForms = useQuery(api.careFiles.dnacpr.getDnacprsByResident, {
    residentId
  });

  const peepForms = useQuery(api.careFiles.peep.getPeepsByResident, {
    residentId
  });

  const dependencyAssessments = useQuery(
    api.careFiles.dependency.getDependencyAssessmentsByResident,
    { residentId }
  );

  const timlAssessments = useQuery(
    api.careFiles.timl.getTimlAssessmentsByResident,
    { residentId }
  );

  const skinIntegrityAssessments = useQuery(
    api.careFiles.skinIntegrity.getSkinIntegrityAssessmentsByResident,
    activeOrg?.id ? { residentId, organizationId: activeOrg.id } : "skip"
  );

  const residentValuablesAssessments = useQuery(
    api.careFiles.residentValuables.getResidentValuablesByResident,
    activeOrg?.id ? { residentId, organizationId: activeOrg.id } : "skip"
  );

  const handlingProfileForms = useQuery(
    api.careFiles.handlingProfile.getHandlingProfilesByResident,
    { residentId }
  );

  const painAssessmentForms = useQuery(
    api.careFiles.painAssessment.getPainAssessmentsByResident,
    activeOrg?.id ? { residentId, organizationId: activeOrg.id } : "skip"
  );

  const nutritionalAssessmentForms = useQuery(
    api.careFiles.nutritionalAssessment.getNutritionalAssessmentsByResident,
    activeOrg?.id ? { residentId, organizationId: activeOrg.id } : "skip"
  );

  const oralAssessmentForms = useQuery(
    api.careFiles.oralAssessment.getOralAssessmentsByResident,
    activeOrg?.id ? { residentId, organizationId: activeOrg.id } : "skip"
  );

  const dietNotificationForms = useQuery(
    api.careFiles.dietNotification.getDietNotificationsByResident,
    activeOrg?.id ? { residentId, organizationId: activeOrg.id } : "skip"
  );

  const chokingRiskAssessmentForms = useQuery(
    api.careFiles.chokingRiskAssessment.getChokingRiskAssessmentsByResident,
    activeOrg?.id ? { residentId, organizationId: activeOrg.id } : "skip"
  );

  const cornellDepressionScaleForms = useQuery(
    api.careFiles.cornellDepressionScale.getCornellDepressionScalesByResident,
    activeOrg?.id ? { residentId, organizationId: activeOrg.id } : "skip"
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
  const latestDnacprForm = dnacprForms?.sort(
    (a, b) => b._creationTime - a._creationTime
  )?.[0];
  const latestPeepForm = peepForms?.sort(
    (a, b) => b._creationTime - a._creationTime
  )?.[0];
  const latestDependencyAssessment = dependencyAssessments?.sort(
    (a, b) => b._creationTime - a._creationTime
  )?.[0];

  const latestTimlAssessment = timlAssessments?.sort(
    (a, b) => b._creationTime - a._creationTime
  )?.[0];

  const latestSkinIntegrityAssessment = skinIntegrityAssessments?.sort(
    (a, b) => b._creationTime - a._creationTime
  )?.[0];

  const latestResidentValuablesAssessment = residentValuablesAssessments?.sort(
    (a, b) => b._creationTime - a._creationTime
  )?.[0];

  const latestHandlingProfileForm = handlingProfileForms?.sort(
    (a, b) => b._creationTime - a._creationTime
  )?.[0];

  const latestPainAssessmentForm = painAssessmentForms?.sort(
    (a, b) => b._creationTime - a._creationTime
  )?.[0];

  const latestNutritionalAssessmentForm = nutritionalAssessmentForms?.sort(
    (a, b) => b._creationTime - a._creationTime
  )?.[0];

  const latestOralAssessmentForm = oralAssessmentForms?.sort(
    (a, b) => b._creationTime - a._creationTime
  )?.[0];

  const latestDietNotificationForm = dietNotificationForms?.sort(
    (a, b) => b._creationTime - a._creationTime
  )?.[0];

  const latestChokingRiskAssessmentForm = chokingRiskAssessmentForms?.sort(
    (a, b) => b._creationTime - a._creationTime
  )?.[0];

  const latestCornellDepressionScaleForm = cornellDepressionScaleForms?.sort(
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

  const dnacprPdfUrl = useQuery(
    api.careFiles.dnacpr.getPDFUrl,
    latestDnacprForm ? { dnacprId: latestDnacprForm._id } : "skip"
  );

  const peepPdfUrl = useQuery(
    api.careFiles.peep.getPDFUrl,
    latestPeepForm ? { peepId: latestPeepForm._id } : "skip"
  );

  const dependencyAssessmentPdfUrl = useQuery(
    api.careFiles.dependency.getPDFUrl,
    latestDependencyAssessment
      ? { assessmentId: latestDependencyAssessment._id }
      : "skip"
  );

  const timlPdfUrl = useQuery(
    api.careFiles.timl.getPDFUrl,
    latestTimlAssessment ? { assessmentId: latestTimlAssessment._id } : "skip"
  );

  const skinIntegrityPdfUrl = useQuery(
    api.careFiles.skinIntegrity.getPDFUrl,
    latestSkinIntegrityAssessment && activeOrg?.id
      ? {
          assessmentId: latestSkinIntegrityAssessment._id,
          organizationId: activeOrg.id
        }
      : "skip"
  );

  const residentValuablesPdfUrl = useQuery(
    api.careFiles.residentValuables.getPDFUrl,
    latestResidentValuablesAssessment && activeOrg?.id
      ? {
          assessmentId: latestResidentValuablesAssessment._id,
          organizationId: activeOrg.id
        }
      : "skip"
  );

  const handlingProfilePdfUrl = useQuery(
    api.careFiles.handlingProfile.getPDFUrl,
    latestHandlingProfileForm
      ? { profileId: latestHandlingProfileForm._id }
      : "skip"
  );

  const painAssessmentPdfUrl = useQuery(
    api.careFiles.painAssessment.getPDFUrl,
    latestPainAssessmentForm && activeOrg?.id
      ? {
          assessmentId: latestPainAssessmentForm._id,
          organizationId: activeOrg.id
        }
      : "skip"
  );

  const nutritionalAssessmentPdfUrl = useQuery(
    api.careFiles.nutritionalAssessment.getPDFUrl,
    latestNutritionalAssessmentForm && activeOrg?.id
      ? {
          assessmentId: latestNutritionalAssessmentForm._id,
          organizationId: activeOrg.id
        }
      : "skip"
  );

  const oralAssessmentPdfUrl = useQuery(
    api.careFiles.oralAssessment.getPDFUrl,
    latestOralAssessmentForm && activeOrg?.id
      ? {
          assessmentId: latestOralAssessmentForm._id,
          organizationId: activeOrg.id
        }
      : "skip"
  );

  const dietNotificationPdfUrl = useQuery(
    api.careFiles.dietNotification.getPDFUrl,
    latestDietNotificationForm && activeOrg?.id
      ? {
          notificationId: latestDietNotificationForm._id,
          organizationId: activeOrg.id
        }
      : "skip"
  );

  const chokingRiskAssessmentPdfUrl = useQuery(
    api.careFiles.chokingRiskAssessment.getPDFUrl,
    latestChokingRiskAssessmentForm && activeOrg?.id
      ? {
          assessmentId: latestChokingRiskAssessmentForm._id,
          organizationId: activeOrg.id
        }
      : "skip"
  );

  const cornellDepressionScalePdfUrl = useQuery(
    api.careFiles.cornellDepressionScale.getPDFUrl,
    latestCornellDepressionScaleForm && activeOrg?.id
      ? {
          assessmentId: latestCornellDepressionScaleForm._id,
          organizationId: activeOrg.id
        }
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
    if (latestDnacprForm) ids.push(latestDnacprForm._id);
    if (latestPeepForm) ids.push(latestPeepForm._id);
    if (latestDependencyAssessment) ids.push(latestDependencyAssessment._id);
    if (latestTimlAssessment) ids.push(latestTimlAssessment._id);
    if (latestSkinIntegrityAssessment)
      ids.push(latestSkinIntegrityAssessment._id);
    if (latestResidentValuablesAssessment)
      ids.push(latestResidentValuablesAssessment._id);
    if (latestHandlingProfileForm) ids.push(latestHandlingProfileForm._id);
    if (latestPainAssessmentForm) ids.push(latestPainAssessmentForm._id);
    if (latestNutritionalAssessmentForm) ids.push(latestNutritionalAssessmentForm._id);
    if (latestOralAssessmentForm) ids.push(latestOralAssessmentForm._id);
    if (latestDietNotificationForm) ids.push(latestDietNotificationForm._id);
    if (latestChokingRiskAssessmentForm) ids.push(latestChokingRiskAssessmentForm._id);
    if (latestCornellDepressionScaleForm) ids.push(latestCornellDepressionScaleForm._id);
    return ids;
  }, [
    latestPreAdmissionForm,
    latestInfectionPreventionAssessment,
    latestBladderBowelAssessment,
    latestMovingHandlingAssessment,
    latestLongTermFallsAssessment,
    latestAdmissionAssessment,
    latestPhotographyConsent,
    latestDnacprForm,
    latestPeepForm,
    latestDependencyAssessment,
    latestTimlAssessment,
    latestSkinIntegrityAssessment,
    latestResidentValuablesAssessment,
    latestHandlingProfileForm,
    latestPainAssessmentForm,
    latestNutritionalAssessmentForm,
    latestOralAssessmentForm,
    latestDietNotificationForm,
    latestChokingRiskAssessmentForm,
    latestCornellDepressionScaleForm
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
  // console.log("=== AUDIT STATUS DEBUG ===");
  // console.log("Raw form data:");
  // console.log("  preAdmissionForms:", preAdmissionForms);
  // console.log(
  //   "  infectionPreventionAssessments:",
  //   infectionPreventionAssessments
  // );
  // console.log("  bladderBowelAssessments:", bladderBowelAssessments);
  // console.log("  movingHandlingAssessments:", movingHandlingAssessments);
  // console.log("  longTermFallsAssessment:", longTermFallsAssessment);
  // console.log("  admissionAssessments:", admissionAssessments);
  // console.log("  photographyConsents:", photographyConsents);
  // console.log("  dnacprForms:", dnacprForms);
  // console.log("  peepForms:", peepForms);
  // console.log("  skinIntegrityAssessments:", skinIntegrityAssessments);
  // console.log("  residentValuablesAssessments:", residentValuablesAssessments);
  // console.log("formIds:", formIds);
  // console.log("auditStatus:", auditStatus);
  // console.log("latestPreAdmissionForm ID:", latestPreAdmissionForm?._id);
  // console.log(
  //   "latestInfectionPreventionAssessment ID:",
  //   latestInfectionPreventionAssessment?._id
  // );
  // console.log(
  //   "latestBladderBowelAssessment ID:",
  //   latestBladderBowelAssessment?._id
  // );
  // console.log(
  //   "latestMovingHandlingAssessment ID:",
  //   latestMovingHandlingAssessment?._id
  // );
  // console.log(
  //   "latestLongTermFallsAssessment ID:",
  //   latestLongTermFallsAssessment?._id
  // );
  // console.log("latestAdmissionAssessment ID:", latestAdmissionAssessment?._id);
  // console.log("latestPhotographyConsent ID:", latestPhotographyConsent?._id);
  // console.log("latestDnacprForm ID:", latestDnacprForm?._id);
  // console.log("latestPeepForm ID:", latestPeepForm?._id);

  // Helper function to determine form status
  const getFormStatus = (
    hasData: boolean,
    savedAsDraft: boolean | undefined,
    hasPdfFileId: boolean,
    pdfUrl: string | null | undefined
  ): CareFileFormStatus => {
    if (!hasData) return "not-started";
    if (savedAsDraft) return "in-progress";
    // Once form is submitted (not draft), it's completed regardless of PDF generation status
    // PDF generation happens in background and doesn't affect form completion status
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

    // console.log("Pre-admission audit lookup:");
    // console.log("  Form ID:", latestPreAdmissionForm?._id);
    // console.log("  Audit found:", preAdmissionAudit);
    // console.log("  Is audited:", preAdmissionAudit?.isAudited);

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

    // console.log("Infection prevention audit lookup:");
    // console.log("  Form ID:", latestInfectionPreventionAssessment?._id);
    // console.log("  Audit found:", infectionPreventionAudit);
    // console.log("  Is audited:", infectionPreventionAudit?.isAudited);

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

    // console.log("Moving handling audit lookup:");
    // console.log("  Form ID:", latestMovingHandlingAssessment?._id);
    // console.log("  Audit found:", movingHandlingAudit);
    // console.log("  Is audited:", movingHandlingAudit?.isAudited);

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

    // console.log("Long Term Falls audit lookup:");
    // console.log("  Form ID:", latestLongTermFallsAssessment?._id);
    // console.log("  Audit found:", longTermFallsAudit);
    // console.log("  Is audited:", longTermFallsAudit?.isAudited);

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

    // console.log("Admission audit lookup:");
    // console.log("  Form ID:", latestAdmissionAssessment?._id);
    // console.log("  Audit found:", admissionAudit);
    // console.log("  Is audited:", admissionAudit?.isAudited);

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

    // console.log("Photography consent audit lookup:");
    // console.log("  Form ID:", latestPhotographyConsent?._id);
    // console.log("  Audit found:", photographyConsentAudit);
    // console.log("  Is audited:", photographyConsentAudit?.isAudited);

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

    // DNACPR form
    const hasDnacprData = !!latestDnacprForm;
    const dnacprHasPdfFileId = !!(latestDnacprForm as any)?.pdfFileId;
    const dnacprAudit = latestDnacprForm
      ? auditStatus?.[latestDnacprForm._id as string]
      : undefined;

    // console.log("DNACPR audit lookup:");
    // console.log("  Form ID:", latestDnacprForm?._id);
    // console.log("  Audit found:", dnacprAudit);
    // console.log("  Is audited:", dnacprAudit?.isAudited);

    state["dnacpr"] = {
      status: getFormStatus(
        hasDnacprData,
        latestDnacprForm?.status === "draft",
        dnacprHasPdfFileId,
        dnacprPdfUrl
      ),
      hasData: hasDnacprData,
      hasPdfFileId: dnacprHasPdfFileId,
      pdfUrl: dnacprPdfUrl,
      lastUpdated: latestDnacprForm?._creationTime,
      completedAt:
        latestDnacprForm?.status !== "draft"
          ? latestDnacprForm?.submittedAt
          : undefined,
      isAudited: dnacprAudit?.isAudited || false,
      auditedAt: dnacprAudit?.auditedAt,
      auditedBy: dnacprAudit?.auditedBy
    };

    // PEEP form
    const hasPeepData = !!latestPeepForm;
    const peepHasPdfFileId = !!(latestPeepForm as any)?.pdfFileId;
    const peepAudit = latestPeepForm
      ? auditStatus?.[latestPeepForm._id as string]
      : undefined;

    // console.log("PEEP audit lookup:");
    // console.log("  Form ID:", latestPeepForm?._id);
    // console.log("  Audit found:", peepAudit);
    // console.log("  Is audited:", peepAudit?.isAudited);

    state["peep"] = {
      status: getFormStatus(
        hasPeepData,
        latestPeepForm?.status === "draft",
        peepHasPdfFileId,
        peepPdfUrl
      ),
      hasData: hasPeepData,
      hasPdfFileId: peepHasPdfFileId,
      pdfUrl: peepPdfUrl,
      lastUpdated: latestPeepForm?._creationTime,
      completedAt:
        latestPeepForm?.status !== "draft"
          ? latestPeepForm?.submittedAt
          : undefined,
      isAudited: peepAudit?.isAudited || false,
      auditedAt: peepAudit?.auditedAt,
      auditedBy: peepAudit?.auditedBy
    };

    // Dependency Assessment form
    const hasDependencyAssessmentData = !!latestDependencyAssessment;
    const dependencyAssessmentHasPdfFileId = !!(
      latestDependencyAssessment as any
    )?.pdfFileId;
    const dependencyAssessmentAudit = latestDependencyAssessment
      ? auditStatus?.[latestDependencyAssessment._id as string]
      : undefined;

    state["dependency-assessment"] = {
      status: getFormStatus(
        hasDependencyAssessmentData,
        latestDependencyAssessment?.status === "draft",
        dependencyAssessmentHasPdfFileId,
        dependencyAssessmentPdfUrl
      ),
      hasData: hasDependencyAssessmentData,
      hasPdfFileId: dependencyAssessmentHasPdfFileId,
      pdfUrl: dependencyAssessmentPdfUrl,
      lastUpdated: latestDependencyAssessment?._creationTime,
      completedAt:
        latestDependencyAssessment?.status !== "draft"
          ? latestDependencyAssessment?.submittedAt
          : undefined,
      isAudited: dependencyAssessmentAudit?.isAudited || false,
      auditedAt: dependencyAssessmentAudit?.auditedAt,
      auditedBy: dependencyAssessmentAudit?.auditedBy
    };

    // TIML Assessment form
    const hasTimlData = !!latestTimlAssessment;
    const timlHasPdfFileId = !!(latestTimlAssessment as any)?.pdfFileId;
    const timlAudit = latestTimlAssessment
      ? auditStatus?.[latestTimlAssessment._id as string]
      : undefined;

    // console.log("TIML audit lookup:");
    // console.log("  Form ID:", latestTimlAssessment?._id);
    // console.log("  Audit found:", timlAudit);
    // console.log("  Is audited:", timlAudit?.isAudited);

    state["timl"] = {
      status: getFormStatus(
        hasTimlData,
        latestTimlAssessment?.status === "draft",
        timlHasPdfFileId,
        timlPdfUrl
      ),
      hasData: hasTimlData,
      hasPdfFileId: timlHasPdfFileId,
      pdfUrl: timlPdfUrl,
      lastUpdated: latestTimlAssessment?._creationTime,
      completedAt:
        latestTimlAssessment?.status !== "draft"
          ? latestTimlAssessment?.submittedAt
          : undefined,
      isAudited: timlAudit?.isAudited || false,
      auditedAt: timlAudit?.auditedAt,
      auditedBy: timlAudit?.auditedBy
    };

    // Skin Integrity Assessment form
    const hasSkinIntegrityData = !!latestSkinIntegrityAssessment;
    const skinIntegrityHasPdfFileId = !!(latestSkinIntegrityAssessment as any)
      ?.pdfFileId;
    const skinIntegrityAudit = latestSkinIntegrityAssessment
      ? auditStatus?.[latestSkinIntegrityAssessment._id as string]
      : undefined;

    // console.log("Skin Integrity audit lookup:");
    // console.log("  Form ID:", latestSkinIntegrityAssessment?._id);
    // console.log("  Audit found:", skinIntegrityAudit);
    // console.log("  Is audited:", skinIntegrityAudit?.isAudited);

    state["skin-integrity-form"] = {
      status: getFormStatus(
        hasSkinIntegrityData,
        latestSkinIntegrityAssessment?.status === "draft",
        skinIntegrityHasPdfFileId,
        skinIntegrityPdfUrl
      ),
      hasData: hasSkinIntegrityData,
      hasPdfFileId: skinIntegrityHasPdfFileId,
      pdfUrl: skinIntegrityPdfUrl,
      lastUpdated: latestSkinIntegrityAssessment?._creationTime,
      completedAt:
        latestSkinIntegrityAssessment?.status !== "draft"
          ? latestSkinIntegrityAssessment?.submittedAt
          : undefined,
      isAudited: skinIntegrityAudit?.isAudited || false,
      auditedAt: skinIntegrityAudit?.auditedAt,
      auditedBy: skinIntegrityAudit?.auditedBy
    };

    // Resident Valuables Assessment form
    const hasResidentValuablesData = !!latestResidentValuablesAssessment;
    const residentValuablesHasPdfFileId = !!(
      latestResidentValuablesAssessment as any
    )?.pdfFileId;
    const residentValuablesAudit = latestResidentValuablesAssessment
      ? auditStatus?.[latestResidentValuablesAssessment._id as string]
      : undefined;

    // console.log("Resident Valuables audit lookup:");
    // console.log("  Form ID:", latestResidentValuablesAssessment?._id);
    // console.log("  Audit found:", residentValuablesAudit);
    // console.log("  Is audited:", residentValuablesAudit?.isAudited);

    state["resident-valuables-form"] = {
      status: getFormStatus(
        hasResidentValuablesData,
        false, // Resident valuables doesn't support draft mode
        residentValuablesHasPdfFileId,
        residentValuablesPdfUrl
      ),
      hasData: hasResidentValuablesData,
      hasPdfFileId: residentValuablesHasPdfFileId,
      pdfUrl: residentValuablesPdfUrl,
      lastUpdated: latestResidentValuablesAssessment?._creationTime,
      completedAt: latestResidentValuablesAssessment?._creationTime,
      isAudited: residentValuablesAudit?.isAudited || false,
      auditedAt: residentValuablesAudit?.auditedAt,
      auditedBy: residentValuablesAudit?.auditedBy
    };

    // Resident Handling Profile form
    const hasHandlingProfileData = !!latestHandlingProfileForm;
    const handlingProfileHasPdfFileId = !!(latestHandlingProfileForm as any)
      ?.pdfFileId;
    const handlingProfileAudit = latestHandlingProfileForm
      ? auditStatus?.[latestHandlingProfileForm._id as string]
      : undefined;

    state["resident-handling-profile-form"] = {
      status: getFormStatus(
        hasHandlingProfileData,
        false,
        handlingProfileHasPdfFileId,
        handlingProfilePdfUrl
      ),
      hasData: hasHandlingProfileData,
      hasPdfFileId: handlingProfileHasPdfFileId,
      pdfUrl: handlingProfilePdfUrl,
      lastUpdated: latestHandlingProfileForm?._creationTime,
      completedAt: latestHandlingProfileForm?._creationTime,
      isAudited: handlingProfileAudit?.isAudited || false,
      auditedAt: handlingProfileAudit?.auditedAt,
      auditedBy: handlingProfileAudit?.auditedBy
    };

    // Pain Assessment
    const hasPainAssessmentData = !!latestPainAssessmentForm;
    const painAssessmentHasPdfFileId = !!(latestPainAssessmentForm as any)
      ?.pdfFileId;
    const painAssessmentAudit = latestPainAssessmentForm
      ? auditStatus?.[latestPainAssessmentForm._id as string]
      : undefined;

    state["pain-assessment-form"] = {
      status: getFormStatus(
        hasPainAssessmentData,
        latestPainAssessmentForm?.status === "draft",
        painAssessmentHasPdfFileId,
        painAssessmentPdfUrl
      ),
      hasData: hasPainAssessmentData,
      hasPdfFileId: painAssessmentHasPdfFileId,
      pdfUrl: painAssessmentPdfUrl,
      lastUpdated: latestPainAssessmentForm?._creationTime,
      completedAt:
        latestPainAssessmentForm?.status !== "draft"
          ? latestPainAssessmentForm?.submittedAt
          : undefined,
      isAudited: painAssessmentAudit?.isAudited || false,
      auditedAt: painAssessmentAudit?.auditedAt,
      auditedBy: painAssessmentAudit?.auditedBy
    };

    // Nutritional Assessment
    const hasNutritionalAssessmentData = !!latestNutritionalAssessmentForm;
    const nutritionalAssessmentHasPdfFileId = !!(latestNutritionalAssessmentForm as any)
      ?.pdfFileId;
    const nutritionalAssessmentAudit = latestNutritionalAssessmentForm
      ? auditStatus?.[latestNutritionalAssessmentForm._id as string]
      : undefined;

    state["nutritional-assessment-form"] = {
      status: getFormStatus(
        hasNutritionalAssessmentData,
        latestNutritionalAssessmentForm?.status === "draft",
        nutritionalAssessmentHasPdfFileId,
        nutritionalAssessmentPdfUrl
      ),
      hasData: hasNutritionalAssessmentData,
      hasPdfFileId: nutritionalAssessmentHasPdfFileId,
      pdfUrl: nutritionalAssessmentPdfUrl,
      lastUpdated: latestNutritionalAssessmentForm?._creationTime,
      completedAt:
        latestNutritionalAssessmentForm?.status !== "draft"
          ? latestNutritionalAssessmentForm?.submittedAt
          : undefined,
      isAudited: nutritionalAssessmentAudit?.isAudited || false,
      auditedAt: nutritionalAssessmentAudit?.auditedAt,
      auditedBy: nutritionalAssessmentAudit?.auditedBy
    };

    // Oral Assessment
    const hasOralAssessmentData = !!latestOralAssessmentForm;
    const oralAssessmentHasPdfFileId = !!(latestOralAssessmentForm as any)
      ?.pdfFileId;
    const oralAssessmentAudit = latestOralAssessmentForm
      ? auditStatus?.[latestOralAssessmentForm._id as string]
      : undefined;

    state["oral-assessment-form"] = {
      status: getFormStatus(
        hasOralAssessmentData,
        latestOralAssessmentForm?.status === "draft",
        oralAssessmentHasPdfFileId,
        oralAssessmentPdfUrl
      ),
      hasData: hasOralAssessmentData,
      hasPdfFileId: oralAssessmentHasPdfFileId,
      pdfUrl: oralAssessmentPdfUrl,
      lastUpdated: latestOralAssessmentForm?._creationTime,
      completedAt:
        latestOralAssessmentForm?.status !== "draft"
          ? latestOralAssessmentForm?.submittedAt
          : undefined,
      isAudited: oralAssessmentAudit?.isAudited || false,
      auditedAt: oralAssessmentAudit?.auditedAt,
      auditedBy: oralAssessmentAudit?.auditedBy
    };

    // Diet Notification
    const hasDietNotificationData = !!latestDietNotificationForm;
    const dietNotificationHasPdfFileId = !!(latestDietNotificationForm as any)
      ?.pdfFileId;
    const dietNotificationAudit = latestDietNotificationForm
      ? auditStatus?.[latestDietNotificationForm._id as string]
      : undefined;

    state["diet-notification-form"] = {
      status: getFormStatus(
        hasDietNotificationData,
        latestDietNotificationForm?.status === "draft",
        dietNotificationHasPdfFileId,
        dietNotificationPdfUrl
      ),
      hasData: hasDietNotificationData,
      hasPdfFileId: dietNotificationHasPdfFileId,
      pdfUrl: dietNotificationPdfUrl,
      lastUpdated: latestDietNotificationForm?._creationTime,
      completedAt:
        latestDietNotificationForm?.status !== "draft"
          ? latestDietNotificationForm?.submittedAt
          : undefined,
      isAudited: dietNotificationAudit?.isAudited || false,
      auditedAt: dietNotificationAudit?.auditedAt,
      auditedBy: dietNotificationAudit?.auditedBy
    };

    // Choking Risk Assessment
    const hasChokingRiskAssessmentData = !!latestChokingRiskAssessmentForm;
    const chokingRiskAssessmentHasPdfFileId = !!(latestChokingRiskAssessmentForm as any)
      ?.pdfFileId;
    const chokingRiskAssessmentAudit = latestChokingRiskAssessmentForm
      ? auditStatus?.[latestChokingRiskAssessmentForm._id as string]
      : undefined;

    state["choking-risk-assessment-form"] = {
      status: getFormStatus(
        hasChokingRiskAssessmentData,
        latestChokingRiskAssessmentForm?.status === "draft",
        chokingRiskAssessmentHasPdfFileId,
        chokingRiskAssessmentPdfUrl
      ),
      hasData: hasChokingRiskAssessmentData,
      hasPdfFileId: chokingRiskAssessmentHasPdfFileId,
      pdfUrl: chokingRiskAssessmentPdfUrl,
      lastUpdated: latestChokingRiskAssessmentForm?._creationTime,
      completedAt:
        latestChokingRiskAssessmentForm?.status !== "draft"
          ? latestChokingRiskAssessmentForm?.submittedAt
          : undefined,
      isAudited: chokingRiskAssessmentAudit?.isAudited || false,
      auditedAt: chokingRiskAssessmentAudit?.auditedAt,
      auditedBy: chokingRiskAssessmentAudit?.auditedBy
    };

    // Cornell Depression Scale
    const hasCornellDepressionScaleData = !!latestCornellDepressionScaleForm;
    const cornellDepressionScaleHasPdfFileId = !!(latestCornellDepressionScaleForm as any)
      ?.pdfFileId;
    const cornellDepressionScaleAudit = latestCornellDepressionScaleForm
      ? auditStatus?.[latestCornellDepressionScaleForm._id as string]
      : undefined;

    state["cornell-depression-scale-form"] = {
      status: getFormStatus(
        hasCornellDepressionScaleData,
        latestCornellDepressionScaleForm?.status === "draft",
        cornellDepressionScaleHasPdfFileId,
        cornellDepressionScalePdfUrl
      ),
      hasData: hasCornellDepressionScaleData,
      hasPdfFileId: cornellDepressionScaleHasPdfFileId,
      pdfUrl: cornellDepressionScalePdfUrl,
      lastUpdated: latestCornellDepressionScaleForm?._creationTime,
      completedAt:
        latestCornellDepressionScaleForm?.status !== "draft"
          ? latestCornellDepressionScaleForm?._creationTime
          : undefined,
      isAudited: cornellDepressionScaleAudit?.isAudited || false,
      auditedAt: cornellDepressionScaleAudit?.auditedAt,
      auditedBy: cornellDepressionScaleAudit?.auditedBy
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
    latestDnacprForm,
    latestPeepForm,
    latestDependencyAssessment,
    latestTimlAssessment,
    latestSkinIntegrityAssessment,
    latestResidentValuablesAssessment,
    latestHandlingProfileForm,
    latestPainAssessmentForm,
    preAdmissionPdfUrl,
    infectionPreventionPdfUrl,
    bladderBowelPdfUrl,
    movingHandlingPdfUrl,
    longTermFallsPdfUrl,
    admissionPdfUrl,
    photographyConsentPdfUrl,
    dnacprPdfUrl,
    peepPdfUrl,
    dependencyAssessmentPdfUrl,
    timlPdfUrl,
    skinIntegrityPdfUrl,
    residentValuablesPdfUrl,
    handlingProfilePdfUrl,
    painAssessmentPdfUrl,
    nutritionalAssessmentPdfUrl,
    oralAssessmentPdfUrl,
    dietNotificationPdfUrl,
    chokingRiskAssessmentPdfUrl,
    latestCornellDepressionScaleForm,
    cornellDepressionScalePdfUrl,
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
    latestDnacprForm,
    latestPeepForm,
    // All assessments for reference
    admissionAssessments,
    photographyConsents,
    dnacprForms,
    peepForms,
    skinIntegrityAssessments,
    residentValuablesAssessments,
    handlingProfileForms,
    latestHandlingProfileForm
  };
}
