"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  AlertCircle,
  CalendarIcon,
  Check,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** Question shape mirrored from `manager-audit/[auditId]/page.tsx`. */
export interface ManagerAuditQuestion {
  id: string;
  text: string;
  type: "compliance" | "yesno" | "text" | "date" | "risk";
  isSection?: boolean;
  /** Ordering label for section headers (e.g. "4", "3.2"). */
  sectionNumber?: string;
}

export interface ManagerAuditResident {
  _id: string;
  firstName: string;
  lastName: string;
  roomNumber?: string;
  imageUrl?: string;
  teamId?: string | null;
}

export interface ManagerAuditAnswer {
  residentId: string;
  questionId: string;
  value: string;
}

export interface ManagerAuditComment {
  residentId: string;
  questionId?: string;
  text: string;
}

export interface ManagerAuditActionPlanRow {
  id: string;
  text: string;
  assignedToName?: string;
  assignedTo?: string;
  dueDate?: Date;
  priority?: string;
  status?: string;
  residentId?: string;
  residentName?: string;
}

export interface ManagerAuditWorkspaceProps {
  templateName: string;
  questions: ManagerAuditQuestion[];
  selectedResidents: ManagerAuditResident[];
  answers: ManagerAuditAnswer[];
  comments: ManagerAuditComment[];
  actionPlans: ManagerAuditActionPlanRow[];

  isStaffBased?: boolean;
  subjectless?: boolean;
  subjectlessSubjectId?: string;
  isTeamBased?: boolean;
  teams?: { id: string; name: string }[];
  selectedUnitId?: string | null;
  onUnitChange?: (unitId: string) => void;

  onAnswerChange: (
    residentId: string,
    questionId: string,
    value: string
  ) => void | Promise<void>;
  onToggleMultiSelectOption?: (
    residentId: string,
    questionId: string,
    option: string
  ) => void | Promise<void>;
  onCommentChange: (
    residentId: string,
    questionId: string,
    text: string
  ) => void | Promise<void>;
  onOpenAddQuestion: () => void;
  onOpenAddSection?: () => void;
  onOpenAddResident: () => void;
  onRemoveQuestion: (questionId: string) => void | Promise<void>;
  onRemoveResident: (residentId: string) => void | Promise<void>;
  onOpenActionPlan: (resident?: ManagerAuditResident) => void;
  onRemoveActionPlan: (planId: string) => void | Promise<void>;
  /** Static option lists rendered as selectable pills (e.g. Fall audit). */
  optionPillQuestions?: Record<string, string[]>;
  /** Dynamic option lists keyed by question id. */
  dynamicOptionPillQuestions?: Record<string, () => string[]>;
  /** Question ids where multiple pills can be selected (stored as JSON array). */
  multiSelectOptionPillQuestions?: string[];
  /** Per-parent option pills; answer stored as JSON object keyed by parent selection. */
  dependentOptionPillQuestions?: Record<
    string,
    { parentQuestionId: string; options: string[] }
  >;
}

type NormalizedStatus =
  | "not-reviewed"
  | "compliant"
  | "action-required"
  | "non-compliant"
  | "not-applicable";

const COMPLIANCE_CYCLE: NormalizedStatus[] = [
  "not-reviewed",
  "compliant",
  "action-required",
  "non-compliant",
  "not-applicable",
];

const YESNO_CYCLE: NormalizedStatus[] = [
  "not-reviewed",
  "compliant",
  "non-compliant",
];

type RiskLevel = "" | "low" | "medium" | "high";
const RISK_CYCLE: RiskLevel[] = ["", "low", "medium", "high"];

function riskPillClass(r: RiskLevel): string {
  switch (r) {
    case "low":
      return "bg-emerald-100 text-emerald-900";
    case "medium":
      return "bg-amber-100 text-amber-950";
    case "high":
      return "bg-destructive/15 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function riskLabel(r: RiskLevel): string {
  switch (r) {
    case "low": return "Low";
    case "medium": return "Medium";
    case "high": return "High";
    default: return "Not set";
  }
}

function normalizeAnswerValue(raw: string | undefined): NormalizedStatus {
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

/** Persistence value compatible with the existing Manager Audit Supabase rows. */
function persistAnswerValue(
  type: ManagerAuditQuestion["type"],
  n: NormalizedStatus
): string {
  if (n === "not-reviewed") return "";
  if (type === "yesno") {
    if (n === "compliant") return "yes";
    if (n === "non-compliant") return "no";
    return "";
  }
  return n;
}

function statusLabel(n: NormalizedStatus): string {
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

function optionPillClass(selected: boolean): string {
  return selected
    ? "bg-primary/15 text-primary border-transparent"
    : "border-border bg-muted/50 text-muted-foreground hover:bg-muted";
}

function optionPillSummaryClass(hasValue: boolean): string {
  return hasValue
    ? "bg-primary/15 text-primary"
    : "bg-muted text-muted-foreground";
}

function parseMultiSelectAnswer(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string" && item.trim() !== "");
    }
  } catch {
    /* legacy single value */
  }
  return [value.trim()];
}

function serializeMultiSelectAnswer(selected: string[]): string {
  return selected.length > 0 ? JSON.stringify(selected) : "";
}

function parseDependentCountsAnswer(value: string | undefined): Record<string, string> {
  if (!value?.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const result: Record<string, string> = {};
      for (const [key, val] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof val === "string" && val.trim() !== "") {
          result[key] = val;
        }
      }
      return result;
    }
  } catch {
    /* legacy single count without mapping */
  }
  return {};
}

