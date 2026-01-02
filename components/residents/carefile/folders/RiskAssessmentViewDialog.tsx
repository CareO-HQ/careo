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
      default:
        return "skip";
    }
  };

  const getQueryParams = () => {
    const formKey = assessment.formKey;
    if (formKey === "infection-prevention") return { id: assessment.formId as Id<"infectionPreventionAssessments"> };
    if (formKey === "moving-handling-form") return { id: assessment.formId as Id<"movingHandlingAssessments"> };
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
      case "Continence":
        return "bg-purple-50 text-purple-700";
      case "Medication":
        return "bg-green-50 text-green-700";
      case "Nutrition":
        return "bg-emerald-50 text-emerald-700";
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
            key === "updatedBy"
          ) {
            return null;
          }

          // Format the key to be more readable
          const formattedKey = key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase())
            .trim();

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
