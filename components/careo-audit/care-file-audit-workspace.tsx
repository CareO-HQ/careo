"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  CalendarIcon,
  ExternalLink,
  Plus,
  Trash2,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  buildCareFileAuditNavEntries,
  normalizeCareFileItemStatus,
  type NormalizedCareFileItemStatus,
  type CareFileTemplateItemShape,
} from "@/lib/care-file-audit";
import { careFileAuditTemplateHistoryPath } from "@/lib/care-file-audit-routes";

export type CareFileAuditItem = CareFileTemplateItemShape & {
  type: "compliance" | "checkbox" | "notes";
};

export interface CareFileItemResponse {
  itemId: string;
  itemName: string;
  status?:
    | ""
    | "compliant"
    | "action-required"
    | "non-compliant"
    | "not-applicable"
    | "checked"
    | "unchecked";
  notes?: string;
  date?: string;
}

export interface CareFileActionPlanRow {
  id: string;
  text: string;
  assignedToName: string;
  dueDate: Date | undefined;
  priority: string;
  status?: string;
  /** Checklist item id when the plan was created from that question. */
  sourceItemId?: string;
}

export interface CareFileAuditWorkspaceProps {
  residentId: string;
  resident: Record<string, unknown>;
  templateName: string;
  templateFrequency?: string;
  items: CareFileAuditItem[];
  itemResponses: Map<string, CareFileItemResponse>;
  onItemResponseChange: (
    itemId: string,
    itemName: string,
    field: string,
    value: unknown
  ) => void;
  onCycleItemStatus: (itemId: string, itemName: string) => void;
  onRemoveItem: (itemId: string) => void;
  /** Real audit template id (not completion id); used for Report → history. */
  templateId: string | null;
  responseId: string | null;
  completionStatus?: string;
  auditedAtLabel?: string;
  auditorLabel?: string;
  actionPlans: CareFileActionPlanRow[];
  onOpenAddItem: () => void;
  onOpenActionPlan: (opts?: { prefill?: string; sourceItemId?: string }) => void;
  onRemoveActionPlan: (id: string) => void;
  onSaveDraft: () => void | Promise<void>;
  onSubmitAudit: () => void | Promise<void>;
  saveDraftPending?: boolean;
  lastEditedHint?: string;
}

function statusLabel(n: NormalizedCareFileItemStatus): string {
  switch (n) {
    case "compliant":
      return "Compliant";
    case "action-required":
      return "Action required";
    case "non-compliant":
      return "Non-compliant";
    case "not-applicable":
      return "N/A";
    default:
      return "Not reviewed";
  }
}

