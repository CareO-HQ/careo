/**
 * Pure helpers for care file audit completion snapshots stored in
 * `manager_audit_history.data` (same shape as live audit state).
 */

import { getParentSectionNumber } from "@/lib/audit-section-number";

export type CareFileAuditHistoryRowStatus =
  | "not-reviewed"
  | "compliant"
  | "action-required"
  | "non-compliant"
  | "not-applicable";

export interface CareFileHistoryQuestion {
  id: string;
  text: string;
  type?: string;
  isSection?: boolean | string;
  /** Some JSON snapshots use snake_case (e.g. PostgREST). */
  is_section?: boolean | string;
  sectionNumber?: string;
  sourceFolderKey?: string;
  sourceLabel?: string;
}

export interface CareFileHistoryColumnQuestion {
  id: string;
  text: string;
  type?: string;
}

export interface CareFileHistoryAnswer {
  residentId: string;
  questionId: string;
  value: string;
}

export interface CareFileHistoryFixedRow {
  comment?: string;
  actionRequired?: string;
  actionCompleted?: string;
  rowStatus?: string;
}

export interface CareFileAuditHistoryPayload {
  rowQuestions: CareFileHistoryQuestion[];
  columnQuestions: CareFileHistoryColumnQuestion[];
  answers: CareFileHistoryAnswer[];
  fixedColumnData: Record<string, CareFileHistoryFixedRow>;
}

export interface CareFileActionPlanSnapshot {
  id: string;
  description: string;
  status?: string | null;
  latest_comment?: string | null;
  assigned_to_name?: string | null;
  assigned_to_email?: string | null;
  priority?: string | null;
  due_date?: string | null;
}

function getGridAnswer(
  answers: CareFileHistoryAnswer[],
  rowQuestionId: string,
  columnQuestionId: string
): CareFileHistoryAnswer | undefined {
  return answers.find(
    (a) => a.residentId === rowQuestionId && a.questionId === columnQuestionId
  );
}

function statusColumnFromColumns(
  columnQuestions: CareFileHistoryColumnQuestion[]
): CareFileHistoryColumnQuestion | undefined {
  return columnQuestions.find((q) => q.type !== "text");
}

function normalizeStatus(value?: string): CareFileAuditHistoryRowStatus {
  if (value === "compliant" || value === "yes") return "compliant";
  if (value === "action-required") return "action-required";
  if (value === "non-compliant" || value === "no") return "non-compliant";
  if (value === "not-applicable") return "not-applicable";
  return "not-reviewed";
}

/**
 * Mirrors live `getRowStatus` in resident care file audit page.
 */
export function getCompletedAuditRowStatus(
  rowId: string,
  payload: CareFileAuditHistoryPayload
): CareFileAuditHistoryRowStatus {
  const { columnQuestions, answers, fixedColumnData } = payload;
  const statusColumn = statusColumnFromColumns(columnQuestions);

  if (!statusColumn) {
    const rowData = fixedColumnData[rowId];
    const stored = rowData?.rowStatus;
    if (
      stored === "compliant" ||
      stored === "action-required" ||
      stored === "non-compliant" ||
      stored === "not-applicable" ||
      stored === "not-reviewed"
    ) {
      return stored;
    }
    if (rowData?.actionRequired?.trim()) return "action-required";
    if (rowData?.comment?.trim() || rowData?.actionCompleted?.trim()) {
      return "compliant";
    }
    return "not-reviewed";
  }

  const answer = getGridAnswer(answers, rowId, statusColumn.id);
  return normalizeStatus(answer?.value);
}

export function careFileHistoryQuestionSource(
  row: CareFileHistoryQuestion
): string {
  const label = row.sourceLabel?.trim();
  if (label) return label;
  const key = row.sourceFolderKey?.trim();
  if (key) return key;
  return "—";
}

export interface CareFileHistoryQuestionRow {
  id: string;
  text: string;
  status: CareFileAuditHistoryRowStatus;
  comment: string;
  actionRequired: string;
  actionCompleted: string;
  source: string;
}

export interface CareFileHistorySectionRow {
  id: string;
  text: string;
  status: CareFileAuditHistoryRowStatus;
  comment: string;
  actionRequired: string;
  actionCompleted: string;
}

export interface CareFileHistorySectionBlock {
  sectionId: string;
  sectionTitle: string;
  rows: CareFileHistorySectionRow[];
}

