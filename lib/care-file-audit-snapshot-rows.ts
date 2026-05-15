import type { CareFileHistoryQuestion } from "@/lib/manager-care-file-audit-history";

/**
 * Minimal row shape coming from live audit `AuditSection.rows` (Question objects).
 */
export interface CareFileAuditSnapshotRowInput {
  id: string;
  text: string;
  type?: string;
  isSection?: boolean | string;
  is_section?: boolean | string;
  sectionNumber?: string;
  sourceFolderKey?: string;
  sourceLabel?: string;
}

export interface CareFileAuditSnapshotSectionInput {
  id: string;
  number: string;
  name: string;
  sourceFolderKey?: string;
  sourceLabel?: string;
  rows: readonly CareFileAuditSnapshotRowInput[];
}

const SECTION_HEADER_SUFFIX = "__audit_section";

function isRowMarkedSection(row: CareFileAuditSnapshotRowInput): boolean {
  if (row.isSection === true) return true;
  if (typeof row.isSection === "string" && row.isSection.toLowerCase() === "true") {
    return true;
  }
  if (row.is_section === true) return true;
  if (typeof row.is_section === "string" && row.is_section.toLowerCase() === "true") {
    return true;
  }
  return false;
}

/**
 * Linear `rowQuestions` snapshot matching the merged checklist shown in the UI
 * (`auditSections`): synthetic section header per section, then its question rows.
 */
export function flattenAuditSectionsToSnapshotRows(
  sections: readonly CareFileAuditSnapshotSectionInput[]
): CareFileHistoryQuestion[] {
  const out: CareFileHistoryQuestion[] = [];
  for (const section of sections) {
    out.push({
      id: `${section.id}${SECTION_HEADER_SUFFIX}`,
      text: section.name,
      isSection: true,
      sectionNumber: section.number,
      sourceFolderKey: section.sourceFolderKey,
      sourceLabel: section.sourceLabel,
    });
    for (const row of section.rows) {
      if (isRowMarkedSection(row)) {
        out.push({
          id: row.id,
          text: row.text,
          type: row.type,
          isSection: true,
          is_section: true,
          sectionNumber: row.sectionNumber,
          sourceFolderKey: row.sourceFolderKey,
          sourceLabel: row.sourceLabel,
        });
        continue;
      }
      out.push({
        id: row.id,
        text: row.text,
        type: row.type,
        isSection: row.isSection,
        is_section: row.is_section,
        sectionNumber: row.sectionNumber,
        sourceFolderKey: row.sourceFolderKey,
        sourceLabel: row.sourceLabel,
      });
    }
  }
  return out;
}

export function countCareFileAuditSnapshotQuestionRows(
  sections: readonly CareFileAuditSnapshotSectionInput[]
): number {
  return flattenAuditSectionsToSnapshotRows(sections).filter((q) => !q.isSection).length;
}
