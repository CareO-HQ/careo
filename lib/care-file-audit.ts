export type NormalizedCareFileItemStatus =
  | "not-reviewed"
  | "compliant"
  | "action-required"
  | "non-compliant"
  | "not-applicable";

export const CARE_FILE_STATUS_CYCLE: NormalizedCareFileItemStatus[] = [
  "not-reviewed",
  "compliant",
  "action-required",
  "non-compliant",
  "not-applicable",
];

/** Raw status from DB / JSON (legacy + new). */
export type CareFileItemStatusRaw =
  | ""
  | "not-reviewed"
  | "compliant"
  | "action-required"
  | "non-compliant"
  | "not-applicable"
  | "checked"
  | "unchecked";

/** Map Unicode dashes and underscores so DB/UI copies still match Select + pills. */
function normalizeUnicodeHyphensAndUnderscores(raw: string): string {
  return raw
    .trim()
    .replace(/\u2011|\u2010|\u2013|\u2014|\u2212/g, "-")
    .replace(/_/g, "-")
    .toLowerCase();
}

function normalizeStatusToken(raw: string): string {
  const t = normalizeUnicodeHyphensAndUnderscores(raw);
  if (t === "n/a" || t === "not applicable" || t === "not-applicable") {
    return "not-applicable";
  }
  if (t === "non compliant" || t === "non-compliant") {
    return "non-compliant";
  }
  return t;
}

export function normalizeCareFileItemStatus(
  raw: string | undefined | null
): NormalizedCareFileItemStatus {
  if (raw == null || String(raw).trim() === "") {
    return "not-reviewed";
  }
  const key = normalizeStatusToken(String(raw));
  if (key === "unchecked" || key === "not-reviewed") {
    return "not-reviewed";
  }
  if (key === "checked") return "compliant";
  if (key === "compliant") return "compliant";
  if (key === "action-required") return "action-required";
  if (key === "non-compliant") return "non-compliant";
  if (key === "not-applicable") return "not-applicable";
  return "not-reviewed";
}

/** Value stored on completion items (empty string = not reviewed for backward compatibility). */
export function persistCareFileItemStatus(n: NormalizedCareFileItemStatus): string {
  if (n === "not-reviewed") return "";
  return n;
}

/** One row from `audit_care_file_completions.items` JSON (camelCase or snake_case keys). */
export function coerceCareFileCompletionItem(raw: unknown): {
  itemId: string;
  itemName: string;
  status: string;
  notes?: string;
  date?: string;
} | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const itemId = String(o.itemId ?? o.item_id ?? "").trim();
  if (!itemId) return null;
  const itemName = String(o.itemName ?? o.item_name ?? "").trim();
  const st = o.status;
  const status =
    typeof st === "string"
      ? persistCareFileItemStatus(normalizeCareFileItemStatus(st))
      : "";
  const notes = typeof o.notes === "string" ? o.notes : undefined;
  const date = typeof o.date === "string" ? o.date : undefined;
  return { itemId, itemName, status, notes, date };
}

export function nextCareFileItemStatus(
  current: NormalizedCareFileItemStatus
): NormalizedCareFileItemStatus {
  const i = CARE_FILE_STATUS_CYCLE.indexOf(current);
  return CARE_FILE_STATUS_CYCLE[(i + 1) % CARE_FILE_STATUS_CYCLE.length];
}

export function isCareFileItemReviewed(raw: string | undefined | null): boolean {
  return normalizeCareFileItemStatus(raw) !== "not-reviewed";
}

export interface CareFileTemplateItemShape {
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

export interface CareFileNavEntry {
  key: string;
  depth: 0 | 1;
  label: string;
  sortIndex: number;
  itemIds: string[];
}

function sectionMeta(item: CareFileTemplateItemShape) {
  const sectionId = item.sectionId?.trim() || "default";
  const sectionTitle = item.sectionTitle?.trim() || "Checklist";
  return { sectionId, sectionTitle };
}

/**
 * Sidebar entries: parent sections and optional indented subsections (from subsectionId).
 */
export function buildCareFileAuditNavEntries(
  items: CareFileTemplateItemShape[]
): CareFileNavEntry[] {
  if (items.length === 0) return [];

  type Bucket = {
    sectionId: string;
    sectionTitle: string;
    firstIndex: number;
    subsectionMap: Map<
      string,
      { title: string; itemIds: string[]; firstIndex: number }
    >;
    rootItemIds: string[];
  };

  const buckets = new Map<string, Bucket>();

  items.forEach((item, index) => {
    const { sectionId, sectionTitle } = sectionMeta(item);
    const bucketKey = `${sectionId}\0${sectionTitle}`;
    let bucket = buckets.get(bucketKey);
    if (!bucket) {
      bucket = {
        sectionId,
        sectionTitle,
        firstIndex: index,
        subsectionMap: new Map(),
        rootItemIds: [],
      };
      buckets.set(bucketKey, bucket);
    } else {
      bucket.firstIndex = Math.min(bucket.firstIndex, index);
    }

    const subId = item.subsectionId?.trim();
    if (subId) {
      const subTitle =
        item.subsectionTitle?.trim() || subId;
      let sub = bucket.subsectionMap.get(subId);
      if (!sub) {
        sub = { title: subTitle, itemIds: [], firstIndex: index };
        bucket.subsectionMap.set(subId, sub);
      } else {
        sub.firstIndex = Math.min(sub.firstIndex, index);
      }
      sub.itemIds.push(item.id);
    } else {
      bucket.rootItemIds.push(item.id);
    }
  });

  const sortedBuckets = [...buckets.values()].sort(
    (a, b) => a.firstIndex - b.firstIndex
  );

  const entries: CareFileNavEntry[] = [];
  let sectionOrdinal = 0;

  for (const bucket of sortedBuckets) {
    sectionOrdinal += 1;
    const hasSubsections = bucket.subsectionMap.size > 0;

    if (!hasSubsections) {
      const allIds = [...bucket.rootItemIds];
      entries.push({
        key: `sec::${bucket.sectionId}::root`,
        depth: 0,
        label: `${sectionOrdinal} · ${bucket.sectionTitle}`,
        sortIndex: bucket.firstIndex,
        itemIds: allIds,
      });
      continue;
    }

    const parentKey = `sec::${bucket.sectionId}::parent`;
    entries.push({
      key: parentKey,
      depth: 0,
      label: `${sectionOrdinal} · ${bucket.sectionTitle}`,
      sortIndex: bucket.firstIndex,
      itemIds: [...bucket.rootItemIds],
    });

    const subs = [...bucket.subsectionMap.entries()].sort(
      (a, b) => a[1].firstIndex - b[1].firstIndex
    );
    for (const [subId, sub] of subs) {
      entries.push({
        key: `sec::${bucket.sectionId}::sub::${subId}`,
        depth: 1,
        label: `${subId} ${sub.title}`,
        sortIndex: sub.firstIndex,
        itemIds: sub.itemIds,
      });
    }
  }

  return entries;
}
