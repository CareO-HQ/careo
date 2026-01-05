"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import { FileText } from "lucide-react";

interface RiskAssessmentViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessment: {
    formKey: string;
    formId: string;
    name: string;
    completedAt: number;
    category: string;
  };
}

export default function RiskAssessmentViewDialog({
  open,
  onOpenChange,
  assessment
}: RiskAssessmentViewDialogProps) {
  // Fetch the assessment data based on the form key
  const getQueryFunction = () => {
    switch (assessment.formKey) {
      case "infection-prevention":
        return api.careFiles.infectionPrevention.getInfectionPreventionAssessment;
      case "moving-handling-form":
        return api.careFiles.movingHandling.getMovingHandlingAssessment;
      case "bedrail-consent-form":
        return api.careFiles.bedrailConsent.getBedrailConsent;
      case "bed-rails-risk-assessment-form":
        return api.careFiles.bedRailsRiskAssessment.getBedRailsRiskAssessment;
      case "long-term-fall-risk-form":
        return api.careFiles.longTermFalls.getLongTermFallsAssessment;
      case "blader-bowel-form":
        return api.careFiles.bladderBowel.getBladderBowelAssessment;
      case "preAdmission-form":
        return api.careFiles.preadmission.getPreAdmissionForm;
      case "admission-form":
        return api.careFiles.admission.getAdmissionAssessmentById;
      case "dnacpr":
        return api.careFiles.dnacpr.getDnacprById;
      case "peep":
        return api.careFiles.peep.getPeepById;
      case "dependency-assessment":
        return api.careFiles.dependency.getDependencyAssessmentById;
      case "timl":
        return api.careFiles.timl.getTimlAssessmentById;
      case "skin-integrity-form":
        return api.careFiles.skinIntegrity.getSkinIntegrityAssessment;
      case "resident-valuables-form":
        return api.careFiles.residentValuables.getResidentValuablesById;
      case "photography-consent":
        return api.careFiles.photographyConsent.getPhotographyConsentById;
      case "pain-assessment-form":
        return api.careFiles.painAssessment.getPainAssessment;
      case "resident-handling-profile-form":
        return api.careFiles.handlingProfile.getHandlingProfileById;
      case "nutritional-assessment-form":
        return api.careFiles.nutritionalAssessment.getNutritionalAssessment;
      case "oral-assessment-form":
        return api.careFiles.oralAssessment.getOralAssessment;
      case "diet-notification-form":
        return api.careFiles.dietNotification.getDietNotification;
      case "choking-risk-assessment-form":
        return api.careFiles.chokingRiskAssessment.getChokingRiskAssessment;
      case "cornell-depression-scale-form":
        return api.careFiles.cornellDepressionScale.getCornellDepressionScale;
      case "best-interest-decision-form":
        return api.careFiles.bestInterestDecision.getBestInterestDecision;
      default:
        return "skip";
    }
  };

  const getQueryParams = () => {
    const formKey = assessment.formKey;
    if (formKey === "infection-prevention") return { id: assessment.formId as Id<"infectionPreventionAssessments"> };
    if (formKey === "moving-handling-form") return { id: assessment.formId as Id<"movingHandlingAssessments"> };
    if (formKey === "bedrail-consent-form") return { id: assessment.formId as Id<"bedrailConsents"> };
    if (formKey === "bed-rails-risk-assessment-form") return { assessmentId: assessment.formId as Id<"bedRailsRiskAssessments"> };
    if (formKey === "long-term-fall-risk-form") return { id: assessment.formId as Id<"longTermFallsAssessments"> };
    if (formKey === "blader-bowel-form") return { id: assessment.formId as Id<"bladderBowelAssessments"> };
    if (formKey === "preAdmission-form") return { id: assessment.formId as Id<"preAdmissionCareFiles"> };
    if (formKey === "admission-form") return { assessmentId: assessment.formId as Id<"admissionAssesments"> };
    if (formKey === "dnacpr") return { dnacprId: assessment.formId as Id<"dnacprs"> };
    if (formKey === "peep") return { peepId: assessment.formId as Id<"peeps"> };
    if (formKey === "dependency-assessment") return { assessmentId: assessment.formId as Id<"dependencyAssessments"> };
    if (formKey === "timl") return { assessmentId: assessment.formId as Id<"timlAssessments"> };
    if (formKey === "skin-integrity-form") return { assessmentId: assessment.formId as Id<"skinIntegrityAssessments"> };
    if (formKey === "resident-valuables-form") return { assessmentId: assessment.formId as Id<"residentValuablesAssessments"> };
    if (formKey === "photography-consent") return { consentId: assessment.formId as Id<"photographyConsents"> };
    if (formKey === "pain-assessment-form") return { assessmentId: assessment.formId as Id<"painAssessments"> };
    if (formKey === "resident-handling-profile-form") return { profileId: assessment.formId as Id<"residentHandlingProfileForm"> };
    if (formKey === "nutritional-assessment-form") return { assessmentId: assessment.formId as Id<"nutritionalAssessments"> };
    if (formKey === "oral-assessment-form") return { assessmentId: assessment.formId as Id<"oralAssessments"> };
    if (formKey === "diet-notification-form") return { notificationId: assessment.formId as Id<"dietNotifications"> };
    if (formKey === "choking-risk-assessment-form") return { assessmentId: assessment.formId as Id<"chokingRiskAssessments"> };
    if (formKey === "cornell-depression-scale-form") return { assessmentId: assessment.formId as Id<"cornellDepressionScales"> };
    if (formKey === "best-interest-decision-form") return { decisionId: assessment.formId as Id<"bestInterestDecisions"> };
    return "skip";
  };

  const assessmentData = useQuery(getQueryFunction(), getQueryParams());

  if (!assessmentData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Loading Assessment</DialogTitle>
            <DialogDescription>Please wait while we load the assessment details...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Infection Control":
        return "bg-blue-50 text-blue-700";
      case "Moving & Handling":
        return "bg-orange-50 text-orange-700";
      case "Fall Risk":
        return "bg-red-50 text-red-700";
      case "Risk Assessment":
        return "bg-amber-50 text-amber-700";
      case "Continence":
        return "bg-purple-50 text-purple-700";
      case "Medication":
        return "bg-green-50 text-green-700";
      case "Nutrition":
        return "bg-emerald-50 text-emerald-700";
      case "Capacity":
        return "bg-indigo-50 text-indigo-700";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  const renderAssessmentContent = () => {
    // Render different content based on assessment type
    const data = assessmentData as any;

    return (
      <div className="space-y-4">
        {Object.entries(data).map(([key, value]) => {
          // Skip internal fields
          if (
            key.startsWith("_") ||
            key === "residentId" ||
            key === "userId" ||
            key === "organizationId" ||
            key === "teamId" ||
            key === "createdBy" || // Skip createdBy ID, we show createdByName instead
            key === "updatedBy" ||
            key === "pdfFileId" ||
            key === "pdfGenerated" ||
            key === "pdfGeneratedAt" ||
            key === "isArchived" ||
            key === "archivedAt" ||
            key === "savedAsDraft" ||
            key === "updatedAt" ||
            // Skip consent sections as they're handled specially above
            (key === "ableToConsentSection" && assessment.formKey === "bedrail-consent-form") ||
            (key === "unableToConsentSection" && assessment.formKey === "bedrail-consent-form") ||
            // Skip bed rails risk assessment fields that are handled specially
            (key === "exclusionCriteria" && assessment.formKey === "bed-rails-risk-assessment-form") ||
            (key === "authorizationRationale" && assessment.formKey === "bed-rails-risk-assessment-form") ||
            (key === "safetyChecklist" && assessment.formKey === "bed-rails-risk-assessment-form") ||
            (key === "extendedHeightChecks" && assessment.formKey === "bed-rails-risk-assessment-form")
          ) {
            return null;
          }

          // Format the key to be more readable
          const formattedKey = key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase())
            .trim();

          // Special handling for Date of Birth
          if (key === "dateOfBirth") {
            const dateValue = typeof value === "number" ? new Date(value) : null;
            return (
              <div key={key} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Date of Birth</p>
                <p className="text-sm leading-relaxed">
                  {dateValue ? format(dateValue, "dd MMM yyyy") : "Not available"}
                </p>
              </div>
            );
          }

          // Special handling for Bed Rails Risk Assessment fields
          if (assessment.formKey === "bed-rails-risk-assessment-form") {
            // Type of Bed
            if (key === "typeOfBed") {
              const bedTypeMap: Record<string, string> = {
                "DIVAN": "Divan Bed",
                "PROFILING_BED": "Profiling Bed"
              };
              return (
                <div key={key} className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Type of Bed</p>
                  <p className="text-sm leading-relaxed">{bedTypeMap[value as string] || value}</p>
                </div>
              );
            }

            // Type of Mattress
            if (key === "typeOfMattress") {
              const mattressTypeMap: Record<string, string> = {
                "STANDARD": "Standard Mattress",
                "LIGHTWEIGHT_FOAM": "Lightweight Foam Mattress",
                "STANDARD_WITH_OVERLAY": "Standard Mattress with Overlay",
                "FULL_REPLACEMENT": "Full Replacement Mattress"
              };
              return (
                <div key={key} className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Type of Mattress</p>
                  <p className="text-sm leading-relaxed">{mattressTypeMap[value as string] || value}</p>
                </div>
              );
            }

            // Type of Bedrails
            if (key === "typeOfBedrails") {
              const bedrailTypeMap: Record<string, string> = {
                "INTEGRAL_FIXED": "Integral Fixed Bedrails",
                "EXTENDED_HEIGHT_INTEGRAL": "Extended Height Integral Bedrails",
                "EXTENDED_HEIGHT_NON_INTEGRAL": "Extended Height Non-Integral Bedrails"
              };
              return (
                <div key={key} className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Type of Bedrails</p>
                  <p className="text-sm leading-relaxed">{bedrailTypeMap[value as string] || value}</p>
                </div>
              );
            }

            // Yes/No fields
            if (key === "reasonExplainedToResident" || key === "consentObtained" || key === "carePlanCompleted") {
              return (
                <div key={key} className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{formattedKey}</p>
                  <p className="text-sm leading-relaxed">{value === "YES" ? "Yes" : "No"}</p>
                </div>
              );
            }

            // Boolean fields
            if (key === "anyExclusionChecked" || key === "anySafetyCheckFailed" || key === "hasExtendedHeightRails") {
              return (
                <div key={key} className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{formattedKey}</p>
                  <p className="text-sm leading-relaxed">{value ? "Yes" : "No"}</p>
                </div>
              );
            }
          }

          // Special handling for Bedrail Consent Type
          if (key === "consentType" && assessment.formKey === "bedrail-consent-form") {
            const consentTypeMap: Record<string, string> = {
              "ABLE_TO_CONSENT": "Resident is able to consent",
              "UNABLE_TO_CONSENT": "Resident is unable to consent"
            };
            return (
              <div key={key} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Consent Type</p>
                <p className="text-sm leading-relaxed">
                  {consentTypeMap[value as string] || value}
                </p>
              </div>
            );
          }

          // Special handling for Bedrail Consent sections
          if (key === "ableToConsentSection" && assessment.formKey === "bedrail-consent-form") {
            const section = value as any;
            if (!section) return null;

            const consentChoiceMap: Record<string, string> = {
              "CONSENT_TO_USE": "I would like bed rails/bumpers to be used",
              "REFUSE_TO_USE": "I do NOT want bed rails or bumpers to be used"
            };

            return (
              <div key={key} className="space-y-3">
                <p className="text-sm font-semibold text-primary">Resident Consent Section</p>
                <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Consent Decision</p>
                    <p className="text-sm leading-relaxed">
                      {consentChoiceMap[section.consentChoice] || section.consentChoice}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Resident Signature</p>
                    <p className="text-sm font-medium">{section.residentSignature}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Staff Member</p>
                      <p className="text-sm">{section.staffMemberName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Staff Signature</p>
                      <p className="text-sm font-medium">{section.staffMemberSignature}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Date Signed</p>
                    <p className="text-sm">{section.staffSignatureDate}</p>
                  </div>
                </div>
              </div>
            );
          }

          if (key === "unableToConsentSection" && assessment.formKey === "bedrail-consent-form") {
            const section = value as any;
            if (!section) return null;

            const preferenceMap: Record<string, string> = {
              "WOULD_PREFER_USE": "Would have preferred to use bed rails/bumpers",
              "WOULD_NOT_PREFER_USE": "Would not have preferred to use bed rails/bumpers"
            };

            return (
              <div key={key} className="space-y-3">
                <p className="text-sm font-semibold text-primary">Representative Consent Section</p>
                <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Next of Kin / Advocate / MDT Member</p>
                    <p className="text-sm font-medium">{section.representativeName}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-xs italic text-muted-foreground">
                      Discussion acknowledged: The representative has discussed the use of bed rails/bumpers
                      with professionals concerned, based on the resident's previously expressed wishes and beliefs.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Resident's Presumed Preference</p>
                    <p className="text-sm leading-relaxed">
                      {preferenceMap[section.residentPreference] || section.residentPreference}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Representative Signature</p>
                    <p className="text-sm font-medium">{section.representativeSignature}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Staff Member</p>
                      <p className="text-sm">{section.staffMemberName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Staff Signature</p>
                      <p className="text-sm font-medium">{section.staffMemberSignature}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Date Signed</p>
                    <p className="text-sm">{section.staffSignatureDate}</p>
                  </div>
                </div>
              </div>
            );
          }

          // Special handling for Dependency Level
          if (key === "dependencyLevel" && assessment.formKey === "dependency-assessment") {
            const dependencyLevelMap: Record<string, string> = {
              "A": "Level A - High Dependency",
              "B": "Level B - Medium Dependency",
              "C": "Level C - Low Dependency",
              "D": "Level D - Independent"
            };
            return (
              <div key={key} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Dependency Level</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words font-medium">
                  {dependencyLevelMap[value as string] || value}
                </p>
              </div>
            );
          }

          // Special handling for Pain Assessment entries
          if (key === "assessmentEntries" && assessment.formKey === "pain-assessment-form") {
            return (
              <div key={key} className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Assessment Entries</p>
                <div className="space-y-4">
                  {(value as any[]).map((entry: any, index: number) => (
                    <div key={index} className="p-4 border rounded-lg bg-muted/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">Entry {index + 1}</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Date and Time</p>
                          <p className="text-sm">{entry.dateTime}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Pain Location</p>
                          <p className="text-sm">{entry.painLocation}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Description of Pain</p>
                        <p className="text-sm">{entry.descriptionOfPain}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Resident Behaviour</p>
                        <p className="text-sm">{entry.residentBehaviour}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Type of Intervention</p>
                          <p className="text-sm">{entry.interventionType}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Intervention Time</p>
                          <p className="text-sm">{entry.interventionTime}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Pain After Intervention</p>
                        <p className="text-sm">{entry.painAfterIntervention}</p>
                      </div>
                      {entry.comments && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Comments</p>
                          <p className="text-sm">{entry.comments}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Signature</p>
                        <p className="text-sm font-medium">{entry.signature}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // Special handling for Nutritional Assessment IDDSI consistency levels
          if ((key === "foodConsistency" || key === "fluidConsistency") && assessment.formKey === "nutritional-assessment-form") {
            const consistencyObj = value as any;
            const selectedLevels = Object.entries(consistencyObj)
              .filter(([_, isSelected]) => isSelected)
              .map(([level]) => {
                // Format the level name
                return level
                  .replace(/([A-Z])/g, " $1")
                  .replace(/level(\d+)/, "Level $1: ")
                  .trim();
              });

            if (selectedLevels.length === 0) return null;

            return (
              <div key={key} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {key === "foodConsistency" ? "Food Consistency (IDDSI)" : "Fluid Consistency (IDDSI)"}
                </p>
                <div className="space-y-1">
                  {selectedLevels.map((level, idx) => (
                    <p key={idx} className="text-sm pl-2 border-l-2 border-primary/30">
                      {level}
                    </p>
                  ))}
                </div>
              </div>
            );
          }

          // Handle different value types
          let displayValue = value;
          if (typeof value === "number" && value > 1000000000000) {
            // Likely a timestamp
            displayValue = format(new Date(value), "dd MMM yyyy");
          } else if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
            // ISO date string
            try {
              displayValue = format(new Date(value), "dd MMM yyyy");
            } catch {
              displayValue = value;
            }
          } else if (typeof value === "boolean") {
            displayValue = value ? "Yes" : "No";
          } else if (Array.isArray(value)) {
            // Handle arrays of objects
            if (value.length === 0) {
              displayValue = "None";
            } else if (typeof value[0] === "object" && value[0] !== null) {
              // Check if it's a simple {value: string} structure
              if ("value" in value[0]) {
                displayValue = value.map((item: any) => item.value).join(", ");
              } else if ("details" in value[0]) {
                // Handle "other" array with detailed structure
                displayValue = value
                  .map(
                    (item: any, index: number) =>
                      `${index + 1}. ${item.details}\n   Received by: ${item.receivedBy} | Witnessed by: ${item.witnessedBy}\n   Date: ${format(new Date(item.date), "dd MMM yyyy")} at ${item.time}`
                  )
                  .join("\n\n");
              } else {
                displayValue = JSON.stringify(value, null, 2);
              }
            } else {
              displayValue = value.join(", ");
            }
          } else if (typeof value === "object" && value !== null) {
            // Check if it's a handling profile activity object
            if (
              assessment.formKey === "resident-handling-profile-form" &&
              "nStaff" in value &&
              "equipment" in value &&
              "handlingPlan" in value &&
              "dateForReview" in value
            ) {
              return (
                <div key={key} className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{formattedKey}</p>
                  <div className="p-3 border rounded-lg bg-muted/20 space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Number of Staff</p>
                        <p className="text-sm">{value.nStaff}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Date for Review</p>
                        <p className="text-sm">{format(new Date(value.dateForReview), "dd MMM yyyy")}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Equipment</p>
                      <p className="text-sm">{value.equipment}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Handling Plan</p>
                      <p className="text-sm">{value.handlingPlan}</p>
                    </div>
                  </div>
                </div>
              );
            }
            displayValue = JSON.stringify(value, null, 2);
          }

          return (
            <div key={key} className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{formattedKey}</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {displayValue?.toString() || "N/A"}
              </p>
            </div>
          );
        })}

        {/* Special rendering for Bed Rails Risk Assessment complex objects */}
        {assessment.formKey === "bed-rails-risk-assessment-form" && (
          <>
            {/* Exclusion Criteria */}
            {data.exclusionCriteria && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-primary">Exclusion Criteria</p>
                <div className="p-4 border rounded-lg bg-muted/30 space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Resident refuses:</span>
                      <span className="text-sm">{data.exclusionCriteria.residentRefuses ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Climbing risk:</span>
                      <span className="text-sm">{data.exclusionCriteria.climbingRisk ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Entrapment risk:</span>
                      <span className="text-sm">{data.exclusionCriteria.entrapmentRisk ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Abnormal body size:</span>
                      <span className="text-sm">{data.exclusionCriteria.abnormalBodySize ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Restraint purpose:</span>
                      <span className="text-sm">{data.exclusionCriteria.restraintPurpose ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Freedom limitation:</span>
                      <span className="text-sm">{data.exclusionCriteria.freedomLimitation ? "Yes" : "No"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Authorization Rationale */}
            {data.authorizationRationale && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-primary">Authorization Rationale</p>
                <div className="p-4 border rounded-lg bg-muted/30 space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Resident requests:</span>
                      <span className="text-sm">{data.authorizationRationale.residentRequests ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">MDT meeting completed:</span>
                      <span className="text-sm">{data.authorizationRationale.mdtMeetingCompleted ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Risk outweighs benefit:</span>
                      <span className="text-sm">{data.authorizationRationale.riskOutweighsBenefit ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Alternatives explored:</span>
                      <span className="text-sm">{data.authorizationRationale.alternativesExplored ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Best interest decision:</span>
                      <span className="text-sm">{data.authorizationRationale.bestInterestDecision ? "Yes" : "No"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Safety Checklist */}
            {data.safetyChecklist && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-primary">Safety Checklist</p>
                <div className="p-4 border rounded-lg bg-muted/30 space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Gap between rail and mattress:</span>
                      <span className="text-sm">{data.safetyChecklist.gapBetweenRailAndMattress === "YES" ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Mattress compresses easily:</span>
                      <span className="text-sm">{data.safetyChecklist.mattressCompressesEasily === "YES" ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Gap more than 60mm:</span>
                      <span className="text-sm">{data.safetyChecklist.gapMoreThan60mm === "YES" ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Bed rail insecure:</span>
                      <span className="text-sm">{data.safetyChecklist.bedRailInsecure === "YES" ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Bed against wall:</span>
                      <span className="text-sm">{data.safetyChecklist.bedAgainstWall === "YES" ? "Yes" : "No"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Extended Height Checks */}
            {data.extendedHeightChecks && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-primary">Extended Height Checks</p>
                <div className="p-4 border rounded-lg bg-muted/30 space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Positioned correctly:</span>
                      <span className="text-sm">{data.extendedHeightChecks.positionedCorrectly === "YES" ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Securely fastened:</span>
                      <span className="text-sm">{data.extendedHeightChecks.securelyFastened === "YES" ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Correct bumpers installed:</span>
                      <span className="text-sm">{data.extendedHeightChecks.correctBumpersInstalled === "YES" ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Mattress below plimsoll line:</span>
                      <span className="text-sm">{data.extendedHeightChecks.mattressBelowPlimsollLine === "YES" ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Staff trained:</span>
                      <span className="text-sm">{data.extendedHeightChecks.staffTrained === "YES" ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Checked for damage:</span>
                      <span className="text-sm">{data.extendedHeightChecks.checkedForDamage === "YES" ? "Yes" : "No"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[calc(100vw-3rem)] max-h-[calc(100vh-3rem)] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-lg font-bold mb-2">
                {assessment.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full ${getCategoryColor(assessment.category)}`}>
                  {assessment.category}
                </span>
                <span>•</span>
                <span>{format(new Date(assessment.completedAt), "dd MMM yyyy 'at' HH:mm")}</span>
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 space-y-6 pb-8">
            {renderAssessmentContent()}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