function pillClass(n: NormalizedCareFileItemStatus): string {
  switch (n) {
    case "compliant":
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/45 dark:text-emerald-300";
    case "action-required":
      return "bg-amber-100 text-amber-950 dark:bg-amber-950/35 dark:text-amber-100";
    case "non-compliant":
      return "bg-destructive/15 text-destructive dark:bg-destructive/20";
    case "not-applicable":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function rowTintClass(n: NormalizedCareFileItemStatus): string {
  switch (n) {
    case "action-required":
      return "bg-amber-500/5";
    case "non-compliant":
      return "bg-destructive/5";
    default:
      return "";
  }
}

function StatusGlyph({ status }: { status: NormalizedCareFileItemStatus }) {
  if (status === "not-reviewed") {
    return (
      <span
        className="inline-flex size-4 shrink-0 rounded border border-border"
        aria-hidden
      />
    );
  }
  const iconClass = "size-4 shrink-0 rounded flex items-center justify-center text-[10px] font-semibold";
  if (status === "not-applicable") {
    return (
      <span
        className={cn(iconClass, "bg-muted text-muted-foreground")}
        aria-hidden
      >
        –
      </span>
    );
  }
  const bg =
    status === "compliant"
      ? "bg-emerald-600 text-white dark:bg-emerald-700"
      : status === "action-required"
        ? "bg-amber-600 text-white dark:bg-amber-700"
        : "bg-destructive text-destructive-foreground";
  const Icon =
    status === "compliant" ? Check : status === "action-required" ? AlertCircle : X;
  return (
    <span className={cn(iconClass, bg)} aria-hidden>
      <Icon className="size-2.5" strokeWidth={3} />
    </span>
  );
}

function residentDisplayName(res: Record<string, unknown>): string {
  const fn = (res.first_name ?? res.firstName ?? "") as string;
  const ln = (res.last_name ?? res.lastName ?? "") as string;
  return `${fn} ${ln}`.trim() || "Resident";
}

function residentRoom(res: Record<string, unknown>): string {
  const r =
    (res.room_number ?? res.roomNumber ?? res.room) as string | undefined;
  return r?.toString().trim() || "N/A";
}

function residentImage(res: Record<string, unknown>): string | undefined {
  return (res.image_url ?? res.imageUrl) as string | undefined;
}

function auditStatusBadge(status: string | undefined) {
  const s = status || "draft";
  if (s === "completed") {
    return (
      <Badge className="rounded-full text-xs font-medium bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
        Completed
      </Badge>
    );
  }
  if (s === "in-progress") {
    return (
      <Badge className="rounded-full text-xs font-medium bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
        In progress
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="rounded-full text-xs font-medium">
      Draft
    </Badge>
  );
}

export function CareFileAuditWorkspace(props: CareFileAuditWorkspaceProps) {
  const {
    residentId,
    resident,
    templateName,
    templateFrequency,
    items,
    itemResponses,
    onItemResponseChange,
    onCycleItemStatus,
    onRemoveItem,
    templateId,
    responseId,
    completionStatus,
    auditedAtLabel,
    auditorLabel,
    actionPlans,
    onOpenAddItem,
    onOpenActionPlan,
    onRemoveActionPlan,
    onSaveDraft,
    onSubmitAudit,
    saveDraftPending,
    lastEditedHint,
  } = props;

  const router = useRouter();
  const navEntries = useMemo(
    () => buildCareFileAuditNavEntries(items as CareFileTemplateItemShape[]),
    [items]
  );

  /** Parent sections followed by optional indented subsections (Attio-style grouping). */
  const sidebarGroups = useMemo(() => {
    type Entry = (typeof navEntries)[number];
    type Group =
      | { kind: "single"; entry: Entry }
      | { kind: "withSubs"; parent: Entry; subs: Entry[] };

    const groups: Group[] = [];
    let i = 0;
    while (i < navEntries.length) {
      const e = navEntries[i];
      if (e.depth === 0) {
        const subs: Entry[] = [];
        let j = i + 1;
        while (j < navEntries.length && navEntries[j].depth === 1) {
          subs.push(navEntries[j]);
          j++;
        }
        if (subs.length > 0) {
          groups.push({ kind: "withSubs", parent: e, subs });
          i = j;
        } else {
          groups.push({ kind: "single", entry: e });
          i++;
        }
      } else {
        groups.push({ kind: "single", entry: e });
        i++;
      }
    }
    return groups;
  }, [navEntries]);

  const defaultNavKey = navEntries[0]?.key ?? "";
  const [activeNavKey, setActiveNavKey] = useState(defaultNavKey);

  useEffect(() => {
    if (navEntries.length && !navEntries.some((e) => e.key === activeNavKey)) {
      setActiveNavKey(navEntries[0].key);
    }
  }, [navEntries, activeNavKey]);

  const activeEntry = useMemo(
    () => navEntries.find((e) => e.key === activeNavKey) ?? navEntries[0],
    [navEntries, activeNavKey]
  );

  const aggregateIdsForEntry = (entry: (typeof navEntries)[0]): string[] => {
    if (entry.itemIds.length > 0) return entry.itemIds;
    const parts = entry.key.split("::");
    if (parts.length < 3 || parts[2] !== "parent") return entry.itemIds;
    const prefix = `${parts[0]}::${parts[1]}::`;
    return navEntries
      .filter((e) => e.key.startsWith(`${prefix}sub::`))
      .flatMap((e) => e.itemIds);
  };

  const sectionItems = useMemo(() => {
    if (!activeEntry) return [];
    const ids = aggregateIdsForEntry(activeEntry);
    const set = new Set(ids);
    return items.filter((i) => set.has(i.id));
  }, [items, activeEntry, navEntries]);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [mainView, setMainView] = useState<"checklist" | "actionPlans">(
    "checklist"
  );

  useEffect(() => {
    if (sectionItems.length === 0) {
      setSelectedItemId(null);
      return;
    }
    if (!selectedItemId || !sectionItems.some((i) => i.id === selectedItemId)) {
      setSelectedItemId(sectionItems[0].id);
    }
  }, [sectionItems, selectedItemId]);

  const selectedItem =
    sectionItems.find((i) => i.id === selectedItemId) ?? sectionItems[0];
  const selectedResp = selectedItem
    ? itemResponses.get(selectedItem.id)
    : undefined;
  const selectedNorm = normalizeCareFileItemStatus(selectedResp?.status);

  const complianceItems = useMemo(
    () => items.filter((i) => i.type !== "notes"),
    [items]
  );

  const progress = useMemo(() => {
    let reviewed = 0;
    let comp = 0;
    let act = 0;
    let nonc = 0;
    const total = complianceItems.length;
    for (const it of complianceItems) {
      const r = itemResponses.get(it.id);
      const n = normalizeCareFileItemStatus(r?.status);
      if (n !== "not-reviewed") reviewed += 1;
      if (n === "compliant") comp += 1;
      if (n === "action-required") act += 1;
      if (n === "non-compliant") nonc += 1;
    }
    const pct = total ? Math.round((reviewed / total) * 100) : 0;
    return { total, reviewed, comp, act, nonc, pct };
  }, [complianceItems, itemResponses]);

  const entryStats = (entry: (typeof navEntries)[0]) => {
    const ids = aggregateIdsForEntry(entry);
    let r = 0;
    let t = 0;
    let hasFlag = false;
    for (const id of ids) {
      const it = items.find((x) => x.id === id);
      if (!it || it.type === "notes") continue;
      t += 1;
      const resp = itemResponses.get(id);
      const n = normalizeCareFileItemStatus(resp?.status);
      if (n !== "not-reviewed") r += 1;
      if (n === "action-required" || n === "non-compliant") hasFlag = true;
    }
    return { r, t, hasFlag };
  };

  const renderSidebarNavRow = (
    entry: (typeof navEntries)[number],
    variant: "root" | "subsection"
  ) => {
    const { r, t, hasFlag } = entryStats(entry);
    const isActive = entry.key === activeNavKey;
    const ratioColor =
      t === 0
        ? "text-muted-foreground"
        : r === t
          ? "text-emerald-600 dark:text-emerald-400"
          : hasFlag
            ? "text-amber-700 dark:text-amber-400"
            : "text-muted-foreground";

    return (
      <button
        type="button"
        onClick={() => {
          setActiveNavKey(entry.key);
          setMainView("checklist");
          const ids = aggregateIdsForEntry(entry);
          const first = ids[0];
          if (first) setSelectedItemId(first);
          else setSelectedItemId(null);
        }}
        className={cn(
          "flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 text-left transition-colors duration-150",
          variant === "root"
            ? "py-1.5 text-[13px] leading-snug"
            : "py-[5px] text-xs leading-snug",
          isActive
            ? "bg-muted font-medium text-foreground"
            : "text-muted-foreground hover:bg-muted/80"
        )}
      >
        <span className="min-w-0 flex-1 truncate">{entry.label}</span>
        {variant === "subsection" && hasFlag ? (
          <span
            className="shrink-0 text-amber-700 dark:text-amber-400"
            aria-hidden
          >
            ●
          </span>
        ) : null}
        <span className={cn("shrink-0 tabular-nums text-[11px]", ratioColor)}>
          {t > 0 ? `${r}/${t}` : "—"}
        </span>
      </button>
    );
  };

  const initials = residentDisplayName(resident)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const reportHref =
    templateId && templateId !== "unknown"
      ? careFileAuditTemplateHistoryPath(residentId, templateId)
      : null;

  const normalizeActionPlanMatchText = (value: string): string =>
    value.trim().replace(/\s+/g, " ").toLowerCase();

  const actionPlanBelongsToItem = (
    plan: CareFileActionPlanRow,
    item: CareFileAuditItem
  ): boolean => {
    if (plan.sourceItemId?.trim()) {
      return plan.sourceItemId.trim() === item.id.trim();
    }

    const planText = normalizeActionPlanMatchText(plan.text);
    const expectedPrefill = normalizeActionPlanMatchText(
      `Follow up: ${item.name}`
    );
    return planText.startsWith(expectedPrefill);
  };

  const matchingPlans =
    selectedItem &&
    (selectedNorm === "action-required" || selectedNorm === "non-compliant")
      ? actionPlans.filter((p) => actionPlanBelongsToItem(p, selectedItem))
      : [];

  const handleMarkAllCompliant = () => {
    for (const it of sectionItems) {
      if (it.type === "notes") continue;
      const cur = normalizeCareFileItemStatus(
        itemResponses.get(it.id)?.status
      );
      if (cur === "not-reviewed") {
        onItemResponseChange(it.id, it.name, "status", "compliant");
      }
    }
  };

  const subtitleParts = [
    templateName || "Care file audit",
    templateFrequency ? `Every ${templateFrequency}` : null,
    "CareO",
  ].filter(Boolean);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-muted/30">
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-4 py-3 sm:px-5">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 lg:hidden"
            onClick={() =>
              router.push(`/dashboard/careo-audit/${residentId}/carefileaudit`)
            }
          >
            <ArrowLeft className="size-4" />
          </Button>
          <Breadcrumb className="min-w-0 flex-1 text-muted-foreground">
            <BreadcrumbList className="flex-wrap sm:gap-1">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/dashboard/careo-audit?tab=careFile">Audits</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    href={`/dashboard/careo-audit/${residentId}/carefileaudit`}
                  >
                    Care file audits
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="max-w-[200px] truncate sm:max-w-none">
                <BreadcrumbPage className="text-foreground font-medium">
                  {residentDisplayName(resident)} · Rm {residentRoom(resident)}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-border px-3 text-xs font-normal sm:text-sm"
              disabled={!responseId || saveDraftPending}
              onClick={() => void onSaveDraft()}
            >
              Save draft
            </Button>
            <Button
              size="sm"
              className="h-8 border border-foreground bg-foreground px-3 text-xs font-normal text-background hover:bg-foreground/90 sm:text-sm"
              disabled={!responseId}
              onClick={() => void onSubmitAudit()}
            >
              Submit audit
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="flex flex-col gap-4 border-b border-border bg-background px-4 py-4 sm:flex-row sm:items-center sm:px-5">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <Avatar className="size-9 shrink-0">
              <AvatarImage src={residentImage(resident)} alt="" />
              <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                {initials || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="text-base font-medium leading-tight text-foreground">
                Care file audit · {residentDisplayName(resident)}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {subtitleParts.join(" · ")}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:flex sm:flex-wrap sm:gap-6">
            <div>
              <div className="text-muted-foreground">Auditor</div>
              <div className="font-medium text-foreground">
                {auditorLabel ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Date</div>
              <div className="font-medium text-foreground">
                {auditedAtLabel ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Home manager verified</div>
              <div className="font-medium text-foreground">Pending</div>
            </div>
            <div>
              <div className="text-muted-foreground">Status</div>
              <div className="mt-0.5">{auditStatusBadge(completionStatus)}</div>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-background px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
          <span>
            {progress.reviewed} of {progress.total} items complete
          </span>
          <div className="h-1 min-w-[120px] flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-600 transition-[width] duration-300 dark:bg-emerald-500"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
          <span className="flex flex-wrap gap-x-2 gap-y-0.5">
            <span className="font-medium text-emerald-700 dark:text-emerald-400">
              {progress.comp} compliant
            </span>
            <span className="text-border">·</span>
            <span className="font-medium text-amber-800 dark:text-amber-200">
              {progress.act} action required
            </span>
            <span className="text-border">·</span>
            <span className="font-medium text-destructive">
              {progress.nonc} non-compliant
            </span>
          </span>
        </div>

        {/* Workspace grid */}
        <div className="grid min-h-[480px] flex-1 grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_320px] lg:min-h-[720px]">
          {/* Sidebar — Attio-style sections + indented subsections */}
          <aside className="border-b border-border bg-background text-[13px] lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:border-b-0 lg:border-r">
            <div className="flex min-h-0 flex-1 flex-col px-2 py-3">
              <p className="shrink-0 px-2 pb-2 text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
                Sections
              </p>
              <div className="mb-3 shrink-0 space-y-2 border-b border-border px-2 pb-3">
                <div className="inline-flex w-full rounded-lg bg-muted p-[3px] text-[10px] leading-tight text-muted-foreground sm:text-[11px]">
                  <button
                    type="button"
                    onClick={() => setMainView("checklist")}
                    className={cn(
                      "min-w-0 flex-1 rounded-md px-1 py-1 transition-colors",
                      mainView === "checklist"
                        ? "bg-background text-foreground shadow-sm"
                        : "hover:text-foreground"
                    )}
                  >
                    Checklist
                  </button>
                  <button
                    type="button"
                    onClick={() => setMainView("actionPlans")}
                    className={cn(
                      "min-w-0 flex-1 rounded-md px-1 py-1 transition-colors",
                      mainView === "actionPlans"
                        ? "bg-background text-foreground shadow-sm"
                        : "hover:text-foreground"
                    )}
                  >
                    Action plans ({actionPlans.length})
                  </button>
                </div>
              </div>
              <ScrollArea className="min-h-0 flex-1 max-lg:h-[min(40vh,280px)]">
                <nav className="space-y-2 pb-1 pr-3">
                  {sidebarGroups.map((group) =>
                    group.kind === "single" ? (
                      <div key={group.entry.key}>
                        {renderSidebarNavRow(group.entry, "root")}
                      </div>
                    ) : (
                      <div key={group.parent.key} className="space-y-1">
                        {renderSidebarNavRow(group.parent, "root")}
                        <div className="mb-0.5 ml-3.5 space-y-0.5 border-l border-border/80 pl-2.5">
                          {group.subs.map((sub) => (
                            <div key={sub.key}>
                              {renderSidebarNavRow(sub, "subsection")}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </nav>
              </ScrollArea>
            </div>
          </aside>

          {/* Main */}
          <main className="border-b border-border bg-muted/30 px-4 py-4 lg:border-b-0 lg:px-[18px] lg:py-[18px]">
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {activeEntry
                    ? activeEntry.depth === 1
                      ? "Section"
                      : "Section"
                    : ""}
                </p>
                <h2 className="text-lg font-medium text-foreground">
                  {activeEntry?.label.replace(/^\d+\s·\s/, "") ??
                    templateName}
                </h2>
              </div>
              <div className="text-xs text-muted-foreground">
                Linked folder ·{" "}
                <span className="font-medium text-primary">
                  {selectedItem?.sectionTitle?.trim() ||
                    templateName ||
                    "Care file"}
                </span>
              </div>
            </div>
            {mainView === "checklist" ? (
              <>
                <p className="mb-[14px] mt-1 max-w-xl text-[13px] text-muted-foreground">
                  Click any row to open details on the right. Click the status pill to
                  cycle Not reviewed → Compliant → Action required → Non-compliant →
                  N/A.
                </p>

                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  {sectionItems.length === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground">
                      {activeEntry &&
                      aggregateIdsForEntry(activeEntry).length === 0
                        ? "Pick a subsection in the sidebar, or add checklist items to this template."
                        : "No items in this section."}
                    </div>
                  ) : (
                    <>
                      <div
                        className="grid grid-cols-[28px_minmax(0,1fr)_130px_130px] items-center gap-2 border-b border-border bg-muted px-[14px] py-2.5 text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground"
                        role="row"
                      >
                        <span />
                        <span>Item</span>
                        <span>Status</span>
                        <span className="text-right">Source</span>
                      </div>
                      <div className="divide-y divide-border">
                        {sectionItems.map((item) => {
                          const resp = itemResponses.get(item.id);
                          const n = normalizeCareFileItemStatus(resp?.status);
                          const isSelected = item.id === selectedItemId;
                          const source =
                            item.sourceLabel ||
                            (item.sourceHref ? "Record" : null);
                          const href = item.sourceHref?.trim();
                          return (
                            <div
                              key={item.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => setSelectedItemId(item.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setSelectedItemId(item.id);
                                }
                              }}
                              className={cn(
                                "grid cursor-pointer grid-cols-[28px_minmax(0,1fr)_130px_130px] items-center gap-2 px-[14px] py-3 transition-colors hover:bg-muted",
                                rowTintClass(n),
                                isSelected && "bg-muted"
                              )}
                            >
                              <StatusGlyph status={n} />
                              <div className="min-w-0">
                                <div className="text-[13px] font-medium text-foreground">
                                  {item.name}
                                </div>
                                {resp?.notes ? (
                                  <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                    {resp.notes}
                                  </div>
                                ) : null}
                              </div>
                              <div className="flex justify-start">
                                <button
                                  type="button"
                                  className={cn(
                                    "keep-interactive cursor-pointer rounded-full px-2 py-0.5 text-[11px] font-normal transition-opacity hover:opacity-90",
                                    pillClass(n)
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onCycleItemStatus(item.id, item.name);
                                    setSelectedItemId(item.id);
                                  }}
                                >
                                  {statusLabel(n)}
                                </button>
                              </div>
                              <div className="truncate text-right text-xs">
                                {href ? (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-end gap-0.5 font-medium text-primary hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span className="truncate">
                                      {source || "Open"} ↗
                                    </span>
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={onOpenAddItem}
                  >
                    <Plus className="mr-1 size-3.5" />
                    Add custom item
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={handleMarkAllCompliant}
                    disabled={sectionItems.length === 0}
                  >
                    Mark all as compliant
                  </Button>
                  {reportHref ? (
                    <Button variant="outline" size="sm" className="text-xs" asChild>
                      <Link href={reportHref as Route}>
                        Report
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      disabled
                      title="Template not loaded yet"
                    >
                      Report
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="mb-[14px] mt-1 max-w-xl text-[13px] text-muted-foreground">
                  Review every action plan currently assigned to this resident.
                </p>

                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  {actionPlans.length === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground">
                      No action plans have been added for this resident.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-xs">Action</TableHead>
                            <TableHead className="text-xs">Assignee</TableHead>
                            <TableHead className="text-xs">Due</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-right text-xs">
                              Remove
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {actionPlans.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell className="max-w-[260px] align-top text-sm">
                                {p.text}
                              </TableCell>
                              <TableCell className="align-top text-sm text-muted-foreground">
                                {p.assignedToName}
                              </TableCell>
                              <TableCell className="align-top text-sm text-muted-foreground">
                                {p.dueDate
                                  ? format(p.dueDate, "dd/MM/yyyy")
                                  : "—"}
                              </TableCell>
                              <TableCell className="align-top text-sm text-muted-foreground">
                                {p.status || "Pending"}
                              </TableCell>
                              <TableCell className="text-right align-top">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-destructive"
                                  onClick={() => onRemoveActionPlan(p.id)}
                                  aria-label="Remove action plan"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </>
            )}
          </main>

          {/* Detail */}
          <aside className="relative z-10 border-t border-border bg-background lg:border-l lg:border-t-0">
            <div className="flex h-full flex-col p-4 sm:p-5">
              {!selectedItem ? (
                <p className="text-xs text-muted-foreground">
                  No item selected.
                </p>
              ) : (
                <>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Selected item
                  </p>
                  <p className="text-sm font-medium leading-snug text-foreground">
                    {selectedItem.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {activeEntry?.label ?? templateName}
                  </p>

                  <div className="relative z-20 isolate mt-4">
                    <div className="mb-1.5 text-[11px] text-muted-foreground">
                      Status
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          "compliant",
                          "action-required",
                          "non-compliant",
                          "not-applicable",
                        ] as const
                      ).map((st) => {
                        const sel = selectedNorm === st;
                        return (
                          <button
                            key={st}
                            type="button"
                            className={cn(
                              "keep-interactive rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors",
                              sel
                                ? cn(pillClass(st), "border-transparent")
                                : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
                            )}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onItemResponseChange(
                                selectedItem.id,
                                selectedItem.name,
                                "status",
                                st
                              );
                            }}
                          >
                            {statusLabel(st)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 text-[11px] text-muted-foreground">
                      Item date
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-full justify-start text-left text-xs font-normal"
                        >
                          <CalendarIcon className="mr-2 size-3.5" />
                          {selectedResp?.date
                            ? format(
                                new Date(selectedResp.date),
                                "dd MMM yyyy"
                              )
                            : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={
                            selectedResp?.date
                              ? new Date(selectedResp.date)
                              : undefined
                          }
                          onSelect={(date) => {
                            if (date) {
                              onItemResponseChange(
                                selectedItem.id,
                                selectedItem.name,
                                "date",
                                date.toISOString()
                              );
                            }
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="mt-4 flex-1 min-h-[120px]">
                    <div className="mb-1.5 text-[11px] text-muted-foreground">
                      Auditor comments
                    </div>
                    <Textarea
                      value={selectedResp?.notes ?? ""}
                      onChange={(e) =>
                        onItemResponseChange(
                          selectedItem.id,
                          selectedItem.name,
                          "notes",
                          e.target.value
                        )
                      }
                      placeholder="Add comment…"
                      className="min-h-[88px] resize-y text-sm"
                    />
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 text-[11px] text-muted-foreground">
                      Action required
                    </div>
                    {selectedNorm === "action-required" ||
                    selectedNorm === "non-compliant" ? (
                      <div className="rounded-lg border border-dashed border-border p-3 text-xs">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-9 w-full gap-1.5 text-xs"
                          onClick={() =>
                            onOpenActionPlan({
                              prefill: selectedItem.name,
                              sourceItemId: selectedItem.id,
                            })
                          }
                        >
                          <Plus className="size-3.5" />
                          Add action plan
                        </Button>
                        {matchingPlans.length > 0 ? (
                          <ul className="mt-3 space-y-2 border-t border-border pt-3">
                            {matchingPlans.map((p) => (
                              <li
                                key={p.id}
                                className="rounded-md border border-border bg-muted/30 px-2.5 py-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium text-foreground">
                                      {p.text}
                                    </div>
                                    <div className="mt-1 text-muted-foreground">
                                      {p.assignedToName}
                                      {p.dueDate
                                        ? ` · due ${format(p.dueDate, "dd MMM yyyy")}`
                                        : null}
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 shrink-0 text-destructive"
                                    onClick={() => onRemoveActionPlan(p.id)}
                                    aria-label="Remove action plan"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                        No action — status is compliant, not reviewed, or N/A
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 text-[11px] text-muted-foreground">
                      Linked records
                    </div>
                    {selectedItem.sourceHref?.trim() ? (
                      <a
                        href={selectedItem.sourceHref.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/50"
                      >
                        <span>{selectedItem.sourceLabel || "Open record"}</span>
                        <ExternalLink className="size-3.5 text-muted-foreground" />
                      </a>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                        No source link on this item
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2 border-t border-border pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs text-destructive hover:text-destructive"
                      onClick={() => onRemoveItem(selectedItem.id)}
                    >
                      <Trash2 className="mr-1 size-3.5" />
                      Remove item
                    </Button>
                  </div>

                  {lastEditedHint ? (
                    <p className="mt-auto pt-6 text-[11px] text-muted-foreground">
                      {lastEditedHint}
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
