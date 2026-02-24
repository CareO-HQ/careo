"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { FileText, BriefcaseIcon } from "lucide-react";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const safeFormat = (dateValue: any, formatStr: string) => {
  if (!dateValue) return "N/A";
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return "N/A";
    return format(date, formatStr);
  } catch (e) {
    return "N/A";
  }
};

// Internal fields to skip when rendering nested objects
const SKIP_KEYS = new Set([
  "id", "_id", "resident_id", "residentId", "organization_id", "organizationId",
  "team_id", "teamId", "user_id", "userId", "created_by", "createdBy",
  "created_at", "createdAt", "updated_at", "updatedAt", "updated_by", "updatedBy",
  "previous_version_id", "previousVersionId", "previous_care_plan_id",
  "status", "archived_at", "archivedAt", "version", "is_archived", "isArchived",
  "pdf_file_id", "pdfFileId", "pdf_generated", "pdfGenerated",
  "pdf_generated_at", "pdfGeneratedAt", "saved_as_draft", "savedAsDraft",
  "__v", "_rev"
]);

// Format a camelCase or snake_case key into a human-readable label
const formatFieldKey = (key: string): string => {
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

// Recursively render any value in a human-readable format
const renderNestedValue = (value: any, label?: string, depth: number = 0): React.ReactNode => {
  if (value === null || value === undefined) {
    return label ? (
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">N/A</p>
      </div>
    ) : null;
  }

  // Boolean
  if (typeof value === "boolean") {
    return label ? (
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm">{value ? "Yes" : "No"}</p>
      </div>
    ) : <span>{value ? "Yes" : "No"}</span>;
  }

  // Number — check if timestamp
  if (typeof value === "number") {
    const display = value > 1000000000000 ? safeFormat(value, "dd MMM yyyy") : String(value);
    return label ? (
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm">{display}</p>
      </div>
    ) : <span>{display}</span>;
  }

  // String — check if ISO date
  if (typeof value === "string") {
    let display = value;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      display = safeFormat(value, "dd MMM yyyy");
    }
    return label ? (
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{display || "N/A"}</p>
      </div>
    ) : <span>{display}</span>;
  }

  // Array
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return label ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-sm text-muted-foreground">None</p>
        </div>
      ) : null;
    }

    // Array of primitives
    if (typeof value[0] !== "object" || value[0] === null) {
      return label ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-sm">{value.join(", ")}</p>
        </div>
      ) : <span>{value.join(", ")}</span>;
    }

    // Array of objects
    return (
      <div className="space-y-2">
        {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}
        {value.map((item: any, index: number) => (
          <div key={index} className={`p-3 border rounded-lg ${depth === 0 ? "bg-muted/30" : "bg-muted/20"} space-y-2`}>
            <p className="text-xs font-semibold text-muted-foreground">Entry {index + 1}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(item)
                .filter(([k]) => !SKIP_KEYS.has(k))
                .map(([k, v]) => (
                  <div key={k}>
                    {renderNestedValue(v, formatFieldKey(k), depth + 1)}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Object
  if (typeof value === "object") {
    const entries = Object.entries(value).filter(([k]) => !SKIP_KEYS.has(k));
    if (entries.length === 0) return null;

    return (
      <div className="space-y-2">
        {label && <p className={`text-xs font-medium ${depth === 0 ? "text-sm font-semibold text-primary" : "text-muted-foreground"}`}>{label}</p>}
        <div className={`p-3 border rounded-lg ${depth === 0 ? "bg-muted/30" : "bg-muted/20"} space-y-3`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {entries.map(([k, v]) => (
              <div key={k} className={typeof v === "object" && v !== null && !Array.isArray(v) ? "col-span-full" : ""}>
                {renderNestedValue(v, formatFieldKey(k), depth + 1)}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return label ? (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{String(value)}</p>
    </div>
  ) : <span>{String(value)}</span>;
};

export interface RiskAssessmentViewerProps {
  assessment: {
    formKey: string;
    formId: string;
    name: string;
    completedAt: number;
    category?: string;
  };
}

export function RiskAssessmentViewer({
  assessment
}: RiskAssessmentViewerProps) {
  // Fetch the assessment data based on the form key
  const [assessmentData, setAssessmentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const TABLE_MAP: Record<string, string> = {
    "preAdmission-form": "pre_admission_care_files",
    "infection-prevention": "infection_prevention_assessments",
    "blader-bowel-form": "bladder_bowel_assessments",
    "moving-handling-form": "moving_handling_assessments",
    "bedrail-consent-form": "bedrail_consents",
    "bed-rails-risk-assessment-form": "bedrails_risk_assessments",
    "long-term-fall-risk-form": "long_term_falls_risk_assessments",
    "admission-form": "admission_assessments",
    "photography-consent": "photography_consents",
    "dnacpr": "dnacprs",
    "peep": "peeps",
    "dependency-assessment": "dependency_assessments",
    "timl": "timl_assessments",
    "skin-integrity-form": "skin_integrity_assessments",
    "resident-valuables-form": "resident_valuables_assessments",
    "resident-handling-profile-form": "handling_profiles",
    "pain-assessment-form": "pain_assessments",
    "nutritional-assessment-form": "nutritional_assessments",
    "oral-assessment-form": "oral_assessments",
    "diet-notification-form": "diet_notifications",
    "choking-risk-assessment-form": "choking_risk_assessments",
    "cornell-depression-scale-form": "cornell_depression_scales",
    "best-interest-decision-form": "best_interest_decisions",
    "care-plan-form": "care_plan_assessments"
  };

  useEffect(() => {
    async function fetchData() {
      if (!assessment.formId) return;

      try {
        const table = TABLE_MAP[assessment.formKey];
        if (table) {
          const { data } = await supabase
            .from(table)
            .select('*')
            .eq('id', assessment.formId)
            .single();
          setAssessmentData(data);
        }
      } catch (error) {
        console.error("Error fetching assessment data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [assessment.formId, assessment.formKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!assessmentData) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No data found for this assessment.
      </div>
    );
  }

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
            return (
              <div key={key} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Date of Birth</p>
                <p className="text-sm leading-relaxed">
                  {safeFormat(value, "dd MMM yyyy")}
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
                  <p className="text-sm leading-relaxed">{(bedTypeMap[value as string] || value) as string}</p>
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
                  <p className="text-sm leading-relaxed">{(mattressTypeMap[value as string] || value) as string}</p>
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
                  <p className="text-sm leading-relaxed">{(bedrailTypeMap[value as string] || value) as string}</p>
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
                  {(consentTypeMap[value as string] || value) as string}
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
                      with professionals concerned, based on the resident&apos;s previously expressed wishes and beliefs.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Resident&apos;s Presumed Preference</p>
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
                  {(dependencyLevelMap[value as string] || value) as string}
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
            displayValue = safeFormat(value, "dd MMM yyyy");
          } else if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
            // ISO date string
            displayValue = safeFormat(value, "dd MMM yyyy");
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
                      `${index + 1}. ${item.details}\n   Received by: ${item.receivedBy} | Witnessed by: ${item.witnessedBy}\n   Date: ${safeFormat(item.date, "dd MMM yyyy")} at ${item.time}`
                  )
                  .join("\n\n");
              } else {
                // Array of complex objects — use recursive renderer
                return (
                  <div key={key} className="space-y-1">
                    {renderNestedValue(value, formattedKey)}
                  </div>
                );
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
                        <p className="text-sm">{(value as any).nStaff}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Date for Review</p>
                        <p className="text-sm">{safeFormat((value as any).dateForReview, "dd MMM yyyy")}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Equipment</p>
                      <p className="text-sm">{(value as any).equipment}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Handling Plan</p>
                      <p className="text-sm">{(value as any).handlingPlan}</p>
                    </div>
                  </div>
                </div>
              );
            }
            // Nested object — use recursive renderer
            return (
              <div key={key} className="space-y-1">
                {renderNestedValue(value, formattedKey)}
              </div>
            );
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
    <div className="space-y-6">
      {renderAssessmentContent()}
    </div>
  );
}

const getCategoryColor = (category?: string) => {
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

interface RiskAssessmentViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessment: {
    formKey: string;
    formId: string;
    name: string;
    completedAt: number;
    category?: string;
  };
}

export default function RiskAssessmentViewDialog({
  open,
  onOpenChange,
  assessment
}: RiskAssessmentViewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[calc(100vw-3rem)] max-h-[calc(100vh-3rem)] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-lg font-bold mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  {assessment.name}
                </div>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2">
                {assessment.category && (
                  <>
                    <span className={`px-2 py-0.5 rounded-full ${getCategoryColor(assessment.category)}`}>
                      {assessment.category}
                    </span>
                    <span>•</span>
                  </>
                )}
                <span>{safeFormat(assessment.completedAt, "dd MMM yyyy 'at' HH:mm")}</span>
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 space-y-6 pb-8">
            <RiskAssessmentViewer assessment={assessment} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
