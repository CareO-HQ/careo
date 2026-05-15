"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, ChevronRight, Download, ClipboardList, CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { withRoleGuard } from "@/lib/route-guards";
import { useProfile } from "@/hooks/use-profile";
import {
  buildCareFileAuditHistoryViewModel,
  careFileAuditHistoryGroupsHaveSource,
  type CareFileActionPlanSnapshot,
  type CareFileAuditHistoryPayload,
  type CareFileAuditHistoryRowStatus,
  type CareFileHistoryQuestionRow,
} from "@/lib/manager-care-file-audit-history";
import { downloadCareFileAuditHistoryPdf } from "@/lib/manager-care-file-audit-history-pdf";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ResidentCareFileRecordPageProps {
  params: Promise<{ residentId: string; recordId: string }>;
}

/* ------------------------------------------------------------------ */
/*  Status helpers                                                     */
/* ------------------------------------------------------------------ */

function rowStatusLabel(status: CareFileAuditHistoryRowStatus): string {
  switch (status) {
    case "compliant": return "Compliant";
    case "action-required": return "Action Required";
    case "non-compliant": return "Non-Compliant";
    case "not-applicable": return "N/A";
    default: return "Not reviewed";
  }
}

function rowStatusPillClass(status: CareFileAuditHistoryRowStatus): string {
  switch (status) {
    case "compliant": return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/45 dark:text-emerald-300";
    case "action-required": return "bg-amber-100 text-amber-950 dark:bg-amber-950/35 dark:text-amber-100";
    case "non-compliant": return "bg-destructive/15 text-destructive dark:bg-destructive/20";
    case "not-applicable": return "bg-muted text-muted-foreground";
    default: return "bg-muted text-muted-foreground";
  }
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

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SubsectionQuestionTable({ rows, showSource }: {
  rows: CareFileHistoryQuestionRow[];
  showSource: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground bg-muted/20">
        No questions in this sub-section.
      </div>
    );
  }
  return (
    <div className="min-w-0 w-full overflow-hidden rounded-lg border">
      <Table className="w-full table-fixed">
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead
              className={
                showSource
                  ? "w-[32%] font-semibold"
                  : "w-[40%] font-semibold"
              }
            >
              Question
            </TableHead>
            <TableHead
              className={
                showSource
                  ? "w-[30%] font-semibold"
                  : "w-[45%] font-semibold"
              }
            >
              Comment
            </TableHead>
            <TableHead className="w-[15%] font-semibold">Status</TableHead>
            {showSource ? (
              <TableHead className="w-[23%] font-semibold">Source</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className="hover:bg-muted/30">
              <TableCell className="align-top break-words text-sm font-medium">{row.text}</TableCell>
              <TableCell className="align-top break-words text-sm text-muted-foreground">
                {row.comment.trim() || row.actionRequired || "—"}
              </TableCell>
              <TableCell className="align-top">
                <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", rowStatusPillClass(row.status))}>
                  {rowStatusLabel(row.status)}
                </span>
              </TableCell>
              {showSource ? (
                <TableCell className="align-top break-words text-sm text-muted-foreground">
                  {row.source || "—"}
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

const HISTORY_SUB_ANCHOR = (gIdx: number, subIdx: number) =>
  `care-file-audit-history-sub-${gIdx}-${subIdx}`;
const HISTORY_ACTION_PLANS_ANCHOR = "care-file-audit-history-action-plans";

function ActionPlanTableView({ plans }: { plans: CareFileActionPlanSnapshot[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Action Plans</h3>
        <Badge variant="secondary" className="text-xs">{plans.length}</Badge>
      </div>
      <div className="min-w-0 w-full overflow-hidden rounded-lg border">
        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[38%] font-semibold">Action Plan</TableHead>
              <TableHead className="w-[14%] font-semibold">Status</TableHead>
              <TableHead className="w-[30%] font-semibold">Comment</TableHead>
              <TableHead className="w-[18%] font-semibold">Assigned To</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => {
              const assignee = plan.assigned_to_name?.trim() || plan.assigned_to_email?.trim() || "—";
              return (
                <TableRow key={plan.id}>
                  <TableCell className="align-top break-words text-sm font-medium">{plan.description || "—"}</TableCell>
                  <TableCell className="align-top">
                    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", actionPlanStatusClass(plan.status))}>
                      {actionPlanStatusLabel(plan.status)}
                    </span>
                  </TableCell>
                  <TableCell className="align-top break-words text-sm text-muted-foreground">
                    {plan.latest_comment?.trim() || "—"}
                  </TableCell>
                  <TableCell className="align-top break-words text-sm">{assignee}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

function ResidentCareFileRecordPage({ params }: ResidentCareFileRecordPageProps) {
  const router = useRouter();
  const { profile } = useProfile();
  const resolvedParams = React.use(params);
  const residentId = resolvedParams.residentId;
  const recordId = resolvedParams.recordId;

  const [isLoading, setIsLoading] = useState(true);
  const [recordData, setRecordData] = useState<Record<string, unknown> | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    void loadRecordData();
  }, [residentId, recordId]);

  const auditPayload = React.useMemo((): CareFileAuditHistoryPayload | null => {
    const auditData = recordData?.data as Record<string, unknown> | undefined;
    if (!auditData) return null;
    return {
      rowQuestions: (auditData.rowQuestions as CareFileAuditHistoryPayload["rowQuestions"]) ?? [],
      columnQuestions: (auditData.columnQuestions as CareFileAuditHistoryPayload["columnQuestions"]) ?? [],
      answers: (auditData.answers as CareFileAuditHistoryPayload["answers"]) ?? [],
      fixedColumnData: (auditData.fixedColumnData as CareFileAuditHistoryPayload["fixedColumnData"]) ?? {},
    };
  }, [recordData]);

  const { sectionGroups, hasSource } = React.useMemo(() => {
    if (!auditPayload) {
      return { sectionGroups: [], hasSource: false };
    }

    const groups = buildCareFileAuditHistoryViewModel(auditPayload, "General Assessments");
    const hasSrc = careFileAuditHistoryGroupsHaveSource(groups);

    return { sectionGroups: groups, hasSource: hasSrc };
  }, [auditPayload]);

  const auditData = recordData?.data as Record<string, unknown> | undefined;
  const rawPlans = auditData?.actionPlansSnapshot;
  const actionPlans: CareFileActionPlanSnapshot[] = Array.isArray(rawPlans) ? (rawPlans as CareFileActionPlanSnapshot[]) : [];

  const loadRecordData = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("manager_audit_history")
        .select("*")
        .eq("id", recordId)
        .single();
      if (error) throw error;
      if (data) {
        setRecordData(data as Record<string, unknown>);
      } else {
        toast.error("Audit record not found");
        router.push(`/dashboard/manager-audit/0/resident/${residentId}/history`);
      }
    } catch (error) {
      console.error("Error loading audit record:", error);
      toast.error("Failed to load audit record");
      router.push(`/dashboard/manager-audit/0/resident/${residentId}/history`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.push(`/dashboard/manager-audit/0/resident/${residentId}/history`);
  };

  const handleDownloadPdf = async () => {
    if (!recordData) return;
    const data = recordData.data as Record<string, unknown> | undefined;
    if (!data) { toast.error("No audit data to export"); return; }
    const payload: CareFileAuditHistoryPayload = {
      rowQuestions: (data.rowQuestions as CareFileAuditHistoryPayload["rowQuestions"]) ?? [],
      columnQuestions: (data.columnQuestions as CareFileAuditHistoryPayload["columnQuestions"]) ?? [],
      answers: (data.answers as CareFileAuditHistoryPayload["answers"]) ?? [],
      fixedColumnData: (data.fixedColumnData as CareFileAuditHistoryPayload["fixedColumnData"]) ?? {},
    };
    const residentName = typeof data.residentName === "string" ? data.residentName : "Resident";
    const completedDateIso = typeof recordData.completed_date === "string" ? recordData.completed_date : new Date().toISOString();
    const auditor = typeof recordData.auditor === "string" ? recordData.auditor : "—";
    const snapshot = Array.isArray(data.actionPlansSnapshot) ? (data.actionPlansSnapshot as CareFileActionPlanSnapshot[]) : undefined;

    setPdfLoading(true);
    try {
      await downloadCareFileAuditHistoryPdf({
        fileName: `care-file-audit-${residentId}-${recordId}.pdf`,
        title: "Care file audit record",
        residentName, completedDateIso, auditor,
        payload, actionPlansSnapshot: snapshot,
        orgLogoUrl: profile?.organization_logo_url ?? null,
      });
      toast.success("PDF downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  if (isLoading) {
    return (<div className="flex flex-1 items-center justify-center p-8"><p className="text-muted-foreground">Loading audit record...</p></div>);
  }

  if (!recordData || !auditPayload) {
    return (<div className="flex flex-1 items-center justify-center p-8"><p className="text-muted-foreground">Audit record not found</p></div>);
  }

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-x-hidden p-6 pt-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <h2 className="text-2xl font-bold tracking-tight">Care file audit record</h2>
          <Badge variant="outline" className="truncate">{String(auditData?.residentName ?? "Resident")}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>Completed by {String(recordData.auditor ?? "—")} · {format(new Date(String(recordData.completed_date)), "PPP")}</span>
          <Button size="sm" disabled={pdfLoading} onClick={() => void handleDownloadPdf()}>
            <Download className="mr-2 h-4 w-4" />{pdfLoading ? "Generating…" : "Download PDF"}
          </Button>
        </div>
      </div>

      <div className="min-w-0 flex-1 overflow-x-hidden rounded-lg border bg-card shadow-sm">
        <main className="min-w-0 space-y-10 overflow-x-hidden p-4 sm:p-6">
          {sectionGroups.map((group, gIdx) => (
            <div key={group.sectionId} className="space-y-8">
              {group.subsections.map((sub, subIdx) => (
                <section
                  key={sub.subsectionId}
                  id={HISTORY_SUB_ANCHOR(gIdx, subIdx)}
                  className="scroll-mt-28 space-y-4"
                >
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{group.sectionTitle}</span>
                    {sub.subsectionTitle && (
                      <>
                        <ChevronRight className="h-3 w-3" />
                        <span>{sub.subsectionTitle}</span>
                      </>
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">
                      {sub.subsectionTitle || group.sectionTitle}
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {sub.reviewedCount} of {sub.totalCount} items reviewed
                    </p>
                  </div>
                  <SubsectionQuestionTable rows={sub.rowsInOrder} showSource={hasSource} />
                </section>
              ))}
            </div>
          ))}

          <section
            id={HISTORY_ACTION_PLANS_ANCHOR}
            className="scroll-mt-28 space-y-4 border-t pt-10"
          >
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Action plans</p>
            </div>
            {actionPlans.length === 0 ? (
              <div className="rounded-lg border p-8 text-center text-muted-foreground bg-muted/20">
                No action plans were stored for this completion.
              </div>
            ) : (
              <ActionPlanTableView plans={actionPlans} />
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default withRoleGuard(ResidentCareFileRecordPage, ["manager", "admin", "owner"]);
