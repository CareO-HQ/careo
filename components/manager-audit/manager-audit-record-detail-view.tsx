"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, ClipboardList, Printer, Download } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { generateManagerAuditPDF } from "@/lib/manager-audit-pdf-utils";
import { FallRegisterTable } from "@/components/manager-audit/fall-register-table";
import { IncidentAuditTable } from "@/components/manager-audit/incident-audit-table";
import { WoundsAnalysisTable } from "@/components/manager-audit/wounds-analysis-table";
import { RegistrationTrackerTable } from "@/components/manager-audit/registration-tracker-table";
import {
  resolveRegistrationTrackerData,
} from "@/lib/registration-tracker-utils";
import { formatAuditMonthLabel } from "@/lib/falls-register-utils";
import { resolveIncidentAuditTableData } from "@/lib/incident-audit-utils";
import { resolveWoundsAnalysisTableData } from "@/lib/wounds-analysis-utils";
import {
  buildCareFileAuditHistoryViewModel,
  careFileAuditHistoryGroupsHaveSource,
  type CareFileActionPlanSnapshot,
  type CareFileAuditHistoryPayload,
} from "@/lib/manager-care-file-audit-history";

const auditNames: Record<string, string> = {
  "0": "Care File Audit",
  "1": "Accidents and Incidents Analysis",
  "2": "Agency Profiles and Induction Records",
  "3": "Bedrails Audit",
  "4": "Domestic Services",
  "5": "CARE Documentation (10% to be checked)",
  "6": "Catering Audit",
  "7": "Competency Assessment Review",
  "8": "Complaints Analysis",
  "9": "Decontamination",
  "10": "Dining Experience",
  "11": "DOLS",
  "12": "Domestic Audit",
  "13": "Fall audit",
  "14": "Hand Hygiene Audit",
  "15": "Hoist and Sling Register",
  "16": "IPC Short Audit",
  "17": "Mandatory Training Stats",
  "18": "Medication Audit",
  "19": "Modified Diet and Fluids Audit",
  "20": "NMC NISSC Logs",
  "21": "Restrictive Practice",
  "22": "RTW Tracker",
  "23": "Safeguarding Database",
  "24": "Safety Alerts",
  "25": "Smoking Compliance",
  "26": "Supervision and Appraisal Matrix",
  "27": "Weights Analysis",
  "28": "Wounds Analysis",
  "29": "GDPR",
  "30": "Personnel Files",
  "31": "Resident Agreement",
  "32": "NISCC Registration Tracker",
  "33": "NMC Registration Tracker",
  "34": "Incident audit",
  "35": "Moving & Handling Audit",
  "36": "Choking Risk Assessment Audit",
  "37": "DNACPR Audit",
  "38": "Care Management Reviews",
  "39": "Pressure Damage Prevention Audit",
  "40": "Health & Monitoring Audit",
  "41": "Mattress and Visual Checks Audit",
  "42": "Infection Control Audit",
};

const AUDIT_LEVEL_SUBJECT_ID = "audit-level";

function normalizeAnswerValue(raw: string | undefined): string {
  if (!raw) return "not-reviewed";
  const v = raw.trim().toLowerCase();
  if (v === "" || v === "not-reviewed") return "not-reviewed";
  if (v === "yes" || v === "compliant" || v === "checked") return "compliant";
  if (v === "action-required") return "action-required";
  if (v === "no" || v === "non-compliant") return "non-compliant";
  if (v === "n/a" || v === "not-applicable" || v === "not applicable")
    return "not-applicable";
  return "not-reviewed";
}

function rowStatusLabel(status: string): string {
  const normalized = normalizeAnswerValue(status);
  switch (normalized) {
    case "compliant": return "Compliant";
    case "action-required": return "Action Required";
    case "non-compliant": return "Non-Compliant";
    case "not-applicable": return "N/A";
    default: return "Not reviewed";
  }
}

function rowStatusPillClass(status: string): string {
  const normalized = normalizeAnswerValue(status);
  switch (normalized) {
    case "compliant": return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/45 dark:text-emerald-300";
    case "action-required": return "bg-amber-100 text-amber-950 dark:bg-amber-950/35 dark:text-amber-100";
    case "non-compliant": return "bg-destructive/15 text-destructive dark:bg-destructive/20";
    case "not-applicable": return "bg-muted text-muted-foreground";
    default: return "bg-muted text-muted-foreground";
  }
}

