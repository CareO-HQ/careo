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
    if (formKey === "preAdmission-form") return { formId: assessment.formId as Id<"preAdmissionAssessments"> };
    if (formKey === "admission-form") return { id: assessment.formId as Id<"admissionAssessments"> };
    if (formKey === "dnacpr") return { dnacprId: assessment.formId as Id<"dnacprs"> };
    if (formKey === "peep") return { peepId: assessment.formId as Id<"peeps"> };
    if (formKey === "dependency-assessment") return { id: assessment.formId as Id<"dependencyAssessments"> };
    if (formKey === "timl") return { id: assessment.formId as Id<"timlAssessments"> };
    if (formKey === "skin-integrity-form") return { id: assessment.formId as Id<"skinIntegrityAssessments"> };
    if (formKey === "resident-valuables-form") return { assessmentId: assessment.formId as Id<"residentValuablesAssessments"> };
    if (formKey === "photography-consent") return { consentId: assessment.formId as Id<"photographyConsents"> };
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
            key === "teamId"
          ) {
            return null;
          }

          // Format the key to be more readable
          const formattedKey = key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase())
            .trim();

          // Handle different value types
          let displayValue = value;
          if (typeof value === "number" && value > 1000000000000) {
            // Likely a timestamp
            displayValue = format(new Date(value), "dd MMM yyyy");
          } else if (typeof value === "boolean") {
            displayValue = value ? "Yes" : "No";
          } else if (Array.isArray(value)) {
            displayValue = value.length > 0 ? value.join(", ") : "None";
          } else if (typeof value === "object" && value !== null) {
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
