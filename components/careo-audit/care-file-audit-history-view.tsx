"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, ChevronRight, Download, Printer, ClipboardList,
} from "lucide-react";
import { format } from "date-fns";
import {
  buildCareFileAuditHistoryViewModel,
  buildPayloadFromTemplateAndCompletion,
  careFileAuditHistoryGroupsHaveSource,
  type CareFileHistoryQuestionRow,
  type CareFileTemplateItem,
  type CareFileCompletionItem,
  type CareFileActionPlanSnapshot,
} from "@/lib/manager-care-file-audit-history";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AuditHistoryViewProps {
  resident: { first_name?: string; last_name?: string; room_number?: string; image_url?: string } | null;
  dbResponse: any;
  dbActionPlans: any[];
  templateItems: CareFileTemplateItem[] | null;
  onBack: () => void;
}

/* ------------------------------------------------------------------ */
/*  Status helpers                                                     */
/* ------------------------------------------------------------------ */

const statusColor = (s: string) => {
  switch (s) {
    case "compliant": return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300";
    case "action-required": return "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100";
    case "non-compliant": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    case "not-applicable": return "bg-muted text-muted-foreground";
    default: return "bg-muted text-muted-foreground";
  }
};

const statusLabel = (s: string) => {
  switch (s) {
    case "compliant": return "Compliant";
    case "action-required": return "Action Required";
    case "non-compliant": return "Non-Compliant";
    case "not-applicable": return "N/A";
    case "not-reviewed": return "Not reviewed";
    default: return s || "—";
  }
};

const planStatusColor = (s?: string) => {
  switch (s) {
    case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "in_progress": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "completed": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "overdue": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  }
};

const planStatusLabel = (s?: string) => {
  switch (s) {
    case "pending": return "Pending";
    case "in_progress": return "In Progress";
    case "completed": return "Completed";
    case "overdue": return "Overdue";
    default: return s || "Pending";
  }
};

/* ------------------------------------------------------------------ */
/*  Flat fallback view (no template)                                   */
/* ------------------------------------------------------------------ */

function flatCompletionStatusKey(raw: unknown): string {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s || s === "unchecked" || s === "not-reviewed" || s === "not_reviewed") {
    return "not-reviewed";
  }
  if (s === "compliant" || s === "yes") return "compliant";
  if (s === "action-required" || s === "action_required") return "action-required";
  if (s === "non-compliant" || s === "non_compliant" || s === "no") {
    return "non-compliant";
  }
  if (s === "not-applicable" || s === "not_applicable") return "not-applicable";
  return "not-reviewed";
}

interface AuditHistoryActionPlanRow {
  id: string;
  description?: string | null;
  text?: string | null;
  status?: string | null;
  latest_comment?: string | null;
  latestComment?: string | null;
  assigned_to_name?: string | null;
  assignedTo?: string | null;
}