function serializeDependentCountsAnswer(counts: Record<string, string>): string {
  const entries = Object.entries(counts).filter(([, val]) => val.trim() !== "");
  return entries.length > 0 ? JSON.stringify(Object.fromEntries(entries)) : "";
}

function formatMultiSelectSummary(value: string | undefined): string {
  const selected = parseMultiSelectAnswer(value);
  if (selected.length === 0) return "—";
  if (selected.length === 1) return selected[0];
  return `${selected.length} selected`;
}

function formatDependentCountsSummary(
  value: string | undefined,
  parentValue: string | undefined
): string {
  const parents = parseMultiSelectAnswer(parentValue);
  if (parents.length === 0) return "—";
  const counts = parseDependentCountsAnswer(value);
  const completed = parents.filter((name) => counts[name]?.trim()).length;
  if (completed === 0) return "—";
  if (completed < parents.length) return `${completed}/${parents.length} set`;
  return parents
    .map((name) => `${name}: ${counts[name]}`)
    .join(", ");
}

function pillClass(n: NormalizedStatus): string {
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

function rowTintClass(n: NormalizedStatus): string {
  switch (n) {
    case "action-required":
      return "bg-amber-500/5";
    case "non-compliant":
      return "bg-destructive/5";
    default:
      return "";
  }
}

function StatusGlyph({ status }: { status: NormalizedStatus }) {
  if (status === "not-reviewed") {
    return (
      <span
        className="inline-flex size-4 shrink-0 rounded border border-border"
        aria-hidden
      />
    );
  }
  const iconClass =
    "size-4 shrink-0 rounded flex items-center justify-center text-[10px] font-semibold";
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
    status === "compliant"
      ? Check
      : status === "action-required"
        ? AlertCircle
        : X;
  return (
    <span className={cn(iconClass, bg)} aria-hidden>
      <Icon className="size-2.5" strokeWidth={3} />
    </span>
  );
}

function residentDisplayName(r: ManagerAuditResident): string {
  return `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || "Resident";
}

function residentInitials(r: ManagerAuditResident): string {
  const first = (r.firstName ?? "").trim()[0];
  const last = (r.lastName ?? "").trim()[0];
  return `${first ?? ""}${last ?? ""}`.toUpperCase() || "?";
}

function isComplianceLike(q: ManagerAuditQuestion): boolean {
  return q.type === "compliance" || q.type === "yesno";
}

function isRiskType(q: ManagerAuditQuestion): boolean {
  return q.type === "risk";
}

/**
 * Manager Audit workspace mirroring the Care File Audit 3-column layout
 * (residents nav, question checklist, selected-item detail pane).
 *
 * Sections sidebar = selected residents. Picking a resident reveals their
 * question checklist; clicking a row opens the detail pane on the right
 * with status pills, item date, auditor comments (per resident), and
 * action plan controls — all wired through the existing Supabase-backed
 * handlers in `manager-audit/[auditId]/page.tsx`.
 */
export function ManagerAuditWorkspace(props: ManagerAuditWorkspaceProps) {
  const {
    templateName,
    questions,
    selectedResidents,
    answers,
    comments,
    actionPlans,
    isStaffBased = false,
    subjectless = false,
    subjectlessSubjectId = "audit-level",
    isTeamBased = false,
    teams,
    selectedUnitId,
    onUnitChange,
    onAnswerChange,
    onToggleMultiSelectOption,
    onCommentChange,
    onOpenAddQuestion,
    onOpenAddSection,
    onOpenAddResident,
    onRemoveQuestion,
    onRemoveResident,
    onOpenActionPlan,
    onRemoveActionPlan,
    optionPillQuestions,
    dynamicOptionPillQuestions,
    multiSelectOptionPillQuestions,
    dependentOptionPillQuestions,
  } = props;

  const multiSelectQuestionIds = useMemo(
    () => new Set(multiSelectOptionPillQuestions ?? []),
    [multiSelectOptionPillQuestions]
  );

  const getOptionPillOptions = (questionId: string): string[] | undefined => {
    const dynamic = dynamicOptionPillQuestions?.[questionId]?.();
    if (dynamic && dynamic.length > 0) return dynamic;
    return optionPillQuestions?.[questionId];
  };

  const getDependentOptionPillConfig = (
    questionId: string
  ): { parentQuestionId: string; options: string[] } | undefined =>
    dependentOptionPillQuestions?.[questionId];

  const isDependentOptionPillQuestion = (questionId: string): boolean =>
    getDependentOptionPillConfig(questionId) !== undefined;

  const isOptionPillQuestion = (questionId: string): boolean =>
    getOptionPillOptions(questionId) !== undefined ||
    isDependentOptionPillQuestion(questionId);

  const isMultiSelectOptionPillQuestion = (questionId: string): boolean =>
    multiSelectQuestionIds.has(questionId) || questionId === "falls-q-5";

  const displayedResidents = useMemo(() => {
    if (!teams || teams.length === 0 || !selectedUnitId) return selectedResidents;
    return selectedResidents.filter((r) => {
      if (selectedUnitId === "unassigned") return !r.teamId;
      return r.teamId === selectedUnitId;
    });
  }, [selectedResidents, teams, selectedUnitId]);

  const checklistQuestions = useMemo(
    () => questions.filter((q) => !q.isSection),
    [questions]
  );

  const [activeResidentId, setActiveResidentId] = useState<string | null>(
    displayedResidents[0]?._id ?? null
  );

  useEffect(() => {
    if (displayedResidents.length === 0) {
      setActiveResidentId(null);
      return;
    }
    if (
      !activeResidentId ||
      !displayedResidents.some((r) => r._id === activeResidentId)
    ) {
      setActiveResidentId(displayedResidents[0]._id);
    }
  }, [displayedResidents, activeResidentId]);

  const activeResident = displayedResidents.find(
    (r) => r._id === activeResidentId
  );
  const activeSubjectId = subjectless ? subjectlessSubjectId : activeResident?._id;
  const detailSubjectId = activeSubjectId ?? subjectlessSubjectId;

  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (checklistQuestions.length === 0) {
      setSelectedQuestionId(null);
      return;
    }
    if (
      !selectedQuestionId ||
      !checklistQuestions.some((q) => q.id === selectedQuestionId)
    ) {
      setSelectedQuestionId(checklistQuestions[0].id);
    }
  }, [checklistQuestions, selectedQuestionId]);

  const answerLookup = useMemo(() => {
    const map = new Map<string, ManagerAuditAnswer>();
    for (const a of answers) {
      map.set(`${a.residentId}::${a.questionId}`, a);
    }
    return map;
  }, [answers]);

  const toggleMultiSelectOption = (
    subjectId: string,
    questionId: string,
    option: string
  ) => {
    if (onToggleMultiSelectOption) {
      void onToggleMultiSelectOption(subjectId, questionId, option);
      return;
    }

    const current = parseMultiSelectAnswer(
      answerLookup.get(`${subjectId}::${questionId}`)?.value ?? ""
    );
    const isSelected = current.includes(option);
    const nextSelected = isSelected
      ? current.filter((v) => v !== option)
      : [...current, option];

    void onAnswerChange(
      subjectId,
      questionId,
      serializeMultiSelectAnswer(nextSelected)
    );

    const dependentEntry = Object.entries(dependentOptionPillQuestions ?? {}).find(
      ([, cfg]) => cfg.parentQuestionId === questionId
    );
    if (dependentEntry && isSelected) {
      const [dependentId] = dependentEntry;
      const counts = parseDependentCountsAnswer(
        answerLookup.get(`${subjectId}::${dependentId}`)?.value ?? ""
      );
      delete counts[option];
      void onAnswerChange(
        subjectId,
        dependentId,
        serializeDependentCountsAnswer(counts)
      );
    }
  };

  const getNormalizedStatus = (
    residentId: string,
    questionId: string
  ): NormalizedStatus => {
    const a = answerLookup.get(`${residentId}::${questionId}`);
    return normalizeAnswerValue(a?.value);
  };

  const handleCyclePill = (
    residentId: string,
    question: ManagerAuditQuestion
  ) => {
    const current = getNormalizedStatus(residentId, question.id);
    const cycle =
      question.type === "yesno" ? YESNO_CYCLE : COMPLIANCE_CYCLE;
    const idx = cycle.indexOf(current);
    const next = cycle[(idx + 1) % cycle.length];
    void onAnswerChange(
      residentId,
      question.id,
      persistAnswerValue(question.type, next)
    );
  };

  const handlePickStatus = (
    residentId: string,
    question: ManagerAuditQuestion,
    next: NormalizedStatus
  ) => {
    void onAnswerChange(
      residentId,
      question.id,
      persistAnswerValue(question.type, next)
    );
  };

  const getComment = (residentId: string, questionId: string): string =>
    comments.find((c) => c.residentId === residentId && c.questionId === questionId)?.text ?? "";

  const residentStats = (residentId: string) => {
    let reviewed = 0;
    let total = 0;
    let hasFlag = false;
    for (const q of checklistQuestions) {
      if (!isComplianceLike(q)) continue;
      total += 1;
      const n = getNormalizedStatus(residentId, q.id);
      if (n !== "not-reviewed") reviewed += 1;
      if (n === "action-required" || n === "non-compliant") hasFlag = true;
    }
    return { reviewed, total, hasFlag };
  };

  const selectedQuestion = checklistQuestions.find(
    (q) => q.id === selectedQuestionId
  );

  const selectedAnswer = activeSubjectId && selectedQuestion
    ? answerLookup.get(`${activeSubjectId}::${selectedQuestion.id}`)
    : undefined;

  const selectedNorm = normalizeAnswerValue(selectedAnswer?.value);

  const plansForActiveResident = useMemo(() => {
    if (subjectless) return actionPlans.filter((p) => !p.residentId);
    if (!activeResident) return [];
    return actionPlans.filter(
      (p) => p.residentId && p.residentId === activeResident._id
    );
  }, [actionPlans, activeResident, subjectless]);

  const auditLevelActionPlans = useMemo(() => {
    if (subjectless) return [];
    return actionPlans.filter((p) => !p.residentId);
  }, [actionPlans, subjectless]);

  return (
    <div
      className={cn(
        "grid min-h-[480px] flex-1 grid-cols-1 lg:min-h-[720px]",
        subjectless
          ? "lg:grid-cols-[minmax(0,1fr)_320px]"
          : "lg:grid-cols-[240px_minmax(0,1fr)_320px]"
      )}
    >
      {/* Residents sidebar */}
      {!subjectless ? (
      <aside className="border-b border-border bg-background text-[13px] lg:border-b-0 lg:border-r">
        <div className="px-2 py-3">
          {/* Unit/Home Selector */}
          {teams && teams.length > 0 && (
            <div className="px-2 pb-3 border-b border-slate-100 mb-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Unit/Home</label>
              <select
                value={selectedUnitId || ""}
                onChange={(e) => onUnitChange?.(e.target.value)}
                className="w-full text-xs font-semibold rounded-md border border-slate-200 py-1.5 px-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
                <option value="unassigned">Unassigned Residents</option>
              </select>
            </div>
          )}
          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
              {isTeamBased ? "Teams" : isStaffBased ? "Staff" : "Residents"}
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-foreground"
              onClick={onOpenAddResident}
              aria-label={isTeamBased ? "Add team" : isStaffBased ? "Add staff" : "Add resident"}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
          <ScrollArea className="h-[min(40vh,280px)] lg:h-[calc(720px-1.5rem)]">
            <nav className="space-y-1 pb-1 pr-3">
              {displayedResidents.length === 0 ? (
                <p className="px-2 py-2 text-xs text-muted-foreground">
                  {selectedUnitId ? "No residents in this unit." : `No ${isTeamBased ? "teams" : isStaffBased ? "staff" : "residents"} added yet.`}
                </p>
              ) : (
                displayedResidents.map((r) => {
                  const stats = residentStats(r._id);
                  const isActive = r._id === activeResidentId;
                  const ratioColor =
                    stats.total === 0
                      ? "text-muted-foreground"
                      : stats.reviewed === stats.total
                        ? "text-emerald-600 dark:text-emerald-400"
                        : stats.hasFlag
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-muted-foreground";
                  return (
                    <button
                      key={r._id}
                      type="button"
                      onClick={() => setActiveResidentId(r._id)}
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
                          {residentInitials(r)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1 truncate">
                        {residentDisplayName(r)}
                        {r.roomNumber || (teams && r.teamId) ? (
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
                      {stats.hasFlag ? (
                        <span
                          className="shrink-0 text-amber-700 dark:text-amber-400"
                          aria-hidden
                        >
                          ●
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          "shrink-0 tabular-nums text-[11px]",
                          ratioColor
                        )}
                      >
                        {stats.total > 0
                          ? `${stats.reviewed}/${stats.total}`
                          : "—"}
                      </span>
                    </button>
                  );
                })
              )}
            </nav>
          </ScrollArea>
        </div>
      </aside>
      ) : null}

      {/* Main checklist */}
      <main className="border-b border-border bg-muted/30 px-4 py-4 lg:border-b-0 lg:px-[18px] lg:py-[18px]">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {subjectless ? "Audit questions" : isTeamBased ? "Team" : isStaffBased ? "Staff" : "Resident"}
            </p>
            <h2 className="truncate text-lg font-medium text-foreground">
              {subjectless
                ? templateName
                : activeResident
                ? residentDisplayName(activeResident)
                : "No selection"}
            </h2>
          </div>
          <div className="text-xs text-muted-foreground">
            Audit ·{" "}
            <span className="font-medium text-primary">{templateName}</span>
          </div>
        </div>
        <p className="mb-[14px] mt-1 max-w-xl text-[13px] text-muted-foreground">
          {subjectless
            ? optionPillQuestions
              ? "Click any question to open details on the right. Select an option pill to record the response."
              : "Click any question to open details on the right. Click the status pill to cycle Not reviewed -> Compliant -> Action required -> Non-compliant -> N/A."
            : "Click any row to open details on the right. Click the status pill to cycle Not reviewed -> Compliant -> Action required -> Non-compliant -> N/A."}
        </p>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {!subjectless && !activeResident ? (
            <div className="p-6 text-sm text-muted-foreground">
              Add a {isTeamBased ? "team" : isStaffBased ? "staff member" : "resident"} on the left
              to begin the audit.
            </div>
          ) : checklistQuestions.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No questions yet. Use &ldquo;Add question&rdquo; below to start the
              checklist.
            </div>
          ) : (
            <>
              <div
                className="grid grid-cols-[28px_minmax(0,1fr)_140px_60px] items-center gap-2 border-b border-border bg-muted px-[14px] py-2.5 text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground"
                role="row"
              >
                <span />
                <span>Question</span>
                <span>Status</span>
                <span className="text-right">Remove</span>
              </div>
              <div className="divide-y divide-border">
                {questions.map((q) => {
                  if (q.isSection) {
                    return (
                      <div
                        key={q.id}
                        className="flex items-center justify-between gap-2 bg-muted/60 px-[14px] py-2.5"
                      >
                        <div className="text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                          {q.sectionNumber ? (
                            <span className="text-foreground">{q.sectionNumber} · </span>
                          ) : null}
                          {q.text}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => void onRemoveQuestion(q.id)}
                          aria-label="Remove section"
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    );
                  }

                  if (!activeSubjectId) return null;

                  const dependentConfig = getDependentOptionPillConfig(q.id);
                  const isOptionPill = isOptionPillQuestion(q.id);
                  const isMultiSelect = isMultiSelectOptionPillQuestion(q.id);
                  const isDependent = dependentConfig !== undefined;
                  const optionValue =
                    answerLookup.get(`${activeSubjectId}::${q.id}`)?.value ?? "";
                  const parentValue = dependentConfig
                    ? answerLookup.get(
                        `${activeSubjectId}::${dependentConfig.parentQuestionId}`
                      )?.value ?? ""
                    : "";
                  const optionSummary = isMultiSelect
                    ? formatMultiSelectSummary(optionValue)
                    : isDependent
                      ? formatDependentCountsSummary(optionValue, parentValue)
                      : optionValue.trim() || "—";
                  const hasOptionValue = isMultiSelect
                    ? parseMultiSelectAnswer(optionValue).length > 0
                    : isDependent
                      ? parseMultiSelectAnswer(parentValue).some((name) =>
                          Boolean(parseDependentCountsAnswer(optionValue)[name]?.trim())
                        )
                      : optionValue.trim() !== "";
                  const n = getNormalizedStatus(activeSubjectId, q.id);
                  const isSelected = q.id === selectedQuestionId;
                  return (
                    <div
                      key={q.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedQuestionId(q.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedQuestionId(q.id);
                        }
                      }}
                      className={cn(
                        "grid cursor-pointer grid-cols-[28px_minmax(0,1fr)_140px_60px] items-center gap-2 px-[14px] py-3 transition-colors hover:bg-muted",
                        !isOptionPill && rowTintClass(n),
                        isSelected && "bg-muted"
                      )}
                    >
                      <StatusGlyph
                        status={
                          isOptionPill
                            ? hasOptionValue
                              ? "compliant"
                              : "not-reviewed"
                            : n
                        }
                      />
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-foreground">
                          {q.text}
                        </div>
                        <div className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                          {isOptionPill
                            ? isMultiSelect
                              ? "Multi choice"
                              : isDependent
                                ? "Per resident"
                                : "Choice"
                            : q.type === "yesno"
                            ? "Yes / No"
                            : q.type === "risk"
                              ? "Risk Level"
                              : (q.type === "text" && q.id !== "acc-q-2")
                                ? "Text"
                                : (q.type === "date" || q.id === "acc-q-2")
                                  ? "Date"
                                  : "Compliance"}
                        </div>
                      </div>
                      <div className="flex justify-start">
                        {isOptionPill ? (
                          <span
                            className={cn(
                              "keep-interactive max-w-[135px] truncate rounded-full px-2 py-0.5 text-[11px] font-normal",
                              optionPillSummaryClass(hasOptionValue)
                            )}
                          >
                            {optionSummary}
                          </span>
                        ) : isRiskType(q) ? (
                          <button
                            type="button"
                            className={cn(
                              "keep-interactive cursor-pointer rounded-full px-2 py-0.5 text-[11px] font-normal transition-opacity hover:opacity-90",
                              riskPillClass((answerLookup.get(`${activeSubjectId}::${q.id}`)?.value ?? "") as RiskLevel)
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              const currentVal = (answerLookup.get(`${activeSubjectId}::${q.id}`)?.value ?? "") as RiskLevel;
                              const idx = RISK_CYCLE.indexOf(currentVal);
                              const next = RISK_CYCLE[(idx + 1) % RISK_CYCLE.length];
                              void onAnswerChange(activeSubjectId, q.id, next);
                              setSelectedQuestionId(q.id);
                            }}
                          >
                            {riskLabel((answerLookup.get(`${activeSubjectId}::${q.id}`)?.value ?? "") as RiskLevel)}
                          </button>
                        ) : isComplianceLike(q) ? (
                          <button
                            type="button"
                            className={cn(
                              "keep-interactive cursor-pointer rounded-full px-2 py-0.5 text-[11px] font-normal transition-opacity hover:opacity-90",
                              pillClass(n)
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCyclePill(activeSubjectId, q);
                              setSelectedQuestionId(q.id);
                            }}
                          >
                            {q.type === "yesno" && n === "compliant"
                              ? "Yes"
                              : q.type === "yesno" && n === "non-compliant"
                                ? "No"
                                : statusLabel(n)}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground truncate max-w-[135px]">
                            {(() => {
                              const val = answerLookup.get(`${activeSubjectId}::${q.id}`)?.value;
                              if (!val) return "—";
                              if (q.type === "date" || q.id === "acc-q-2") {
                                try {
                                  return format(new Date(val), q.id === "acc-q-2" ? "dd MMM yyyy HH:mm" : "dd MMM yyyy");
                                } catch {
                                  return val;
                                }
                              }
                              return val;
                            })()}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            void onRemoveQuestion(q.id);
                          }}
                          aria-label="Remove question"
                        >
                          <X className="size-3.5" />
                        </Button>
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
            onClick={onOpenAddQuestion}
          >
            <Plus className="mr-1 size-3.5" />
            Add question
          </Button>
          {subjectless && onOpenAddSection ? (
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={onOpenAddSection}
            >
              <Plus className="mr-1 size-3.5" />
              Add section
            </Button>
          ) : null}
          {!subjectless && activeResident ? (
            <Button
              variant="outline"
              size="sm"
              className="text-xs text-destructive hover:text-destructive"
              onClick={() => void onRemoveResident(activeResident._id)}
            >
              <Trash2 className="mr-1 size-3.5" />
              Remove {isTeamBased ? "team" : isStaffBased ? "staff" : "resident"}
            </Button>
          ) : null}
        </div>

        {auditLevelActionPlans.length > 0 ? (
          <div className="mt-6 rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-medium text-foreground">
                Audit action plans ({auditLevelActionPlans.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">Action</TableHead>
                    <TableHead className="text-xs">Assignee</TableHead>
                    <TableHead className="text-xs">Due</TableHead>
                    <TableHead className="text-right text-xs">
                      Remove
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLevelActionPlans.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="max-w-[260px] truncate text-sm">
                        {p.text}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.assignedToName ?? p.assignedTo ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.dueDate ? format(p.dueDate, "dd/MM/yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive"
                          onClick={() => void onRemoveActionPlan(p.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}
      </main>

      {/* Detail pane */}
      <aside className="relative z-10 border-t border-border bg-background lg:border-l lg:border-t-0">
        <div className="flex h-full flex-col p-4 sm:p-5">
          {(!subjectless && !activeResident) || !selectedQuestion ? (
            <p className="text-xs text-muted-foreground">
              {!subjectless && !activeResident
                ? `Select a ${isTeamBased ? "team" : isStaffBased ? "staff member" : "resident"} on the left to see their checklist.`
                : "Select a question to see details."}
            </p>
          ) : (
            <>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Selected question
              </p>
              <p className="text-sm font-medium leading-snug text-foreground">
                {selectedQuestion.text}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {subjectless
                  ? templateName
                  : activeResident
                    ? `${residentDisplayName(activeResident)}${activeResident.roomNumber ? ` · Rm ${activeResident.roomNumber}` : ""}`
                    : ""}
              </p>

              {(() => {
                const dependentConfig = getDependentOptionPillConfig(
                  selectedQuestion.id
                );
                if (dependentConfig) {
                  const parentValue =
                    answerLookup.get(
                      `${detailSubjectId}::${dependentConfig.parentQuestionId}`
                    )?.value ?? "";
                  const selectedFallers = parseMultiSelectAnswer(parentValue);
                  const counts = parseDependentCountsAnswer(
                    selectedAnswer?.value ?? ""
                  );

                  if (selectedFallers.length === 0) {
                    return (
                      <div className="relative z-20 isolate mt-4">
                        <p className="text-xs text-muted-foreground">
                          Select one or more frequent fallers first, then record
                          the number of falls for each.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="relative z-20 isolate mt-4 space-y-4">
                      {selectedFallers.map((name) => (
                        <div key={name}>
                          <div className="mb-1.5 text-[11px] font-medium text-foreground">
                            {name}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {dependentConfig.options.map((option) => {
                              const sel = counts[name] === option;
                              return (
                                <button
                                  key={`${name}-${option}`}
                                  type="button"
                                  className={cn(
                                    "keep-interactive rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors",
                                    optionPillClass(sel)
                                  )}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const next = { ...counts, [name]: option };
                                    void onAnswerChange(
                                      detailSubjectId,
                                      selectedQuestion.id,
                                      serializeDependentCountsAnswer(next)
                                    );
                                  }}
                                >
                                  {option}
                                </button>
                              );
                            })}
                            <button
                              type="button"
                              className={cn(
                                "keep-interactive rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors",
                                !counts[name]?.trim()
                                  ? "bg-muted text-muted-foreground border-transparent"
                                  : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
                              )}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const next = { ...counts };
                                delete next[name];
                                void onAnswerChange(
                                  detailSubjectId,
                                  selectedQuestion.id,
                                  serializeDependentCountsAnswer(next)
                                );
                              }}
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }

                const selectedOptionPills = getOptionPillOptions(
                  selectedQuestion.id
                );
                if (selectedOptionPills) {
                  const isMultiSelect = isMultiSelectOptionPillQuestion(
                    selectedQuestion.id
                  );
                  const currentVal = selectedAnswer?.value ?? "";
                  const selectedValues = isMultiSelect
                    ? parseMultiSelectAnswer(currentVal)
                    : currentVal.trim()
                      ? [currentVal.trim()]
                      : [];

                  return (
                    <div className="relative z-20 isolate mt-4">
                      <div className="mb-1.5 text-[11px] text-muted-foreground">
                        {isMultiSelect ? "Select all that apply" : "Response"}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedOptionPills.map((option) => {
                          const sel = selectedValues.includes(option);
                          return (
                            <button
                              key={option}
                              type="button"
                              className={cn(
                                "keep-interactive rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors",
                                optionPillClass(sel)
                              )}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (isMultiSelect) {
                                  toggleMultiSelectOption(
                                    detailSubjectId,
                                    selectedQuestion.id,
                                    option
                                  );
                                } else {
                                  void onAnswerChange(
                                    detailSubjectId,
                                    selectedQuestion.id,
                                    option
                                  );
                                }
                              }}
                            >
                              {option}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          className={cn(
                            "keep-interactive rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors",
                            selectedValues.length === 0
                              ? "bg-muted text-muted-foreground border-transparent"
                              : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
                          )}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void onAnswerChange(
                              detailSubjectId,
                              selectedQuestion.id,
                              ""
                            );
                            const dependentEntry = Object.entries(
                              dependentOptionPillQuestions ?? {}
                            ).find(
                              ([, cfg]) =>
                                cfg.parentQuestionId === selectedQuestion.id
                            );
                            if (dependentEntry) {
                              const [dependentId] = dependentEntry;
                              void onAnswerChange(detailSubjectId, dependentId, "");
                            }
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {isRiskType(selectedQuestion) ? (
                <div className="relative z-20 isolate mt-4">
                  <div className="mb-1.5 text-[11px] text-muted-foreground">Risk Level</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(["low", "medium", "high"] as RiskLevel[]).map((r) => {
                      const currentVal = (selectedAnswer?.value ?? "") as RiskLevel;
                      const sel = currentVal === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          className={cn(
                            "keep-interactive rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors",
                            sel
                              ? cn(riskPillClass(r), "border-transparent")
                              : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
                          )}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void onAnswerChange(detailSubjectId, selectedQuestion.id, r);
                          }}
                        >
                          {riskLabel(r)}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className={cn(
                        "keep-interactive rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors",
                        !(["low","medium","high"] as string[]).includes(selectedAnswer?.value ?? "")
                          ? "bg-muted text-muted-foreground border-transparent"
                          : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void onAnswerChange(detailSubjectId, selectedQuestion.id, "");
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : isComplianceLike(selectedQuestion) &&
                !isOptionPillQuestion(selectedQuestion.id) ? (
                <div className="relative z-20 isolate mt-4">
                  <div className="mb-1.5 text-[11px] text-muted-foreground">
                    Status
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedQuestion.type === "yesno"
                      ? (["compliant", "non-compliant"] as const)
                      : ([
                          "compliant",
                          "action-required",
                          "non-compliant",
                          "not-applicable",
                        ] as const)
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
                            handlePickStatus(
                              detailSubjectId,
                              selectedQuestion,
                              st
                            );
                          }}
                        >
                          {selectedQuestion.type === "yesno" && st === "compliant"
                            ? "Yes"
                            : selectedQuestion.type === "yesno" &&
                                st === "non-compliant"
                              ? "No"
                              : statusLabel(st)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {selectedQuestion.type === "date" ? (
                <div className="mt-4">
                  <div className="mb-1.5 text-[11px] text-muted-foreground">
                    Date answer
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-full justify-start text-left text-xs font-normal"
                      >
                        <CalendarIcon className="mr-2 size-3.5" />
                        {selectedAnswer?.value
                          ? format(
                              new Date(selectedAnswer.value),
                              "dd MMM yyyy"
                            )
                          : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={
                          selectedAnswer?.value
                            ? new Date(selectedAnswer.value)
                            : undefined
                        }
                        onSelect={(date) => {
                          if (date) {
                            void onAnswerChange(
                              detailSubjectId,
                              selectedQuestion.id,
                              date.toISOString()
                            );
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              ) : null}

              {selectedQuestion.type === "text" &&
              !isOptionPillQuestion(selectedQuestion.id) ? (
                <div className="mt-4">
                  <div className="mb-1.5 text-[11px] text-muted-foreground">
                    Text answer
                  </div>
                  {selectedQuestion.id === "acc-q-2" ? (
                    <Input
                      type="datetime-local"
                      value={selectedAnswer?.value ?? ""}
                      onChange={(e) =>
                        void onAnswerChange(
                          detailSubjectId,
                          selectedQuestion.id,
                          e.target.value
                        )
                      }
                      className="h-9 text-sm block"
                    />
                  ) : selectedQuestion.id === "acc-q-3" ? (
                    <>
                      <Input
                        list="detail-location-list"
                        value={selectedAnswer?.value ?? ""}
                        onChange={(e) =>
                          void onAnswerChange(
                            detailSubjectId,
                            selectedQuestion.id,
                            e.target.value
                          )
                        }
                        placeholder="e.g. Bedroom, Lounge..."
                        className="h-9 text-sm"
                      />
                      <datalist id="detail-location-list">
                        <option value="Bedroom" />
                        <option value="Lounge" />
                        <option value="Dining Room" />
                        <option value="Bathroom" />
                        <option value="Hallway" />
                        <option value="Garden" />
                        <option value="Kitchen" />
                      </datalist>
                    </>
                  ) : selectedQuestion.id === "equipment_required" ? (
                    <>
                      <Input
                        list="detail-equip-list"
                        value={selectedAnswer?.value ?? ""}
                        onChange={(e) =>
                          void onAnswerChange(
                            detailSubjectId,
                            selectedQuestion.id,
                            e.target.value
                          )
                        }
                        placeholder="e.g. Rollator, Hoist..."
                        className="h-9 text-sm"
                      />
                      <datalist id="detail-equip-list">
                        <option value="None" />
                        <option value="WZF/Rollator" />
                        <option value="Hoist" />
                        <option value="Sling" />
                        <option value="OT Chair" />
                        <option value="Wheelchair" />
                        <option value="Slide Sheets" />
                        <option value="Slide Board" />
                      </datalist>
                    </>
                  ) : selectedQuestion.id === "hoist_type" ? (
                    <>
                      <Input
                        list="detail-hoist-list"
                        value={selectedAnswer?.value ?? ""}
                        onChange={(e) =>
                          void onAnswerChange(
                            detailSubjectId,
                            selectedQuestion.id,
                            e.target.value
                          )
                        }
                        placeholder="e.g. Active (Standing)..."
                        className="h-9 text-sm"
                      />
                      <datalist id="detail-hoist-list">
                        <option value="N/A" />
                        <option value="Active (Standing)" />
                        <option value="Passive (Full)" />
                        <option value="Standing / Full Hoist" />
                      </datalist>
                    </>
                  ) : selectedQuestion.id === "emergency_transfer" ? (
                    <>
                      <Input
                        list="detail-em-list"
                        value={selectedAnswer?.value ?? ""}
                        onChange={(e) =>
                          void onAnswerChange(
                            detailSubjectId,
                            selectedQuestion.id,
                            e.target.value
                          )
                        }
                        placeholder="e.g. Wheelchair, OT Chair..."
                        className="h-9 text-sm"
                      />
                      <datalist id="detail-em-list">
                        <option value="N/A" />
                        <option value="Wheelchair" />
                        <option value="OT Chair" />
                        <option value="Evac Chair" />
                        <option value="Slide Sheets" />
                      </datalist>
                    </>
                  ) : selectedQuestion.id === "assistance_level" ? (
                    <>
                      <Input
                        list="detail-assist-list"
                        value={selectedAnswer?.value ?? ""}
                        onChange={(e) =>
                          void onAnswerChange(
                            detailSubjectId,
                            selectedQuestion.id,
                            e.target.value
                          )
                        }
                        placeholder="e.g. Assist x 2..."
                        className="h-9 text-sm"
                      />
                      <datalist id="detail-assist-list">
                        <option value="Independent" />
                        <option value="Assist x 1" />
                        <option value="Assist x 2" />
                        <option value="Assist x 3" />
                        <option value="Assist x 4" />
                        <option value="OT Chair" />
                        <option value="Wheelchair" />
                      </datalist>
                    </>
                  ) : (
                    <Input
                      value={selectedAnswer?.value ?? ""}
                      onChange={(e) =>
                        void onAnswerChange(
                          detailSubjectId,
                          selectedQuestion.id,
                          e.target.value
                        )
                      }
                      placeholder="Enter response..."
                      className="h-9 text-sm"
                    />
                  )}
                </div>
              ) : null}

              <div className="mt-4 flex-1">
                <div className="mb-1.5 text-[11px] text-muted-foreground">
                  {subjectless ? "Audit comment" : `${isTeamBased ? "Team" : isStaffBased ? "Staff" : "Resident"} comment`}
                </div>
                <Textarea
                  value={getComment(detailSubjectId, selectedQuestion.id)}
                  onChange={(e) =>
                    void onCommentChange(detailSubjectId, selectedQuestion.id, e.target.value)
                  }
                  placeholder="Add comment…"
                  className="min-h-[88px] resize-y text-sm"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {subjectless
                    ? "Saved once for this question."
                    : `Saved once per ${isTeamBased ? "team" : isStaffBased ? "staff member" : "resident"} for this question.`}
                </p>

                <div className="mt-4">
                  <div className="mb-1.5 text-[11px] text-muted-foreground">
                    Action required
                  </div>
                  <div className="rounded-lg border border-dashed border-border p-3 text-xs">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-9 w-full gap-1.5 text-xs"
                      onClick={() => onOpenActionPlan(subjectless ? undefined : activeResident)}
                    >
                      <Plus className="size-3.5" />
                      Add action plan
                    </Button>
                    {plansForActiveResident.length > 0 ? (
                      <ul className="mt-3 space-y-2 border-t border-border pt-3">
                        {plansForActiveResident.map((p) => (
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
                                  {p.assignedToName ?? p.assignedTo ?? "—"}
                                  {p.dueDate
                                    ? ` · due ${format(
                                        p.dueDate,
                                        "dd MMM yyyy"
                                      )}`
                                    : null}
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0 text-destructive"
                                onClick={() => void onRemoveActionPlan(p.id)}
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
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <Badge variant="outline" className="text-[10px] uppercase">
                  {selectedQuestion.type}
                </Badge>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