export interface CareFileAuditHistorySubsection {
  subsectionId: string;
  /** null = implicit bucket (rows directly under a root section before any child section header) */
  subsectionTitle: string | null;
  sectionNumber: string;
  /** All questions in template/snapshot order (includes not-reviewed). */
  rowsInOrder: CareFileHistoryQuestionRow[];
  reviewedRows: CareFileHistoryQuestionRow[];
  notReviewedRows: CareFileHistoryQuestionRow[];
  reviewedCount: number;
  totalCount: number;
}

export interface CareFileAuditHistorySectionGroup {
  sectionId: string;
  sectionTitle: string;
  /** Root section number from the template (trimmed), used to attach subsections */
  sectionNumber: string;
  subsections: CareFileAuditHistorySubsection[];
  reviewedCount: number;
  totalCount: number;
}

/** Wizard step: one subsection of the checklist, or the action-plan finale. */
export interface CareFileAuditHistoryNavSubsectionStep {
  type: "subsection";
  sectionIdx: number;
  subIdx: number;
  label: string;
  sectionLabel: string;
  sub: CareFileAuditHistorySubsection;
}

export interface CareFileAuditHistoryNavActionPlanStep {
  type: "actionPlan";
}

export type CareFileAuditHistoryNavStep =
  | CareFileAuditHistoryNavSubsectionStep
  | CareFileAuditHistoryNavActionPlanStep;

export interface BuildCareFileAuditHistoryNavStepsOptions {
  includeActionPlan?: boolean;
  /** When true (default), omit substeps with zero questions (empty implicit buckets). */
  skipEmptySubsections?: boolean;
}

/**
 * Flatten section groups into sequential nav steps (optionally ending with action plans).
 * Skips empty implicit subsections by default so the UI never opens on a blank step.
 */
export function buildCareFileAuditHistoryNavSteps(
  groups: CareFileAuditHistorySectionGroup[],
  options?: BuildCareFileAuditHistoryNavStepsOptions
): CareFileAuditHistoryNavStep[] {
  const includeActionPlan = options?.includeActionPlan ?? true;
  const skipEmpty = options?.skipEmptySubsections ?? true;
  const steps: CareFileAuditHistoryNavStep[] = [];
  groups.forEach((group, sectionIdx) => {
    group.subsections.forEach((sub, subIdx) => {
      if (skipEmpty && sub.totalCount === 0) return;
      steps.push({
        type: "subsection",
        sectionIdx,
        subIdx,
        label: sub.subsectionTitle ?? group.sectionTitle,
        sectionLabel: group.sectionTitle,
        sub,
      });
    });
  });
  if (includeActionPlan) {
    steps.push({ type: "actionPlan" });
  }
  return steps;
}

/** Step index for a group subsection in {@link buildCareFileAuditHistoryNavSteps}, or -1 if filtered out. */
export function findCareFileAuditHistoryNavStepIndex(
  steps: CareFileAuditHistoryNavStep[],
  sectionIdx: number,
  subIdx: number
): number {
  return steps.findIndex(
    (s) =>
      s.type === "subsection" &&
      s.sectionIdx === sectionIdx &&
      s.subIdx === subIdx
  );
}

/** True if any question row exposes a non-placeholder source label. */
export function careFileAuditHistoryGroupsHaveSource(
  groups: CareFileAuditHistorySectionGroup[]
): boolean {
  for (const g of groups) {
    for (const s of g.subsections) {
      if (s.rowsInOrder.some((r) => r.source && r.source !== "—")) {
        return true;
      }
    }
  }
  return false;
}

function sectionHeading(row: CareFileHistoryQuestion): string {
  const num = row.sectionNumber?.trim();
  if (num) return `${num} · ${row.text}`;
  return row.text;
}

/** True when this row is a section / subsection header in the checklist template. */
export function isCareFileHistorySectionHeader(row: CareFileHistoryQuestion): boolean {
  if (row.isSection === true) return true;
  if (typeof row.isSection === "string" && row.isSection.toLowerCase() === "true") {
    return true;
  }
  if (row.is_section === true) return true;
  const raw = row.is_section;
  if (typeof raw === "string" && raw.toLowerCase() === "true") return true;
  return false;
}

function hierarchyDepthFromSectionNumber(sectionNumber: string | undefined): number {
  const s = sectionNumber?.trim() ?? "";
  if (!s) return 0;
  const parts = s.split(".").filter((p) => p.length > 0);
  return Math.max(0, parts.length - 1);
}

