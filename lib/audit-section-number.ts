/**
 * Compare dotted audit section labels (e.g. "3", "3.1", "3.10", "10").
 * Each segment is treated as a non-negative integer.
 */
export function compareAuditSectionNumbers(a: string, b: string): number {
  const sa = a.trim();
  const sb = b.trim();
  const pa = sa === "" ? [] : sa.split(".").map((x) => Number.parseInt(x, 10));
  const pb = sb === "" ? [] : sb.split(".").map((x) => Number.parseInt(x, 10));
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = Number.isFinite(pa[i]) ? pa[i]! : 0;
    const db = Number.isFinite(pb[i]) ? pb[i]! : 0;
    if (da !== db) return da < db ? -1 : 1;
  }
  return 0;
}

/** Immediate parent number: "5.1.2" → "5.1"; "5.1" → "5"; "5" → null */
export function getParentSectionNumber(sectionNumber: string): string | null {
  const s = sectionNumber.trim();
  const i = s.lastIndexOf(".");
  if (i <= 0) return null;
  return s.slice(0, i);
}

/** True if `num` is the root or a strict descendant of `rootNum` (e.g. 5.1 under 5). */
export function isSectionNumberUnderPrefix(num: string, rootNum: string): boolean {
  const n = num.trim();
  const r = rootNum.trim();
  if (!r || !n) return false;
  return n === r || n.startsWith(`${r}.`);
}

export interface SectionOrdered {
  id: string;
  number: string;
  parentId?: string;
}

/**
 * Depth-first flatten: roots sorted by number, then each subtree sorted by number.
 * Appends any section whose `parentId` is missing from the graph at the end.
 */
export function reorderAuditSectionHierarchy<T extends SectionOrdered>(
  sections: T[]
): T[] {
  const byId = new Map(sections.map((s) => [s.id, s] as const));
  const childList = new Map<string, T[]>();
  for (const s of sections) {
    if (!s.parentId) continue;
    if (!byId.has(s.parentId)) continue;
    if (!childList.has(s.parentId)) childList.set(s.parentId, []);
    childList.get(s.parentId)!.push(s);
  }
  for (const [, arr] of childList) {
    arr.sort((a, b) => {
      const c = compareAuditSectionNumbers(a.number, b.number);
      if (c !== 0) return c;
      return a.id.localeCompare(b.id);
    });
  }
  const roots = sections.filter((s) => !s.parentId);
  roots.sort((a, b) => {
    const c = compareAuditSectionNumbers(a.number, b.number);
    if (c !== 0) return c;
    return a.id.localeCompare(b.id);
  });
  const out: T[] = [];
  const seen = new Set<string>();
  const visit = (n: T) => {
    out.push(n);
    seen.add(n.id);
    const ch = childList.get(n.id) ?? [];
    for (const c of ch) visit(c);
  };
  for (const r of roots) visit(r);
  for (const s of sections) {
    if (!seen.has(s.id)) out.push(s);
  }
  return out;
}

/** @deprecated Prefer {@link reorderAuditSectionHierarchy} for nested sections. */
export function reorderAuditSections<T extends SectionOrdered>(sections: T[]): T[] {
  return reorderAuditSectionHierarchy(sections);
}

export interface SectionMarkerRow {
  isSection?: boolean;
  sectionNumber?: string;
}

export function getSectionBlockEndExclusive(
  rows: SectionMarkerRow[],
  sectionHeaderIndex: number
): number {
  let end = sectionHeaderIndex + 1;
  while (end < rows.length && !rows[end].isSection) end++;
  return end;
}

/**
 * End index exclusive of the subtree rooted at a section header (nested subsection
 * headers and their rows stay inside the subtree).
 */
export function getFlatSubtreeEndExclusive(
  rows: SectionMarkerRow[],
  rootHeaderIdx: number
): number {
  const rootNum = (rows[rootHeaderIdx].sectionNumber ?? "").trim();
  if (!rootNum) {
    return getSectionBlockEndExclusive(rows, rootHeaderIdx);
  }
  let i = rootHeaderIdx + 1;
  while (i < rows.length) {
    const r = rows[i];
    if (!r.isSection) {
      i++;
      continue;
    }
    const sn = (r.sectionNumber ?? "").trim();
    if (isSectionNumberUnderPrefix(sn, rootNum) && sn !== rootNum) {
      i = getFlatSubtreeEndExclusive(rows, i);
    } else {
      break;
    }
  }
  return i;
}

function findInsertIndexTopLevelSection(
  rows: SectionMarkerRow[],
  newNumber: string
): number {
  let i = 0;
  while (i < rows.length) {
    const row = rows[i];
    if (!row.isSection) {
      i++;
      continue;
    }
    const sn = (row.sectionNumber ?? "").trim() || "999";
    if (getParentSectionNumber(sn) !== null) {
      i = getFlatSubtreeEndExclusive(rows, i);
      continue;
    }
    if (compareAuditSectionNumbers(newNumber, sn) < 0) return i;
    i = getFlatSubtreeEndExclusive(rows, i);
  }
  return rows.length;
}

function findInsertIndexUnderParentSection(
  rows: SectionMarkerRow[],
  newNumber: string,
  parentNum: string
): number {
  const pidx = rows.findIndex(
    (r) => r.isSection && (r.sectionNumber ?? "").trim() === parentNum
  );
  if (pidx === -1) return -1;
  let i = pidx + 1;
  while (i < rows.length && !rows[i].isSection) i++;
  while (i < rows.length && rows[i].isSection) {
    const sn = (rows[i].sectionNumber ?? "").trim();
    if (getParentSectionNumber(sn) !== parentNum) break;
    if (compareAuditSectionNumbers(newNumber, sn) < 0) return i;
    i = getFlatSubtreeEndExclusive(rows, i);
  }
  return i;
}

export type FindInsertSectionOptions = {
  /** If the parent section is not a row here but exists on the template (built-in), order by full number among top-level row headers. */
  fallbackTopLevelWhenParentRowMissing?: boolean;
};

/**
 * Insert index for a new section row: top-level ordered among roots; subsection
 * ordered under its parent's subtree. Returns -1 only if the parent subsection
 * branch cannot be resolved and fallback is disabled.
 */
export function findInsertIndexForNewSection(
  rows: SectionMarkerRow[],
  newNumberRaw: string,
  options?: FindInsertSectionOptions
): number {
  const newNumber = newNumberRaw.trim() || "999";
  const parentNum = getParentSectionNumber(newNumber);
  if (!parentNum) {
    return findInsertIndexTopLevelSection(rows, newNumber);
  }
  const under = findInsertIndexUnderParentSection(rows, newNumber, parentNum);
  if (under >= 0) return under;
  if (options?.fallbackTopLevelWhenParentRowMissing) {
    return findInsertIndexTopLevelSection(rows, newNumber);
  }
  return -1;
}
