"use client";

import React from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { generateCareFilePDF } from "@/lib/care-file-pdf-utils";

// Label mappings for readable field names
const FIELD_LABELS: Record<string, string> = {
  providerName: "Provider Name",
  serviceUserName: "Service User Name",
  serviceUserDOB: "Date of Birth",
  serviceUserGender: "Gender",
  careManager: "Care Manager",
  incidentAddress: "Incident Address",
  exactLocation: "Exact Location",
  incidentDate: "Incident Date",
  incidentTime: "Incident Time",
  incidentDescription: "Incident Description",
  natureOfInjury: "Nature of Injury",
  immediateActionTaken: "Immediate Action Taken",
  personsNotified: "Persons Notified",
  witnesses: "Witnesses",
  staffInvolved: "Staff Involved",
  otherServiceUsersInvolved: "Other Service Users Involved",
  reporterName: "Reporter Name",
  reporterDesignation: "Reporter Designation",
  dateReported: "Date Reported",
  preventionActions: "Prevention Actions",
  riskAssessmentUpdateDate: "Risk Assessment Update Date",
  otherComments: "Other Comments",
  reviewerName: "Reviewer Name",
  reviewerDesignation: "Reviewer Designation",
  reviewDate: "Review Date",
  datixRef: "DATIX Reference",
  primaryLocation: "Primary Location",
  contributoryFactors: "Contributory Factors",
  propertyEquipmentMedication: "Property / Equipment / Medication",
  causedByBehaviorsOfConcern: "Caused by Behaviours of Concern",
  documentedInCarePlan: "Documented in Care Plan",
  apparentCauseOfInjury: "Apparent Cause of Injury",
  remedialActionTaken: "Remedial Action Taken",
  actionsTakenToPreventRecurrence: "Actions Taken to Prevent Recurrence",
  equipmentInvolved: "Equipment Involved",
  equipmentDetails: "Equipment Details",
  reportedToNIAC: "Reported to NIAC",
  propertyInvolved: "Property Involved",
  propertyDetails: "Property Details",
  hcNumber: "H&C Number",
  gender: "Gender",
  dateOfBirth: "Date of Birth",
  serviceUserFullName: "Service User Full Name",
  serviceUserAddress: "Service User Address",
  trustKeyWorkerName: "Trust Key Worker Name",
  trustKeyWorkerDesignation: "Trust Key Worker Designation",
  personSufferedInjury: "Person Suffered Injury",
  partOfBodyAffected: "Part of Body Affected",
  attentionReceived: "Attention Received",
  attentionReceivedOther: "Attention Received (Other)",
  staffMembersInvolved: "Staff Members Involved",
  witnessDetails: "Witness Details",
  providerAddress: "Provider Address",
  groupName: "Group Name",
  serviceName: "Service Name",
  typeOfService: "Type of Service",
  medicationNames: "Medication Names",
  pharmacyDetails: "Pharmacy Details",
  identifiedBy: "Identified By",
  identifierName: "Identifier Name",
  identifierJobTitle: "Identifier Job Title",
  identifierTelephone: "Identifier Telephone",
  identifierEmail: "Identifier Email",
  trustStaffName: "Trust Staff Name",
  trustStaffJobTitle: "Trust Staff Job Title",
  trustStaffTelephone: "Trust Staff Telephone",
  trustStaffEmail: "Trust Staff Email",
  returnEmail: "Return Email",
  outcomeComments: "Outcome Comments",
  reviewOutcome: "Review Outcome",
  lessonsLearned: "Lessons Learned",
  finalReviewAndOutcome: "Final Review and Outcome",
  keyWorkerNameDesignation: "Key Worker Name / Designation",
  lineManagerNameDesignation: "Line Manager Name / Designation",
  // Restrictive practice
  incidentLocation: "Incident Location",
  restrictiveTypes: "Restrictive Practice Types",
  otherTypeDetails: "Other Type Details",
  behaviourDescription: "Behaviour Description",
  triggerFactors: "Trigger Factors",
  deEscalationAttempted: "De-escalation Attempted",
  interventionDetails: "Intervention Details",
  durationMinutes: "Duration (minutes)",
  numberOfStaff: "Number of Staff",
  serviceUserResponse: "Service User Response",
  injurySustained: "Injury Sustained",
  injuryDetails: "Injury Details",
  medicalAttentionRequired: "Medical Attention Required",
  medicalDetails: "Medical Details",
  debrief: "Debrief",
  serviceUserViews: "Service User Views",
  familyNotified: "Family Notified",
  familyNotifiedDetails: "Family Notified Details",
  completedBy: "Completed By",
  completedByRole: "Completed By Role",
  reviewerRole: "Reviewer Role",
  followUpActions: "Follow-up Actions",
  additionalNotes: "Additional Notes",
};