export interface CareFileAuditHistorySectionHeaderLine {
  id: string;
  heading: string;
  /** 0 = root (e.g. "3"), 1 = "3.1", 2 = "3.1.2", for outline indentation */
  hierarchyDepth: number;
}

/** Every section / subsection header in `rowQuestions` document order. */
export function listCareFileAuditHistorySectionHeaders(
  payload: CareFileAuditHistoryPayload
): CareFileAuditHistorySectionHeaderLine[] {
  const out: CareFileAuditHistorySectionHeaderLine[] = [];
  for (const row of payload.rowQuestions) {
    if (!isCareFileHistorySectionHeader(row)) continue;
    out.push({
      id: row.id,
      heading: sectionHeading(row),
      hierarchyDepth: hierarchyDepthFromSectionNumber(row.sectionNumber),
    });
  }
  return out;
}

function toQuestionRow(
  row: CareFileHistoryQuestion,
  payload: CareFileAuditHistoryPayload
): CareFileHistoryQuestionRow {
  const status = getCompletedAuditRowStatus(row.id, payload);
  const fx = payload.fixedColumnData[row.id] ?? {};
  return {
    id: row.id,
    text: row.text,
    status,
    comment: fx.comment?.trim() ?? "",
    actionRequired: fx.actionRequired?.trim() ?? "",
    actionCompleted: fx.actionCompleted?.trim() ?? "",
    source: careFileHistoryQuestionSource(row),
  };
}

function splitReviewedForSubsection(
  payload: CareFileAuditHistoryPayload,
  questions: CareFileHistoryQuestion[]
): Pick<
  CareFileAuditHistorySubsection,
  | "rowsInOrder"
  | "reviewedRows"
  | "notReviewedRows"
  | "reviewedCount"
  | "totalCount"
> {
  const rowsInOrder: CareFileHistoryQuestionRow[] = questions.map((q) =>
    toQuestionRow(q, payload)
  );
  const reviewedRows: CareFileHistoryQuestionRow[] = [];
  const notReviewedRows: CareFileHistoryQuestionRow[] = [];
  for (const r of rowsInOrder) {
    if (r.status === "not-reviewed") {
      notReviewedRows.push(r);
    } else {
      reviewedRows.push(r);
    }
  }
  return {
    rowsInOrder,
    reviewedRows,
    notReviewedRows,
    reviewedCount: reviewedRows.length,
    totalCount: questions.length,
  };
}

function toLegacySectionRows(
  reviewed: CareFileHistoryQuestionRow[]
): CareFileHistorySectionRow[] {
  return reviewed.map((r) => ({
    id: r.id,
    text: r.text,
    status: r.status,
    comment: r.comment,
    actionRequired: r.actionRequired,
    actionCompleted: r.actionCompleted,
  }));
}

interface LinearStrip {
  header: CareFileHistoryQuestion;
  questions: CareFileHistoryQuestion[];
}

function splitIntoLinearStrips(
  rowQuestions: CareFileHistoryQuestion[]
): {
  leading: CareFileHistoryQuestion[];
  strips: LinearStrip[];
} {
  const leading: CareFileHistoryQuestion[] = [];
  const strips: LinearStrip[] = [];
  let current: LinearStrip | null = null;

  for (const row of rowQuestions) {
    if (isCareFileHistorySectionHeader(row)) {
      if (current) {
        strips.push(current);
      }
      current = { header: row, questions: [] };
    } else if (current) {
      current.questions.push(row);
    } else {
      leading.push(row);
    }
  }
  if (current) {
    strips.push(current);
  }
  return { leading, strips };
}

function findGroupByRootNumber(
  groups: CareFileAuditHistorySectionGroup[],
  parentNumber: string
): CareFileAuditHistorySectionGroup | undefined {
  const p = parentNumber.trim();
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g.sectionNumber === p) {
      return g;
    }
  }
  return undefined;
}

function sumCounts(groups: CareFileAuditHistorySectionGroup[]): void {
  for (const g of groups) {
    g.reviewedCount = g.subsections.reduce((s, sub) => s + sub.reviewedCount, 0);
    g.totalCount = g.subsections.reduce((s, sub) => s + sub.totalCount, 0);
  }
}

/**
 * Nested section groups: root sections contain subsections (implicit root bucket
 * plus explicit child section headers like 3.1 under 3).
 */