function getDisplayStatus(val: string | undefined, qType?: string): string {
  if (!val) return "Not reviewed";
  const valLower = val.trim().toLowerCase();
  if (valLower === "" || valLower === "not-reviewed") return "Not reviewed";
  
  if (qType === "yesno") {
    if (valLower === "yes" || valLower === "compliant" || valLower === "checked") return "Yes";
    if (valLower === "no" || valLower === "non-compliant") return "No";
  }
  
  if (qType === "text" || qType === "date" || qType === "risk") {
    if (qType === "date") {
      try {
        return format(new Date(val), "dd MMM yyyy");
      } catch {
        return val;
      }
    }
    if (qType === "risk") {
      return val.charAt(0).toUpperCase() + val.slice(1);
    }
    if (val.trim().startsWith("[") && val.trim().endsWith("]")) {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) {
          return parsed.join(", ");
        }
      } catch {
        // Fallback
      }
    }
    return val;
  }
  
  return rowStatusLabel(val);
}

function getStatusPillClass(val: string | undefined, qType?: string): string {
  if (!val) return "bg-muted text-muted-foreground";
  const valLower = val.trim().toLowerCase();
  if (valLower === "" || valLower === "not-reviewed") return "bg-muted text-muted-foreground";

  if (qType === "text" || qType === "date") {
    return "text-muted-foreground text-xs font-normal bg-transparent p-0";
  }

  if (qType === "risk") {
    switch (valLower) {
      case "low": return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/45 dark:text-emerald-300";
      case "medium": return "bg-amber-100 text-amber-950 dark:bg-amber-950/35 dark:text-amber-100";
      case "high": return "bg-destructive/15 text-destructive dark:bg-destructive/20";
      default: return "bg-muted text-muted-foreground";
    }
  }

  return rowStatusPillClass(val);
}

function actionPlanStatusLabel(status?: string | null): string {
  const normalized = (status || "pending").replace(/-/g, "_").toLowerCase();
  if (normalized === "in_progress") return "In Progress";
  if (normalized === "completed") return "Completed";
  if (normalized === "overdue") return "Overdue";
  return "Pending";
}

function actionPlanStatusClass(status?: string | null): string {
  const normalized = (status || "pending").replace(/-/g, "_").toLowerCase();
  if (normalized === "completed") return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/45 dark:text-emerald-300";
  if (normalized === "in_progress") return "bg-sky-100 text-sky-900 dark:bg-sky-950/45 dark:text-sky-300";
  if (normalized === "overdue") return "bg-destructive/15 text-destructive dark:bg-destructive/20";
  return "bg-amber-100 text-amber-950 dark:bg-amber-950/35 dark:text-amber-100";
}

export interface ManagerAuditRecordDetailViewProps {
  auditId: string;
  recordId: string;
  onBack?: () => void;
}