const TRUST_NAMES: Record<string, string> = {
  bhsct: "Belfast Health and Social Care Trust",
  sehsct: "South Eastern Health and Social Care Trust",
  nhs: "NHS Trust Report",
  whsct: "Western Health and Social Care Trust",
  shsct: "Southern Health and Social Care Trust",
  nhsct: "Northern Health and Social Care Trust",
  "restrictive-practice": "Restrictive Practice Report",
};

// Fields to skip in the viewer
const SKIP_FIELDS = new Set(["status", "generatedAt"]);

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "N/A";
  // Try to detect date strings (yyyy-mm-dd format)
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    try {
      return format(new Date(value + "T00:00:00"), "PPP");
    } catch {
      return value;
    }
  }
  return String(value);
}

// Group fields into sections based on the report type
function groupFields(reportType: string, data: Record<string, unknown>): { label: string; fields: [string, unknown][] }[] {
  const entries = Object.entries(data).filter(([key]) => !SKIP_FIELDS.has(key));

  if (reportType === "bhsct" || reportType === "whsct" || reportType === "shsct" || reportType === "nhsct") {
    const sections = [
      { label: "Provider & Service User", keys: ["providerName", "serviceUserName", "serviceUserDOB", "serviceUserGender", "careManager"] },
      { label: "Incident Location", keys: ["incidentAddress", "exactLocation"] },
      { label: "Incident Details", keys: ["incidentDate", "incidentTime", "incidentDescription"] },
      { label: "Injury & Treatment", keys: ["natureOfInjury", "immediateActionTaken"] },
      { label: "Notifications & Witnesses", keys: ["personsNotified", "witnesses", "staffInvolved", "otherServiceUsersInvolved"] },
      { label: "Reporter Information", keys: ["reporterName", "reporterDesignation", "dateReported"] },
      { label: "Follow-up Actions", keys: ["preventionActions", "riskAssessmentUpdateDate", "otherComments"] },
      { label: "Manager Review", keys: ["reviewerName", "reviewerDesignation", "reviewDate"] },
    ];

    const used = new Set<string>();
    const result = sections.map(s => ({
      label: s.label,
      fields: s.keys
        .filter(k => { used.add(k); return data[k] !== undefined; })
        .map(k => [k, data[k]] as [string, unknown]),
    })).filter(s => s.fields.length > 0);

    // Remaining fields
    const remaining = entries.filter(([k]) => !used.has(k));
    if (remaining.length > 0) result.push({ label: "Other", fields: remaining });
    return result;
  }

  if (reportType === "sehsct") {
    const sections = [
      { label: "Service User Details", keys: ["serviceUserFullName", "dateOfBirth", "gender", "hcNumber", "serviceUserAddress"] },
      { label: "Trust Key Worker", keys: ["trustKeyWorkerName", "trustKeyWorkerDesignation"] },
      { label: "Provider Details", keys: ["providerName", "providerAddress", "groupName", "serviceName", "typeOfService"] },
      { label: "Incident Details", keys: ["datixRef", "incidentDate", "incidentTime", "primaryLocation", "exactLocation", "incidentDescription"] },
      { label: "Contributing Factors", keys: ["contributoryFactors", "causedByBehaviorsOfConcern", "documentedInCarePlan"] },
      { label: "Injury & Equipment", keys: ["personSufferedInjury", "partOfBodyAffected", "natureOfInjury", "apparentCauseOfInjury", "attentionReceived", "attentionReceivedOther", "equipmentInvolved", "equipmentDetails", "reportedToNIAC", "propertyInvolved", "propertyDetails", "propertyEquipmentMedication"] },
      { label: "Actions & Remediation", keys: ["remedialActionTaken", "actionsTakenToPreventRecurrence", "riskAssessmentUpdateDate"] },
      { label: "People Involved", keys: ["staffMembersInvolved", "otherServiceUsersInvolved", "witnessDetails", "personsNotified"] },
      { label: "Medication Details", keys: ["medicationNames", "pharmacyDetails"] },
      { label: "Identified By", keys: ["identifiedBy", "identifierName", "identifierJobTitle", "identifierTelephone", "identifierEmail"] },
      { label: "Trust Staff", keys: ["trustStaffName", "trustStaffJobTitle", "trustStaffTelephone", "trustStaffEmail", "returnEmail"] },
      { label: "Review & Outcome", keys: ["outcomeComments", "reviewOutcome", "lessonsLearned", "finalReviewAndOutcome", "keyWorkerNameDesignation", "lineManagerNameDesignation"] },
    ];

    const used = new Set<string>();
    const result = sections.map(s => ({
      label: s.label,
      fields: s.keys
        .filter(k => { used.add(k); return data[k] !== undefined; })
        .map(k => [k, data[k]] as [string, unknown]),
    })).filter(s => s.fields.length > 0);

    const remaining = entries.filter(([k]) => !used.has(k));
    if (remaining.length > 0) result.push({ label: "Other", fields: remaining });
    return result;
  }

  if (reportType === "nhs") {
    const sections = [
      { label: "Trust Information", keys: ["trustName"] },
      { label: "Notes", keys: ["additionalNotes"] },
    ];

    const used = new Set<string>();
    const result = sections.map(s => ({
      label: s.label,
      fields: s.keys
        .filter(k => { used.add(k); return data[k] !== undefined; })
        .map(k => [k, data[k]] as [string, unknown]),
    })).filter(s => s.fields.length > 0);

    const remaining = entries.filter(([k]) => !used.has(k));
    if (remaining.length > 0) result.push({ label: "Other", fields: remaining });
    return result;
  }

  if (reportType === "restrictive-practice") {
    const sections = [
      { label: "Service User Details", keys: ["serviceUserName", "serviceUserDOB", "careManager"] },
      { label: "Incident Details", keys: ["incidentDate", "incidentTime", "incidentLocation"] },
      { label: "Restrictive Practice Type", keys: ["restrictiveTypes", "otherTypeDetails"] },
      { label: "Behaviour & De-escalation", keys: ["behaviourDescription", "triggerFactors", "deEscalationAttempted"] },
      { label: "Intervention Details", keys: ["interventionDetails", "durationMinutes", "numberOfStaff", "staffInvolved"] },
      { label: "Impact & Post-Incident", keys: ["serviceUserResponse", "injurySustained", "injuryDetails", "medicalAttentionRequired", "medicalDetails", "debrief", "serviceUserViews", "familyNotified", "familyNotifiedDetails"] },
      { label: "Review & Approval", keys: ["completedBy", "completedByRole", "reviewerName", "reviewerRole", "reviewDate", "lessonsLearned", "followUpActions"] },
    ];

    const used = new Set<string>();
    const result = sections.map(s => ({
      label: s.label,
      fields: s.keys
        .filter(k => { used.add(k); return data[k] !== undefined; })
        .map(k => [k, data[k]] as [string, unknown]),
    })).filter(s => s.fields.length > 0);

    const remaining = entries.filter(([k]) => !used.has(k));
    if (remaining.length > 0) result.push({ label: "Other", fields: remaining });
    return result;
  }

  // Fallback: single section with all fields
  return [{ label: "Report Details", fields: entries }];
}