export function buildCareFileAuditHistoryViewModel(
  payload: CareFileAuditHistoryPayload,
  fallbackTitle: string = "General Assessments"
): CareFileAuditHistorySectionGroup[] {
  const { leading, strips } = splitIntoLinearStrips(payload.rowQuestions);
  const groups: CareFileAuditHistorySectionGroup[] = [];

  if (leading.length > 0) {
    const split = splitReviewedForSubsection(payload, leading);
    groups.push({
      sectionId: "default",
      sectionTitle: fallbackTitle,
      sectionNumber: "",
      subsections: [
        {
          subsectionId: "default-implicit",
          subsectionTitle: null,
          sectionNumber: "",
          ...split,
        },
      ],
      reviewedCount: split.reviewedCount,
      totalCount: split.totalCount,
    });
  }

  for (const strip of strips) {
    const h = strip.header;
    const num = h.sectionNumber?.trim() || "999";
    const parentNum = getParentSectionNumber(num);
    const split = splitReviewedForSubsection(payload, strip.questions);

    if (!parentNum) {
      groups.push({
        sectionId: h.id,
        sectionTitle: sectionHeading(h),
        sectionNumber: num,
        subsections: [
          {
            subsectionId: `${h.id}-implicit`,
            subsectionTitle: null,
            sectionNumber: num,
            ...split,
          },
        ],
        reviewedCount: split.reviewedCount,
        totalCount: split.totalCount,
      });
      continue;
    }

    const parentGroup = findGroupByRootNumber(groups, parentNum);
    if (!parentGroup) {
      groups.push({
        sectionId: h.id,
        sectionTitle: sectionHeading(h),
        sectionNumber: num,
        subsections: [
          {
            subsectionId: `${h.id}-implicit`,
            subsectionTitle: null,
            sectionNumber: num,
            ...split,
          },
        ],
        reviewedCount: split.reviewedCount,
        totalCount: split.totalCount,
      });
      continue;
    }

    parentGroup.subsections.push({
      subsectionId: h.id,
      subsectionTitle: sectionHeading(h),
      sectionNumber: num,
      ...split,
    });
  }

  sumCounts(groups);
  return groups;
}

/**
 * Linear walk of `rowQuestions`: each `isSection` starts a new block; non-section
 * rows with status !== not-reviewed are attached to the current block.
 * Implemented via linear strips so ordering matches the saved template.
 */
export function buildCareFileAuditHistorySectionBlocks(
  payload: CareFileAuditHistoryPayload
): CareFileHistorySectionBlock[] {
  const { leading, strips } = splitIntoLinearStrips(payload.rowQuestions);
  const blocks: CareFileHistorySectionBlock[] = [];

  if (leading.length > 0) {
    const split = splitReviewedForSubsection(payload, leading);
    blocks.push({
      sectionId: "default",
      sectionTitle: "Checklist",
      rows: toLegacySectionRows(split.reviewedRows),
    });
  }

  for (const strip of strips) {
    const split = splitReviewedForSubsection(payload, strip.questions);
    blocks.push({
      sectionId: strip.header.id,
      sectionTitle: sectionHeading(strip.header),
      rows: toLegacySectionRows(split.reviewedRows),
    });
  }

  return blocks;
}

/**
 * Minimal shape of a template item (from `audit_care_file_templates.items`).
 */
export interface CareFileTemplateItem {
  id: string;
  name: string;
  type?: string;
  sectionId?: string;
  sectionTitle?: string;
  subsectionId?: string;
  subsectionTitle?: string;
  sourceLabel?: string;
  sourceHref?: string;
}

/**
 * Minimal shape of a completion item (from `audit_care_file_completions.items`).
 */
export interface CareFileCompletionItem {
  itemId: string;
  itemName?: string;
  status?: string;
  notes?: string;
  date?: string;
}

/**
 * Build a `CareFileAuditHistoryPayload` from template items + completion items.
 *
 * The template items provide the section/subsection hierarchy and source metadata.
 * The completion items provide the status, notes and date for each item.
 *
 * This bridge function enables `buildCareFileAuditHistoryViewModel()` to be used
 * with standard care-file audit completions (which store a flat items array).
 */