export function ManagerAuditRecordDetailView({
  auditId,
  recordId,
  onBack,
}: ManagerAuditRecordDetailViewProps) {
  const router = useRouter();
  const auditName = auditNames[auditId] || "Unknown Audit";

  const [isLoading, setIsLoading] = useState(true);
  const [recordData, setRecordData] = useState<any>(null);
  
  // Format categories
  const auditData = recordData?.data;
  const isTeamBased = ["3", "18"].includes(auditId);
  const isStaffBased = ["7", "22", "26", "32", "33"].includes(auditId) || auditData?.category === "staff";
  const isGridBased = !!auditData?.gridData || ["1", "14", "16", "23", "24", "29"].includes(auditId);
  const isFallRegisterTable =
    auditId === "13" && !!auditData?.fallRegisterData;
  const registrationTrackerData = useMemo(
    () => resolveRegistrationTrackerData(auditId, auditData),
    [auditId, auditData]
  );
  const isRegistrationTrackerTable = !!registrationTrackerData;
  const incidentAuditData = useMemo(
    () => resolveIncidentAuditTableData(auditId, auditData),
    [auditId, auditData]
  );
  const isIncidentAuditTable = !!incidentAuditData;
  const woundsAnalysisData = useMemo(
    () => resolveWoundsAnalysisTableData(auditId, auditData),
    [auditId, auditData]
  );
  const isWoundsAnalysisTable = !!woundsAnalysisData;

  const isCareFileAuditPayload = (auditId === "0" || auditId.startsWith("0") || auditId.includes("resident-0")) || (!!auditData?.rowQuestions || !!auditData?.columnQuestions);

  const careFileViewModel = useMemo(() => {
    if (!auditData) return null;
    const rowQuestions = auditData.rowQuestions || auditData.payload?.rowQuestions || [];
    const columnQuestions = auditData.columnQuestions || auditData.payload?.columnQuestions || [];
    const answers = auditData.answers || auditData.payload?.answers || [];
    const fixedColumnData = auditData.fixedColumnData || auditData.payload?.fixedColumnData || {};

    if (rowQuestions.length === 0 && columnQuestions.length === 0) return null;

    const payload: CareFileAuditHistoryPayload = {
      rowQuestions,
      columnQuestions,
      answers,
      fixedColumnData,
    };
    const groups = buildCareFileAuditHistoryViewModel(payload, "General Care File Assessment");
    const hasSrc = careFileAuditHistoryGroupsHaveSource(groups);
    return { groups, hasSrc };
  }, [auditData]);

  const isQuestionsOnly =
    !careFileViewModel &&
    !isFallRegisterTable &&
    !isRegistrationTrackerTable &&
    !isIncidentAuditTable &&
    !isWoundsAnalysisTable &&
    !isGridBased &&
    (!!auditData?.homeBasedData || ["9", "10", "42"].includes(auditId));
  const isResidentsWithUnit = ["28", "34", "35", "36", "37", "38", "39"].includes(auditId);

  // States for unit filtering
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  // State for active subject sidebar selection
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  useEffect(() => {
    void loadRecordData();
  }, [auditId, recordId]);

  const loadRecordData = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('manager_audit_history')
        .select('*')
        .eq('id', recordId)
        .single();

      if (error) throw error;

      if (data) {
        const record = {
          ...data,
          id: data.id,
          completedDate: data.completed_date,
          auditor: data.auditor,
          residentsAudited: data.entries_count,
          data: data.data
        };

        // Fetch teams for unit filters if relevant
        if (["28", "34", "35", "36", "37", "38", "39"].includes(data.audit_type_id)) {
          const { data: teamData } = await supabase
            .from('teams')
            .select('id, name')
            .eq('care_home_id', data.care_home_id);
          if (teamData) {
            setTeams(teamData);
            if (teamData.length > 0) {
              setSelectedUnitId(teamData[0].id);
            }
          }

          // Fetch resident current team mapping to support legacy records that don't store teamId in snapshot
          const residentIds = data.data?.residents?.map((r: any) => r.id).filter(Boolean) || [];
          if (residentIds.length > 0) {
            const { data: dbResidents } = await supabase
              .from('residents')
              .select('id, team_id')
              .in('id', residentIds);
            
            if (dbResidents) {
              const teamIdMap = new Map(dbResidents.map((r: any) => [r.id, r.team_id]));
              record.data = {
                ...record.data,
                residents: record.data.residents.map((r: any) => ({
                  ...r,
                  teamId: r.teamId || teamIdMap.get(r.id) || null
                }))
              };
            }
          }
        }
        setRecordData(record);
      } else {
        toast.error("Audit record not found");
        if (onBack) onBack();
        else router.push(`/dashboard/manager-audit/${auditId}/history`);
      }
    } catch (error) {
      console.error("Error loading audit record:", error);
      toast.error("Failed to load audit record");
      if (onBack) onBack();
      else router.push(`/dashboard/manager-audit/${auditId}/history`);
    } finally {
      setIsLoading(false);
    }
  };

  // Set initial selected subject ID
  useEffect(() => {
    if (recordData?.data?.residents && recordData.data.residents.length > 0) {
      setSelectedSubjectId(recordData.data.residents[0].id);
    }
  }, [recordData]);

  // Handle unit filtered residents list
  const displayedResidents = useMemo(() => {
    const residents = auditData?.residents || [];
    if (!isResidentsWithUnit || teams.length === 0 || !selectedUnitId) {
      return residents;
    }
    return residents.filter((r: any) => {
      if (selectedUnitId === "unassigned") return !r.teamId;
      return r.teamId === selectedUnitId;
    });
  }, [auditData?.residents, isResidentsWithUnit, teams, selectedUnitId]);

  // Adjust active subject if filtered out
  useEffect(() => {
    if (displayedResidents.length > 0) {
      const exists = displayedResidents.some((r: any) => r.id === selectedSubjectId);
      if (!exists) {
        setSelectedSubjectId(displayedResidents[0].id);
      }
    } else {
      setSelectedSubjectId(null);
    }
  }, [displayedResidents, selectedSubjectId]);

  // Section grouping logic for Questions-Only
  const homeBasedGroups = useMemo(() => {
    const groups: { title: string; questions: any[] }[] = [];
    let currentGroup = { title: "Questions", questions: [] as any[] };

    const qList = auditData?.homeBasedData?.questions || [];
    for (const q of qList) {
      if (q.isSection) {
        if (currentGroup.questions.length > 0 || currentGroup.title !== "Questions") {
          groups.push(currentGroup);
        }
        currentGroup = { title: q.text, questions: [] };
      } else {
        currentGroup.questions.push(q);
      }
    }
    if (currentGroup.questions.length > 0 || groups.length === 0) {
      groups.push(currentGroup);
    }
    return groups;
  }, [auditData?.homeBasedData?.questions]);

  // Section grouping logic for Sidebar-Based Layouts
  const sidebarGroups = useMemo(() => {
    const groups: { title: string; questions: any[] }[] = [];
    let currentGroup = { title: "Questions", questions: [] as any[] };

    const qList = auditData?.questions || [];
    for (const q of qList) {
      if (q.isSection) {
        if (currentGroup.questions.length > 0 || currentGroup.title !== "Questions") {
          groups.push(currentGroup);
        }
        currentGroup = { title: q.text, questions: [] };
      } else {
        currentGroup.questions.push(q);
      }
    }
    if (currentGroup.questions.length > 0 || groups.length === 0) {
      groups.push(currentGroup);
    }
    return groups;
  }, [auditData?.questions]);

  const activeSubject = useMemo(() => {
    return (auditData?.residents || []).find((r: any) => r.id === selectedSubjectId);
  }, [auditData?.residents, selectedSubjectId]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push(`/dashboard/manager-audit/${auditId}/history`);
    }
  };

  const [isPdfDownloading, setIsPdfDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    try {
      setIsPdfDownloading(true);
      const downloadToast = toast.loading("Generating PDF report...");
      await generateManagerAuditPDF({ recordId, recordData });
      toast.success("PDF report downloaded", { id: downloadToast });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF report");
    } finally {
      setIsPdfDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isPlainTemplate = auditId === "1" || auditData?.gridData?.template_type === 'plain-template';

  const badgeText = useMemo(() => {
    if (isFallRegisterTable) {
      const totalFalls =
        auditData?.fallRegisterData?.totalFalls ??
        auditData?.fallRegisterData?.rows?.length ??
        0;
      return `${totalFalls} Fall${totalFalls !== 1 ? "s" : ""}`;
    }
    if (isRegistrationTrackerTable && registrationTrackerData) {
      const totalStaff =
        registrationTrackerData.totalStaff ??
        registrationTrackerData.rows.length;
      const label =
        registrationTrackerData.trackerType === "nmc"
          ? "Nurse"
          : "Staff Member";
      return `${totalStaff} ${label}${totalStaff !== 1 ? "s" : ""}`;
    }
    if (isIncidentAuditTable && incidentAuditData) {
      const count =
        incidentAuditData.totalIncidents ?? incidentAuditData.rows.length;
      return `${count} Incident${count !== 1 ? "s" : ""}`;
    }
    if (isWoundsAnalysisTable && woundsAnalysisData) {
      const count =
        woundsAnalysisData.totalWounds ?? woundsAnalysisData.rows.length;
      return `${count} Wound${count !== 1 ? "s" : ""}`;
    }
    if (isQuestionsOnly) {
      const qCount = auditData?.homeBasedData?.questions?.filter((q: any) => !q.isSection).length || 0;
      return `${qCount} Questions`;
    }
    if (isGridBased) {
      const rowCount = auditData?.gridData?.rowQuestions?.filter((q: any) => !q.isSection).length || 0;
      return `${rowCount} Rows`;
    }
    const count = recordData?.residentsAudited || 0;
    if (isTeamBased) return `${count} Team${count !== 1 ? "s" : ""}`;
    if (isStaffBased) return `${count} Staff Member${count !== 1 ? "s" : ""}`;
    return `${count} Resident${count !== 1 ? "s" : ""}`;
  }, [isFallRegisterTable, isRegistrationTrackerTable, registrationTrackerData, isIncidentAuditTable, incidentAuditData, isWoundsAnalysisTable, woundsAnalysisData, isQuestionsOnly, isGridBased, isTeamBased, isStaffBased, auditData, recordData]);

  const actionPlans = auditData?.actionPlans || [];
  const isTableAuditView =
    isFallRegisterTable ||
    isRegistrationTrackerTable ||
    isIncidentAuditTable ||
    isWoundsAnalysisTable;

  const printStyles = (
    <style
      dangerouslySetInnerHTML={{
        __html: `
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `,
      }}
    />
  );

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted-foreground text-sm font-medium">Loading audit record...</p>
      </div>
    );
  }

  if (!recordData) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted-foreground text-sm font-medium">Audit record not found</p>
      </div>
    );
  }

  const actionPlansSection = (
    <section className="space-y-4">
      <div className="mb-1 flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Action Plans</h3>
        <Badge variant="secondary" className="text-xs">
          {actionPlans.length}
        </Badge>
      </div>
      {actionPlans.length === 0 ? (
        <div className="rounded-lg border bg-muted/20 p-8 text-center text-muted-foreground text-xs">
          No action plans were stored for this completion.
        </div>
      ) : (
        <div className="min-w-0 w-full overflow-x-auto rounded-lg border bg-white">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Subject / Area</TableHead>
                <TableHead className="font-semibold">Action Plan</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Due Date</TableHead>
                <TableHead className="font-semibold">Assigned To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actionPlans.map((plan: {
                id: string;
                residentName?: string;
                text?: string;
                status?: string;
                dueDate?: string;
                assignedToName?: string;
                assignedToEmail?: string;
                assignedTo?: string;
              }) => {
                const assignee =
                  plan.assignedToName?.trim() ||
                  plan.assignedToEmail?.trim() ||
                  plan.assignedTo?.trim() ||
                  "—";
                const subject = plan.residentName || "General";
                const dueDateText = plan.dueDate
                  ? format(new Date(plan.dueDate), "dd/MM/yyyy")
                  : "—";

                return (
                  <TableRow key={plan.id}>
                    <TableCell className="align-top whitespace-normal break-words text-sm font-semibold text-primary">
                      {subject}
                    </TableCell>
                    <TableCell className="align-top whitespace-normal break-words text-sm">
                      {plan.text || "—"}
                    </TableCell>
                    <TableCell className="align-top">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                          actionPlanStatusClass(plan.status)
                        )}
                      >
                        {actionPlanStatusLabel(plan.status)}
                      </span>
                    </TableCell>
                    <TableCell className="align-top whitespace-normal break-words text-sm text-muted-foreground">
                      {dueDateText}
                    </TableCell>
                    <TableCell className="align-top whitespace-normal break-words text-sm">
                      {assignee}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );

  const historyHeader = (
    <div className="mb-4 w-full max-w-full min-w-0 shrink-0">
      <div className="flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="no-print shrink-0"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">{auditName}</h2>
        <Badge variant="outline" className="max-w-full truncate">
          {badgeText}
        </Badge>
        <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:ml-auto sm:w-auto">
          <Button
            onClick={handlePrint}
            size="sm"
            variant="outline"
            className="no-print shrink-0"
          >
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button
            onClick={handleDownloadPDF}
            size="sm"
            variant="default"
            className="no-print shrink-0"
            disabled={isPdfDownloading}
          >
            <Download className="mr-2 h-4 w-4" />
            {isPdfDownloading ? "Downloading..." : "Download PDF"}
          </Button>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Completed by {recordData.auditor} ·{" "}
        {format(new Date(recordData.completedDate), "PPP")}
      </p>
    </div>
  );

  if (isTableAuditView) {
    return (
      <div className="flex h-full w-full max-w-full min-w-0 flex-1 flex-col overflow-x-hidden p-6 pt-4">
        {printStyles}
        {historyHeader}
        <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="min-h-0 w-full max-w-full min-w-0 flex-1 overflow-auto">
            {isFallRegisterTable ? (
              <FallRegisterTable
                auditMonth={
                  auditData.fallRegisterData.auditMonth ||
                  new Date(recordData.completedDate).toISOString().slice(0, 7)
                }
                rows={auditData.fallRegisterData.rows || []}
                answers={auditData.fallRegisterData.answers || []}
                readOnly
              />
            ) : registrationTrackerData ? (
              <RegistrationTrackerTable
                trackerType={registrationTrackerData.trackerType}
                rows={registrationTrackerData.rows}
                questions={registrationTrackerData.columnQuestions}
                answers={registrationTrackerData.answers}
                readOnly
                compact
              />
            ) : incidentAuditData ? (
              <IncidentAuditTable
                rows={incidentAuditData.rows}
                questions={incidentAuditData.columnQuestions}
                answers={incidentAuditData.answers}
                auditMonthLabel={
                  incidentAuditData.auditMonth
                    ? formatAuditMonthLabel(incidentAuditData.auditMonth)
                    : undefined
                }
                readOnly
                compact
                teams={teams}
                selectedUnitId={selectedUnitId}
                onUnitChange={setSelectedUnitId}
              />
            ) : woundsAnalysisData ? (
              <WoundsAnalysisTable
                rows={woundsAnalysisData.rows}
                questions={woundsAnalysisData.columnQuestions}
                answers={woundsAnalysisData.answers}
                auditMonthLabel={
                  woundsAnalysisData.auditMonth
                    ? formatAuditMonthLabel(woundsAnalysisData.auditMonth)
                    : undefined
                }
                readOnly
                compact
                teams={teams}
                selectedUnitId={selectedUnitId}
                onUnitChange={setSelectedUnitId}
              />
            ) : null}
          </div>
          <div className="shrink-0 border-t p-4 sm:p-6">{actionPlansSection}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-x-hidden p-6 pt-4">
      {printStyles}

      {historyHeader}

      {/* Main card container */}
      <div className="min-w-0 flex-1 overflow-x-hidden rounded-lg border bg-card shadow-sm flex flex-col md:flex-row">
        
        {/* Left Sidebar for Subject selection (only for sidebar formats) */}
        {!isQuestionsOnly && !isGridBased && !isFallRegisterTable && !isRegistrationTrackerTable && !isIncidentAuditTable && !isWoundsAnalysisTable && (
          <>
            {/* Desktop Sidebar */}
            <aside className="w-[240px] border-r shrink-0 hidden md:block bg-background/50">
              <div className="px-2 py-3 h-full flex flex-col">
                {/* Unit/Home filter dropdown */}
                {isResidentsWithUnit && teams.length > 0 && (
                  <div className="px-2 pb-3 border-b border-slate-100 mb-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Unit/Home</label>
                    <select
                      value={selectedUnitId || ""}
                      onChange={(e) => setSelectedUnitId(e.target.value)}
                      className="w-full text-xs font-semibold rounded-md border border-slate-200 py-1.5 px-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                      <option value="unassigned">Unassigned Residents</option>
                    </select>
                  </div>
                )}

                {/* Sidebar Title */}
                <div className="px-2 pb-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
                    {isTeamBased ? "Teams" : isStaffBased ? "Staff" : "Residents"}
                  </p>
                </div>

                {/* Scrollable list of subjects */}
                <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                  {displayedResidents.length === 0 ? (
                    <p className="px-2 py-2 text-xs text-muted-foreground">
                      {selectedUnitId ? "No records in this unit." : `No ${isTeamBased ? "teams" : isStaffBased ? "staff" : "residents"} found.`}
                    </p>
                  ) : (
                    displayedResidents.map((r: any) => {
                      const isActive = r.id === selectedSubjectId;
                      const initials = `${r.firstName?.[0] || ""}${r.lastName?.[0] || ""}`.toUpperCase() || "?";
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setSelectedSubjectId(r.id)}
                          className={cn(
                            "flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] leading-snug transition-colors duration-150",
                            isActive
                              ? "bg-muted font-medium text-foreground"
                              : "text-muted-foreground hover:bg-muted/80"
                          )}
                        >
                          <Avatar className="size-6 shrink-0">
                            <AvatarImage src={r.imageUrl} alt="" />
                            <AvatarFallback className="bg-primary/10 text-[10px] font-medium text-primary">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="min-w-0 flex-1 truncate">
                            {`${r.firstName || ""} ${r.lastName || ""}`.trim()}
                            {r.roomNumber || (isResidentsWithUnit && r.teamId) ? (
                              <span className="ml-1 text-[11px] text-muted-foreground">
                                · {(() => {
                                  const roomText = r.roomNumber ? (isStaffBased ? r.roomNumber : `Rm ${r.roomNumber}`) : "";
                                  const team = teams?.find((t) => t.id === r.teamId);
                                  const teamName = team ? team.name : "";
                                  if (roomText && teamName) {
                                    return `(${roomText}) · ${teamName.toUpperCase()}`;
                                  }
                                  return roomText || teamName.toUpperCase();
                                })()}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </aside>
          </>
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 space-y-10 overflow-x-hidden p-4 sm:p-6">
          
          {/* Mobile Dropdown subject selector */}
          {!isQuestionsOnly && !isGridBased && !isFallRegisterTable && !isRegistrationTrackerTable && !isIncidentAuditTable && !isWoundsAnalysisTable && (
            <div className="md:hidden mb-4 no-print">
              {isResidentsWithUnit && teams.length > 0 && (
                <div className="mb-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Unit/Home</label>
                  <select
                    value={selectedUnitId || ""}
                    onChange={(e) => setSelectedUnitId(e.target.value)}
                    className="w-full text-xs font-semibold rounded-md border border-slate-200 py-1.5 px-2 bg-white text-slate-800"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                    <option value="unassigned">Unassigned Residents</option>
                  </select>
                </div>
              )}
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
                Select {isTeamBased ? "Team" : isStaffBased ? "Staff Member" : "Resident"}
              </label>
              <select
                value={selectedSubjectId || ""}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full text-sm font-semibold rounded-md border border-input py-2 px-3 bg-white text-foreground"
              >
                {displayedResidents.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {`${r.firstName || ""} ${r.lastName || ""}`.trim()} {r.roomNumber ? `(Rm ${r.roomNumber})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Active Subject Info Panel (only for sidebar formats) */}
          {!isQuestionsOnly &&
            !isGridBased &&
            !isFallRegisterTable &&
            !isRegistrationTrackerTable &&
            !isIncidentAuditTable && !isWoundsAnalysisTable &&
            activeSubject && (
            <div className="flex items-center gap-3 border-b pb-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={activeSubject.imageUrl} />
                <AvatarFallback>
                  {`${activeSubject.firstName?.[0] || ""}${activeSubject.lastName?.[0] || ""}`.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {`${activeSubject.firstName || ""} ${activeSubject.lastName || ""}`.trim()}
                </h3>
                {activeSubject.roomNumber && (
                  <p className="text-xs text-muted-foreground">
                    {isStaffBased ? `Role: ${activeSubject.roomNumber}` : `Room ${activeSubject.roomNumber}`}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Render layout format */}
          {careFileViewModel ? (
            /* Care File Audit Format */
            <div className="space-y-8">
              {careFileViewModel.groups.map((group, gIdx) => (
                <section key={gIdx} className="space-y-4">
                  <h2 className="text-base font-bold text-foreground border-b pb-2">{group.sectionTitle}</h2>
                  {group.subsections.map((sub, sIdx) => (
                    <div key={sIdx} className="space-y-3">
                      {sub.subsectionTitle ? (
                        <h3 className="text-sm font-semibold text-foreground/90">{sub.subsectionTitle}</h3>
                      ) : null}
                      <div className="min-w-0 w-full overflow-hidden rounded-lg border bg-white">
                        <Table className="w-full table-fixed">
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="w-[45%] font-semibold">Question</TableHead>
                              <TableHead className="w-[40%] font-semibold">Comment / Action</TableHead>
                              <TableHead className="w-[15%] font-semibold">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sub.rowsInOrder.map((row) => (
                              <TableRow key={row.id} className="hover:bg-muted/30">
                                <TableCell className="align-top whitespace-normal break-words text-sm font-medium">
                                  {row.text}
                                </TableCell>
                                <TableCell className="align-top whitespace-normal break-words text-sm text-muted-foreground">
                                  {row.comment.trim() || row.actionRequired || "—"}
                                </TableCell>
                                <TableCell className="align-top">
                                  <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", rowStatusPillClass(row.status))}>
                                    {rowStatusLabel(row.status)}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                </section>
              ))}
            </div>
          ) : isQuestionsOnly ? (
            /* Questions Only Format */
            <div className="space-y-8">
              {homeBasedGroups.map((group, gIdx) => {
                let reviewedCount = 0;
                let totalCount = 0;
                const subjectId = auditData?.homeBasedData?.subjectId || AUDIT_LEVEL_SUBJECT_ID;
                
                for (const q of group.questions) {
                  const answer = (auditData?.homeBasedData?.answers || []).find(
                    (item: any) => item.residentId === subjectId && item.questionId === q.id
                  );
                  if (q.type === "compliance" || q.type === "yesno") {
                    totalCount++;
                    if (answer?.value && answer.value !== "not-reviewed" && answer.value !== "") {
                      reviewedCount++;
                    }
                  }
                }

                return (
                  <section key={gIdx} className="space-y-4">
                    <div className="flex flex-col gap-0.5">
                      <h2 className="text-base font-bold text-foreground">{group.title}</h2>
                      <p className="text-xs text-muted-foreground">
                        {reviewedCount} of {totalCount} compliance items reviewed
                      </p>
                    </div>

                    <div className="min-w-0 w-full overflow-hidden rounded-lg border bg-white">
                      <Table className="w-full table-fixed">
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-[45%] font-semibold">Question</TableHead>
                            <TableHead className="w-[40%] font-semibold">Comment</TableHead>
                            <TableHead className="w-[15%] font-semibold">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.questions.map((q: any) => {
                            const answer = (auditData?.homeBasedData?.answers || []).find(
                              (item: any) => item.residentId === subjectId && item.questionId === q.id
                            );
                            const comment = (auditData?.homeBasedData?.comments || []).find(
                              (item: any) => item.residentId === subjectId && item.questionId === q.id
                            ) || (auditData?.homeBasedData?.comments || []).find(
                              (item: any) => item.residentId === subjectId && !item.questionId
                            );
                            
                            const statusVal = answer?.value || "";
                            const commentVal = comment?.text || "";

                            return (
                              <TableRow key={q.id} className="hover:bg-muted/30">
                                <TableCell className="align-top whitespace-normal break-words text-sm font-medium">
                                  <div>{q.text}</div>
                                  <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                                    {q.type === "yesno" ? "Yes / No" : q.type === "text" ? "Text" : q.type === "date" ? "Date" : "Compliance"}
                                  </div>
                                </TableCell>
                                <TableCell className="align-top whitespace-normal break-words text-sm text-muted-foreground">
                                  {commentVal || "—"}
                                </TableCell>
                                <TableCell className="align-top">
                                  <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", getStatusPillClass(statusVal, q.type))}>
                                    {getDisplayStatus(statusVal, q.type)}
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </section>
                );
              })}
            </div>
          ) : isGridBased ? (
            /* Grid Layout Format */
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-foreground">Audit Matrix Check</h2>
                <p className="text-xs text-muted-foreground">Overview of grid questions and column options</p>
              </div>

              <div className="min-w-0 w-full overflow-x-auto rounded-lg border bg-white">
                <Table className="w-full table-fixed">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[300px] font-semibold sticky left-0 bg-muted z-10 border-r">Questions</TableHead>
                      {(auditData?.gridData?.columnQuestions || []).map((q: any) => (
                        <TableHead key={q.id} className="min-w-[120px] font-semibold text-center border-r">
                          {q.text}
                        </TableHead>
                      ))}
                      {!isPlainTemplate && (
                        <>
                          <TableHead className="min-w-[200px] font-semibold border-r">Comment</TableHead>
                          <TableHead className="min-w-[200px] font-semibold border-r">Action Required</TableHead>
                          <TableHead className="min-w-[150px] font-semibold">Action Completed</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(auditData?.gridData?.rowQuestions || []).map((rowQ: any) => {
                      if (rowQ.isSection) {
                        return (
                          <TableRow key={rowQ.id} className="bg-accent/35 font-bold">
                            <TableCell
                              colSpan={(auditData?.gridData?.columnQuestions || []).length + 1 + (isPlainTemplate ? 0 : 3)}
                              className="bg-accent/10 py-3 pl-4 font-semibold text-foreground text-sm"
                            >
                              {rowQ.text}
                            </TableCell>
                          </TableRow>
                        );
                      }

                      return (
                        <TableRow key={rowQ.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="sticky left-0 bg-white border-r z-10 font-medium text-sm pr-4 whitespace-normal break-words">
                            {rowQ.text}
                          </TableCell>
                          {(auditData?.gridData?.columnQuestions || []).map((colQ: any) => {
                            const answer = auditData?.gridData?.answers?.find(
                              (a: any) => a.residentId === rowQ.id && a.questionId === colQ.id
                            );
                            const val = answer?.value;

                            return (
                              <TableCell key={colQ.id} className="text-center border-r py-3">
                                {val ? (
                                  <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", getStatusPillClass(val, colQ.type))}>
                                    {getDisplayStatus(val, colQ.type)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </TableCell>
                            );
                          })}
                          {!isPlainTemplate && (
                            <>
                              <TableCell className="text-sm text-muted-foreground border-r py-3 whitespace-normal break-words">
                                {auditData?.gridData?.fixedColumnData?.[rowQ.id]?.comment || "—"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground border-r py-3 whitespace-normal break-words">
                                {auditData?.gridData?.fixedColumnData?.[rowQ.id]?.actionRequired || "—"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground py-3 whitespace-normal break-words">
                                {auditData?.gridData?.fixedColumnData?.[rowQ.id]?.actionCompleted || "—"}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            /* Sidebar-Based layout checklist (Residents, Staff, Teams) */
            <div className="space-y-8">
              {!activeSubject ? (
                <div className="rounded-lg border p-8 text-center text-muted-foreground bg-muted/20 text-xs">
                  Select a {isTeamBased ? "team" : isStaffBased ? "staff member" : "resident"} on the left to see details.
                </div>
              ) : (
                sidebarGroups.map((group, gIdx) => {
                  let reviewedCount = 0;
                  let totalCount = 0;
                  
                  for (const q of group.questions) {
                    const answer = activeSubject.answers?.find((a: any) => a.questionId === q.id);
                    if (q.type === "compliance" || q.type === "yesno") {
                      totalCount++;
                      if (answer?.value && answer.value !== "not-reviewed" && answer.value !== "") {
                        reviewedCount++;
                      }
                    }
                  }

                  return (
                    <section key={gIdx} className="space-y-4">
                      <div className="flex flex-col gap-0.5">
                        <h2 className="text-base font-bold text-foreground">{group.title}</h2>
                        <p className="text-xs text-muted-foreground">
                          {reviewedCount} of {totalCount} compliance items reviewed
                        </p>
                      </div>

                      <div className="min-w-0 w-full overflow-hidden rounded-lg border bg-white">
                        <Table className="w-full table-fixed">
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="w-[45%] font-semibold">Question</TableHead>
                              <TableHead className="w-[40%] font-semibold">Comment</TableHead>
                              <TableHead className="w-[15%] font-semibold">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.questions.map((q: any) => {
                              const answer = activeSubject.answers?.find((a: any) => a.questionId === q.id);
                              const statusVal = answer?.value || "";
                              const commentVal = answer?.comment || "";

                              return (
                                <TableRow key={q.id} className="hover:bg-muted/30">
                                  <TableCell className="align-top whitespace-normal break-words text-sm font-medium">
                                    <div>{q.text}</div>
                                    <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                                      {q.type === "yesno" ? "Yes / No" : q.type === "text" ? "Text" : q.type === "date" ? "Date" : "Compliance"}
                                    </div>
                                  </TableCell>
                                  <TableCell className="align-top whitespace-normal break-words text-sm text-muted-foreground">
                                    {commentVal || "—"}
                                  </TableCell>
                                  <TableCell className="align-top">
                                    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", getStatusPillClass(statusVal, q.type))}>
                                      {getDisplayStatus(statusVal, q.type)}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </section>
                  );
                })
              )}
            </div>
          )}

          {/* Global Action Plans snapshot */}
          <section className="scroll-mt-28 space-y-4 border-t pt-10">
            {actionPlansSection}
          </section>

        </main>
      </div>
    </div>
  );
}