function FlatFallbackView({ items, actionPlans }: {
  items: { itemId: string; itemName?: string; status?: string; notes?: string }[];
  actionPlans: readonly AuditHistoryActionPlanRow[];
}) {
  const rows = items.map((item) => ({
    ...item,
    displayKey: flatCompletionStatusKey(item.status),
  }));

  return (
    <div className="space-y-6">
      <div className="min-w-0 w-full overflow-hidden rounded-lg border">
        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[42%] font-semibold">Question</TableHead>
              <TableHead className="w-[18%] font-semibold">Status</TableHead>
              <TableHead className="w-[40%] font-semibold">Comment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">No checklist items in this audit.</TableCell>
              </TableRow>
            ) : rows.map((item) => (
              <TableRow key={item.itemId}>
                <TableCell className="align-top break-words font-medium">{item.itemName ?? "—"}</TableCell>
                <TableCell className="align-top">
                  <Badge variant="secondary" className={`text-xs ${statusColor(item.displayKey)}`}>
                    {statusLabel(item.displayKey)}
                  </Badge>
                </TableCell>
                <TableCell className="align-top break-words text-sm">{item.notes?.trim() || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {actionPlans.length > 0 && <ActionPlanTable plans={actionPlans} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Action Plan Table                                                  */
/* ------------------------------------------------------------------ */

function ActionPlanTable({ plans }: { plans: readonly AuditHistoryActionPlanRow[] }) {
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
            {plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell className="align-top break-words text-sm font-medium">{plan.description || plan.text || "—"}</TableCell>
                <TableCell className="align-top">
                  <Badge variant="secondary" className={`text-xs ${planStatusColor(plan.status ?? undefined)}`}>
                    {planStatusLabel(plan.status ?? undefined)}
                  </Badge>
                </TableCell>
                <TableCell className="align-top break-words text-sm text-muted-foreground">{plan.latest_comment || plan.latestComment || "—"}</TableCell>
                <TableCell className="align-top break-words text-sm">{plan.assigned_to_name || plan.assignedTo || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-section question table                                         */
/* ------------------------------------------------------------------ */

function SubsectionQuestionTable({ rows, showSource }: {
  rows: CareFileHistoryQuestionRow[];
  showSource: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground bg-muted/20">
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
                {row.comment || row.actionRequired || "—"}
              </TableCell>
              <TableCell className="align-top">
                <Badge variant="secondary" className={`text-xs ${statusColor(row.status)}`}>
                  {statusLabel(row.status)}
                </Badge>
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

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function CareFileAuditHistoryView({
  resident, dbResponse, dbActionPlans, templateItems, onBack,
}: AuditHistoryViewProps) {
  // Build hierarchical view model
  const { sectionGroups, hasSource, isFlat } = useMemo(() => {
    if (!templateItems || templateItems.length === 0) {
      return {
        sectionGroups: [],
        hasSource: false,
        isFlat: true,
      };
    }

    const completionItems: CareFileCompletionItem[] = (dbResponse?.items || [])
      .map((i: Record<string, unknown>) => ({
        itemId: String(i.itemId ?? i.item_id ?? ""),
        itemName: String(i.itemName ?? i.item_name ?? ""),
        status: i.status as string | undefined,
        notes: i.notes as string | undefined,
        date: i.date as string | undefined,
      }))
      .filter((i) => i.itemId.length > 0);

    const payload = buildPayloadFromTemplateAndCompletion(templateItems, completionItems);
    const groups = buildCareFileAuditHistoryViewModel(payload, "General Assessments");
    const srcFound = careFileAuditHistoryGroupsHaveSource(groups);

    return { sectionGroups: groups, hasSource: srcFound, isFlat: false };
  }, [templateItems, dbResponse]);

  const actionPlans = dbActionPlans || [];
  const residentName = resident
    ? `${resident.first_name || ""} ${resident.last_name || ""}`.trim()
    : "Resident";
  const initials = `${(resident?.first_name || "?")[0]}${(resident?.last_name || "?")[0]}`.toUpperCase();

  const handlePrint = () => window.print();
  const handleDownload = () => { setTimeout(() => window.print(), 300); };

  return (
    <>
      <style jsx global>{`
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          @page { margin: 1cm; size: A4; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>

      <div className="fixed inset-0 z-40 flex max-w-full flex-col bg-muted/30 md:left-[var(--sidebar-width,16rem)]">
        {/* Toolbar */}
        <div className="flex min-w-0 shrink-0 items-center justify-between gap-3 border-b bg-background px-4 py-3 print:hidden sm:px-6">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />Print
            </Button>
            <Button size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />Download PDF
            </Button>
          </div>
        </div>

        {/* Content area */}
        <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="h-full min-w-0 p-4 md:p-6">
            <div className="min-h-full min-w-0 max-w-full overflow-hidden rounded-lg border bg-background">
              {/* Header */}
              <div className="border-b bg-muted/30 px-4 py-5 sm:px-6">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={resident?.image_url || undefined} alt={residentName} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h1 className="text-xl font-bold break-words">{dbResponse?.template_name || "Care File Audit"}</h1>
                      <p className="text-sm text-muted-foreground">
                        {residentName} — Room {resident?.room_number || "N/A"}
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 ml-2">Completed</Badge>
                  </div>
                  <div className="hidden shrink-0 text-right text-sm sm:block">
                    <p className="font-medium">Completed</p>
                    <p className="text-muted-foreground">
                      {dbResponse?.completed_at
                        ? format(new Date(dbResponse.completed_at), "PPP")
                        : format(new Date(dbResponse?.created_at || Date.now()), "PPP")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Body */}
              {isFlat ? (
                <div className="min-w-0 p-6">
                  <FlatFallbackView items={dbResponse?.items || []} actionPlans={actionPlans} />
                </div>
              ) : (
                <main className="min-w-0 space-y-10 p-4 sm:p-6">
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
                          <SubsectionQuestionTable
                            rows={sub.rowsInOrder}
                            showSource={hasSource}
                          />
                        </section>
                      ))}
                    </div>
                  ))}

                  <section
                    id={HISTORY_ACTION_PLANS_ANCHOR}
                    className="scroll-mt-28 space-y-4 border-t pt-10 print:break-before-page"
                  >
                    {actionPlans.length === 0 ? (
                      <div className="rounded-lg border p-8 text-center text-muted-foreground bg-muted/20">
                        No action plans recorded for this audit.
                      </div>
                    ) : (
                      <ActionPlanTable plans={actionPlans} />
                    )}
                  </section>
                </main>
              )}

              {/* Footer */}
              <div className="border-t px-6 py-4 bg-muted/30">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <p>Generated by CareO Audit System</p>
                  <p>Page 1 of 1</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