export function buildPayloadFromTemplateAndCompletion(
  templateItems: CareFileTemplateItem[],
  completionItems: CareFileCompletionItem[]
): CareFileAuditHistoryPayload {
  const completionMap = new Map<string, CareFileCompletionItem>();
  for (const ci of completionItems) {
    completionMap.set(ci.itemId, ci);
  }

  // Group template items by sectionId to build section headers + question rows
  const sectionOrder: string[] = [];
  const sectionMeta: Map<string, { sectionTitle: string; firstIdx: number }> =
    new Map();
  const sectionItems: Map<string, CareFileTemplateItem[]> = new Map();

  templateItems.forEach((item, idx) => {
    const secId = item.sectionId?.trim() || "default";
    const secTitle = item.sectionTitle?.trim() || "General Assessments";
    if (!sectionMeta.has(secId)) {
      sectionMeta.set(secId, { sectionTitle: secTitle, firstIdx: idx });
      sectionOrder.push(secId);
      sectionItems.set(secId, []);
    }
    sectionItems.get(secId)!.push(item);
  });

  // Sort sections by appearance order
  sectionOrder.sort((a, b) => {
    const am = sectionMeta.get(a)!;
    const bm = sectionMeta.get(b)!;
    return am.firstIdx - bm.firstIdx;
  });

  // Build rowQuestions: section headers + question rows
  const rowQuestions: CareFileHistoryQuestion[] = [];

  for (const secId of sectionOrder) {
    const meta = sectionMeta.get(secId)!;
    const items = sectionItems.get(secId) || [];

    // Check if this section has subsections
    const subsectionIds = new Set<string>();
    for (const item of items) {
      const subId = item.subsectionId?.trim();
      if (subId) subsectionIds.add(subId);
    }

    // Emit section header
    const sectionHeaderId = `${secId}__section_header`;
    rowQuestions.push({
      id: sectionHeaderId,
      text: meta.sectionTitle,
      isSection: true,
      sectionNumber: secId === "default" ? "" : secId,
      sourceFolderKey: undefined,
      sourceLabel: undefined,
    });

    if (subsectionIds.size > 0) {
      // Group items by subsection
      const subGroups: Map<string, CareFileTemplateItem[]> = new Map();
      const noSubItems: CareFileTemplateItem[] = [];
      const subOrder: string[] = [];
      const subTitles: Map<string, string> = new Map();

      for (const item of items) {
        const subId = item.subsectionId?.trim();
        if (subId) {
          if (!subGroups.has(subId)) {
            subGroups.set(subId, []);
            subOrder.push(subId);
            subTitles.set(subId, item.subsectionTitle?.trim() || subId);
          }
          subGroups.get(subId)!.push(item);
        } else {
          noSubItems.push(item);
        }
      }

      // Items without subsection come first
      for (const item of noSubItems) {
        rowQuestions.push({
          id: item.id,
          text: item.name,
          type: item.type,
          sourceFolderKey: undefined,
          sourceLabel: item.sourceLabel,
        });
      }

      // Each subsection gets a header + its items
      for (const subId of subOrder) {
        const subTitle = subTitles.get(subId) || subId;
        const subHeaderId = `${secId}__${subId}__sub_header`;
        rowQuestions.push({
          id: subHeaderId,
          text: subTitle,
          isSection: true,
          sectionNumber: `${secId === "default" ? "0" : secId}.${subId}`,
          sourceFolderKey: undefined,
          sourceLabel: undefined,
        });

        for (const item of subGroups.get(subId)!) {
          rowQuestions.push({
            id: item.id,
            text: item.name,
            type: item.type,
            sourceFolderKey: undefined,
            sourceLabel: item.sourceLabel,
          });
        }
      }
    } else {
      // Flat items under this section
      for (const item of items) {
        rowQuestions.push({
          id: item.id,
          text: item.name,
          type: item.type,
          sourceFolderKey: undefined,
          sourceLabel: item.sourceLabel,
        });
      }
    }
  }

  // Build fixedColumnData from completion items
  const fixedColumnData: Record<string, CareFileHistoryFixedRow> = {};
  for (const ci of completionItems) {
    const normalized = normalizeStatus(ci.status);
    fixedColumnData[ci.itemId] = {
      comment: ci.notes?.trim() ?? "",
      actionRequired: "",
      actionCompleted: "",
      rowStatus: normalized === "not-reviewed" ? "not-reviewed" : normalized,
    };
  }

  return {
    rowQuestions,
    columnQuestions: [],
    answers: [],
    fixedColumnData,
  };
}