interface SavedReport {
  id: string;
  trust_name: string;
  report_type: string;
  report_data: Record<string, unknown>;
  created_at: string;
}

interface TrustReportViewerProps {
  report: SavedReport;
  orgLogoUrl?: string;
  careHomeName?: string;
  residentName?: string;
  residentDOB?: string;
}

export function TrustReportViewer({
  report,
  orgLogoUrl,
  careHomeName,
  residentName,
  residentDOB,
}: TrustReportViewerProps) {
  const sections = groupFields(report.report_type, report.report_data);
  const trustLabel = report.trust_name || report.report_type.toUpperCase();
  const trustDescription = TRUST_NAMES[report.report_type] || report.trust_name;

  const handleDownload = async () => {
    try {
      const [firstName, ...rest] = (residentName || "").split(" ");
      const resident = residentName
        ? {
            first_name: firstName || residentName,
            last_name: rest.join(" "),
            date_of_birth: residentDOB,
          }
        : undefined;

      const data =
        report.report_type === "restrictive-practice" &&
        Array.isArray(report.report_data.restrictiveTypes)
          ? {
              ...report.report_data,
              restrictiveTypes: (report.report_data.restrictiveTypes as unknown[])
                .map((v) => String(v))
                .join(", "),
            }
          : report.report_data;

      await generateCareFilePDF({
        formName: trustLabel + " Report",
        data,
        resident,
        orgLogoUrl,
        careHomeName,
      });
    } catch (err) {
      console.error("Error generating trust report PDF:", err);
      toast.error("Failed to generate PDF");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b bg-background flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{trustLabel} Report</h2>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                Submitted
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{trustDescription}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Submitted on {format(new Date(report.created_at), "PPP 'at' p")}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" /> Download
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {sections.map((section) => (
            <div key={section.label} className="space-y-3">
              <h3 className="font-semibold text-base text-black border-b pb-2">{section.label}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {section.fields.map(([key, value]) => {
                  const displayValue = formatValue(value);
                  // Use full width for long text
                  const isLong = typeof value === "string" && value.length > 80;
                  return (
                    <div key={key} className={isLong ? "md:col-span-2" : ""}>
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">
                        {FIELD_LABELS[key] || key}
                      </p>
                      <p className="text-sm">{displayValue}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
