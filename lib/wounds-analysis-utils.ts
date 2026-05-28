import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { supabase } from "@/lib/supabase";
import { getAuditMonthKey } from "@/lib/falls-register-utils";
import { formatYesNoDisplay } from "@/lib/incident-audit-utils";

export const WOUNDS_ANALYSIS_AUDIT_ID = "28";

export const WOUNDS_ANALYSIS_ROW_PREFIX = "wound-audit-";

export const WOUNDS_ANALYSIS_OPTIONS: Record<string, string[]> = {
  "wound-curr-acquired": ["Home", "Hospital acquired"],
};

export interface WoundsAnalysisQuestion {
  id: string;
  text: string;
  type: "compliance" | "yesno" | "text" | "date" | "risk" | string;
  isSection?: boolean;
  sectionNumber?: string;
}

export const DEFAULT_WOUNDS_QUESTIONS: WoundsAnalysisQuestion[] = [
  {
    id: "wound-sec-1",
    text: "Review Last Month Audit - healed wounds / discharged / deceased",
    type: "text",
    isSection: true,
    sectionNumber: "1",
  },
  {
    id: "wound-last-type",
    text: "Type of wound, grade, and location (Last Month)",
    type: "text",
  },
  {
    id: "wound-last-healed",
    text: "Date wound healed",
    type: "date",
  },
  {
    id: "wound-last-comments",
    text: "Comments / Discharged / Deceased details",
    type: "text",
  },
  {
    id: "wound-sec-2",
    text: "Current Active Wounds",
    type: "text",
    isSection: true,
    sectionNumber: "2",
  },
  {
    id: "wound-curr-type",
    text: "Type of wound, grade, and location",
    type: "text",
  },
  {
    id: "wound-curr-acquired",
    text: "Is wound home or hospital acquired?",
    type: "text",
  },
  {
    id: "wound-curr-initial-date",
    text: "Date of initial wound assessment (when wound was identified)",
    type: "date",
  },
  {
    id: "wound-curr-photo-date",
    text: "Date of wound photo",
    type: "date",
  },
  {
    id: "wound-curr-bodymap-date",
    text: "Date of body map",
    type: "date",
  },
  {
    id: "wound-curr-referral",
    text: "Has a referral to TVN / podiatry been made? If yes, note the Date",
    type: "text",
  },
  {
    id: "wound-curr-careplan",
    text: "Is Care plan in place? Does it reflect guidance from TVN/Podiatry?",
    type: "yesno",
  },
  {
    id: "wound-curr-clean",
    text: "Does care plan state how to clean & creams to apply?",
    type: "yesno",
  },
  {
    id: "wound-curr-regime",
    text: "Does Care Plan state dressing regime?",
    type: "yesno",
  },
  {
    id: "wound-curr-updated",
    text: "Is care plan updated at each dressing change?",
    type: "yesno",
  },
  {
    id: "wound-curr-antiseptics",
    text: "Are antiseptics / creams required, prescribed and available?",
    type: "yesno",
  },
  {
    id: "wound-curr-assessment",
    text: "Is ongoing wound assessment updated at each dressing change?",
    type: "yesno",
  },
  {
    id: "wound-curr-equipment",
    text: "Pressure relieving equipment in place and Zero pressure Maintained to affected area?",
    type: "yesno",
  },
  {
    id: "wound-curr-charts",
    text: "Are position change charts Completed in full?",
    type: "yesno",
  },
  {
    id: "wound-curr-status",
    text: "Comment on current status of the wound?",
    type: "text",
  },
];

export const WOUNDS_ANALYSIS_QUESTION_IDS = DEFAULT_WOUNDS_QUESTIONS.filter(
  (q) => !q.isSection
).map((q) => q.id);

export type WoundsAnalysisQuestionId =
  (typeof WOUNDS_ANALYSIS_QUESTION_IDS)[number];

export interface WoundsAnalysisAnswer {
  residentId: string;
  questionId: string;
  value: string;
}

export interface WoundsAnalysisRow {
  rowId: string;
  woundFolderId: string;
  woundId?: string;
  residentId: string;
  residentName: string;
  roomNumber?: string;
  teamId?: string | null;
  woundType: string;
  location: string;
  woundNumber?: number;
  woundIndex: number;
  woundCountForResident: number;
  folderStatus: string;
  isHealedReview?: boolean;
}

export interface WoundsAnalysisTableSnapshot {
  auditMonth: string;
  rows: WoundsAnalysisRow[];
  columnQuestions: WoundsAnalysisQuestion[];
  answers: WoundsAnalysisAnswer[];
  totalWounds?: number;
}

export interface WoundAuditRecord {
  folderId: string;
  folderStatus: string;
  folderName: string;
  woundNumber?: number | null;
  bodyMapUpdatedAt?: string | null;
  residentId: string;
  residentFirstName: string;
  residentLastName: string;
  roomNumber?: string;
  teamId?: string | null;
  woundId?: string;
  woundType: string;
  location: string;
  stage?: string | null;
  dateIdentified?: string | null;
  latestPhotoDate?: string | null;
  initialAssessmentDate?: string | null;
  hasActiveCarePlan?: boolean;
  isHealedReview?: boolean;
  healedDate?: string | null;
}

export function isWoundsAnalysisAudit(auditId: string): boolean {
  return auditId === WOUNDS_ANALYSIS_AUDIT_ID;
}

export function getWoundsAnalysisRowId(woundFolderId: string): string {
  return `${WOUNDS_ANALYSIS_ROW_PREFIX}${woundFolderId}`;
}

export function isWoundsAnalysisRowId(rowId: string): boolean {
  return rowId.startsWith(WOUNDS_ANALYSIS_ROW_PREFIX);
}

export function filterWoundsColumnQuestions(
  questions: WoundsAnalysisQuestion[]
): WoundsAnalysisQuestion[] {
  return questions.filter((q) => !q.isSection);
}

export function formatWoundsAnalysisDate(value: string | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  try {
    return format(parseISO(trimmed), "dd MMM yyyy");
  } catch {
    return trimmed;
  }
}

function yesNoFromTruthy(value: boolean): string {
  return value ? "yes" : "no";
}

function isDateWithinAuditMonth(
  date: string,
  monthStart: string,
  monthEnd: string
): boolean {
  const normalized = date.slice(0, 10);
  return normalized >= monthStart && normalized <= monthEnd;
}

function isFolderCreatedInAuditMonth(
  folder: { created_at?: string | null },
  monthStart: string,
  monthEnd: string
): boolean {
  const createdAt = folder.created_at?.slice(0, 10) ?? "";
  return isDateWithinAuditMonth(createdAt, monthStart, monthEnd);
}

function buildWoundTypeLabel(record: WoundAuditRecord): string {
  const parts = [
    record.woundType?.trim(),
    record.stage?.trim(),
    record.location?.trim(),
  ].filter(Boolean);
  return parts.join(" — ");
}

export function buildPrefillValuesForWoundRow(
  record: WoundAuditRecord
): Partial<Record<WoundsAnalysisQuestionId, string>> {
  const typeLabel = buildWoundTypeLabel(record);

  if (record.isHealedReview) {
    return {
      "wound-last-type": typeLabel,
      "wound-last-healed": record.healedDate ?? "",
      "wound-last-comments": "",
    };
  }

  const values: Partial<Record<WoundsAnalysisQuestionId, string>> = {
    "wound-curr-type": typeLabel,
    "wound-curr-initial-date":
      record.initialAssessmentDate ?? record.dateIdentified ?? "",
    "wound-curr-photo-date": record.latestPhotoDate ?? "",
    "wound-curr-bodymap-date": record.bodyMapUpdatedAt ?? "",
    "wound-curr-careplan": yesNoFromTruthy(Boolean(record.hasActiveCarePlan)),
  };

  return values;
}

export function buildWoundsAnalysisRows(
  records: WoundAuditRecord[]
): WoundsAnalysisRow[] {
  const grouped = new Map<string, WoundAuditRecord[]>();

  for (const record of records) {
    const list = grouped.get(record.residentId) ?? [];
    list.push(record);
    grouped.set(record.residentId, list);
  }

  for (const group of grouped.values()) {
    group.sort((left, right) => {
      const leftNum = left.woundNumber ?? 0;
      const rightNum = right.woundNumber ?? 0;
      if (leftNum !== rightNum) return leftNum - rightNum;
      return left.folderName.localeCompare(right.folderName);
    });
  }

  const indexByRowId = new Map<string, number>();
  for (const group of grouped.values()) {
    group.forEach((record, index) => {
      indexByRowId.set(getWoundsAnalysisRowId(record.folderId), index + 1);
    });
  }

  const sortedRecords = [...records].sort((left, right) => {
    const leftName = `${left.residentLastName} ${left.residentFirstName}`;
    const rightName = `${right.residentLastName} ${right.residentFirstName}`;
    if (leftName !== rightName) {
      return leftName.localeCompare(rightName);
    }
    const leftIndex =
      indexByRowId.get(getWoundsAnalysisRowId(left.folderId)) ?? 0;
    const rightIndex =
      indexByRowId.get(getWoundsAnalysisRowId(right.folderId)) ?? 0;
    return leftIndex - rightIndex;
  });

  return sortedRecords.map((record) => {
    const residentName =
      `${record.residentFirstName} ${record.residentLastName}`.trim() ||
      "Unknown resident";
    const rowId = getWoundsAnalysisRowId(record.folderId);

    return {
      rowId,
      woundFolderId: record.folderId,
      woundId: record.woundId,
      residentId: record.residentId,
      residentName,
      roomNumber: record.roomNumber,
      teamId: record.teamId ?? null,
      woundType: record.woundType,
      location: record.location,
      woundNumber: record.woundNumber ?? undefined,
      woundIndex: indexByRowId.get(rowId) ?? 1,
      woundCountForResident: grouped.get(record.residentId)?.length ?? 1,
      folderStatus: record.folderStatus,
      isHealedReview: record.isHealedReview,
    };
  });
}

export function mergeWoundsAnalysisPrefillAnswers(
  rows: WoundsAnalysisRow[],
  records: WoundAuditRecord[],
  existingAnswers: WoundsAnalysisAnswer[],
  overwriteEmptyOnly = true
): WoundsAnalysisAnswer[] {
  const recordByFolderId = new Map(
    records.map((record) => [record.folderId, record])
  );
  const currentRowIds = new Set(rows.map((row) => row.rowId));
  const answerMap = new Map<string, WoundsAnalysisAnswer>();

  for (const answer of existingAnswers) {
    if (
      (isWoundsAnalysisRowId(answer.residentId) ||
        currentRowIds.has(answer.residentId)) &&
      currentRowIds.has(answer.residentId) &&
      WOUNDS_ANALYSIS_QUESTION_IDS.includes(answer.questionId)
    ) {
      answerMap.set(`${answer.residentId}::${answer.questionId}`, answer);
    }
  }

  for (const row of rows) {
    const record = recordByFolderId.get(row.woundFolderId);
    if (!record) continue;

    const prefill = buildPrefillValuesForWoundRow(record);

    for (const questionId of WOUNDS_ANALYSIS_QUESTION_IDS) {
      const prefillValue = prefill[questionId as WoundsAnalysisQuestionId];
      if (prefillValue === undefined) continue;

      const key = `${row.rowId}::${questionId}`;
      const existing = answerMap.get(key);
      if (existing && overwriteEmptyOnly && existing.value.trim()) {
        continue;
      }

      answerMap.set(key, {
        residentId: row.rowId,
        questionId,
        value: prefillValue,
      });
    }
  }

  return Array.from(answerMap.values());
}

function answersEqual(
  left: WoundsAnalysisAnswer[],
  right: WoundsAnalysisAnswer[]
): boolean {
  if (left.length !== right.length) return false;
  const rightMap = new Map(
    right.map((answer) => [`${answer.residentId}::${answer.questionId}`, answer.value])
  );
  return left.every((answer) => {
    const key = `${answer.residentId}::${answer.questionId}`;
    return rightMap.get(key) === answer.value;
  });
}

function normalizeResidentJoin(
  value:
    | { id: string; first_name: string; last_name: string; room_number?: string | null; team_id?: string | null }
    | { id: string; first_name: string; last_name: string; room_number?: string | null; team_id?: string | null }[]
    | null
) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
}

export async function getActiveWoundsForAudit(
  careHomeId: string,
  organizationId: string,
  monthDate: Date = new Date()
): Promise<{
  auditMonth: string;
  records: WoundAuditRecord[];
}> {
  const auditMonth = getAuditMonthKey(monthDate);
  const monthStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");

  const { data: residents, error: residentsError } = await supabase
    .from("residents")
    .select("id, first_name, last_name, room_number, team_id")
    .eq("care_home_id", careHomeId)
    .eq("organization_id", organizationId);

  if (residentsError) {
    throw residentsError;
  }

  const residentIds = (residents ?? []).map((resident) => resident.id);
  if (residentIds.length === 0) {
    return { auditMonth, records: [] };
  }

  const residentById = new Map(
    (residents ?? []).map((resident) => [resident.id, resident])
  );

  const { data: folders, error: foldersError } = await supabase
    .from("wound_folders")
    .select(
      "id, resident_id, name, wound_type, status, wound_number, body_map_data, created_at, updated_at"
    )
    .eq("organization_id", organizationId)
    .in("resident_id", residentIds);

  if (foldersError) {
    throw foldersError;
  }

  const foldersCreatedThisMonth = (folders ?? []).filter((folder) =>
    isFolderCreatedInAuditMonth(folder, monthStart, monthEnd)
  );

  const relevantFolderIds = foldersCreatedThisMonth.map((folder) => folder.id);

  if (relevantFolderIds.length === 0) {
    return { auditMonth, records: [] };
  }

  const { data: wounds, error: woundsError } = await supabase
    .from("wounds")
    .select(
      "id, wound_folder_id, wound_type, location, stage, date_identified, status, created_at"
    )
    .in("wound_folder_id", relevantFolderIds)
    .order("created_at", { ascending: false });

  if (woundsError) {
    throw woundsError;
  }

  const latestWoundByFolder = new Map<string, (typeof wounds)[number]>();
  for (const wound of wounds ?? []) {
    if (!wound.wound_folder_id) continue;
    if (!latestWoundByFolder.has(wound.wound_folder_id)) {
      latestWoundByFolder.set(wound.wound_folder_id, wound);
    }
  }

  const { data: initialAssessments, error: initialError } = await supabase
    .from("initial_wound_assessments")
    .select("wound_folder_id, assessment_date, date_wound_occurred")
    .in("wound_folder_id", relevantFolderIds)
    .order("assessment_date", { ascending: false });

  if (initialError) {
    throw initialError;
  }

  const initialByFolder = new Map<string, (typeof initialAssessments)[number]>();
  for (const assessment of initialAssessments ?? []) {
    if (!assessment.wound_folder_id) continue;
    if (!initialByFolder.has(assessment.wound_folder_id)) {
      initialByFolder.set(assessment.wound_folder_id, assessment);
    }
  }

  const { data: photoEvaluations, error: photoError } = await supabase
    .from("wound_photograph_evaluations")
    .select("wound_folder_id, photograph_date")
    .in("wound_folder_id", relevantFolderIds)
    .order("photograph_date", { ascending: false });

  if (photoError) {
    throw photoError;
  }

  const latestPhotoByFolder = new Map<
    string,
    (typeof photoEvaluations)[number]
  >();
  for (const photo of photoEvaluations ?? []) {
    if (!photo.wound_folder_id) continue;
    if (!latestPhotoByFolder.has(photo.wound_folder_id)) {
      latestPhotoByFolder.set(photo.wound_folder_id, photo);
    }
  }

  const { data: carePlans, error: carePlanError } = await supabase
    .from("care_plan_assessments")
    .select("wound_folder_id")
    .in("wound_folder_id", relevantFolderIds)
    .eq("status", "active");

  if (carePlanError) {
    throw carePlanError;
  }

  const foldersWithCarePlan = new Set(
    (carePlans ?? [])
      .map((plan) => plan.wound_folder_id)
      .filter(Boolean) as string[]
  );

  const buildRecord = (
    folder: (typeof folders)[number],
    isHealedReview: boolean
  ): WoundAuditRecord | null => {
    const resident = residentById.get(folder.resident_id);
    if (!resident) return null;

    const latestWound = latestWoundByFolder.get(folder.id);
    const initial = initialByFolder.get(folder.id);
    const latestPhoto = latestPhotoByFolder.get(folder.id);
    const bodyMapData = folder.body_map_data as
      | { updatedAt?: string; updated_at?: string }
      | null;

    return {
      folderId: folder.id,
      folderStatus: folder.status ?? "active",
      folderName: folder.name,
      woundNumber: folder.wound_number,
      bodyMapUpdatedAt:
        bodyMapData?.updatedAt ??
        bodyMapData?.updated_at ??
        (folder.body_map_data ? folder.updated_at?.slice(0, 10) : null),
      residentId: folder.resident_id,
      residentFirstName: resident.first_name ?? "",
      residentLastName: resident.last_name ?? "",
      roomNumber: resident.room_number ?? undefined,
      teamId: resident.team_id ?? null,
      woundId: latestWound?.id,
      woundType: latestWound?.wound_type ?? folder.wound_type ?? "",
      location: latestWound?.location ?? "",
      stage: latestWound?.stage ?? null,
      dateIdentified: latestWound?.date_identified ?? null,
      latestPhotoDate: latestPhoto?.photograph_date ?? null,
      initialAssessmentDate:
        initial?.assessment_date ?? initial?.date_wound_occurred ?? null,
      hasActiveCarePlan: foldersWithCarePlan.has(folder.id),
      isHealedReview,
      healedDate: isHealedReview ? folder.updated_at?.slice(0, 10) ?? null : null,
    };
  };

  const records: WoundAuditRecord[] = [];

  for (const folder of foldersCreatedThisMonth) {
    const isHealedReview = folder.status === "healed";
    const record = buildRecord(folder, isHealedReview);
    if (record) records.push(record);
  }

  return { auditMonth, records };
}

export function migrateLegacyResidentAnswersToRows(
  rows: WoundsAnalysisRow[],
  existingAnswers: WoundsAnalysisAnswer[]
): WoundsAnalysisAnswer[] {
  const rowAnswers = existingAnswers.filter((answer) =>
    isWoundsAnalysisRowId(answer.residentId)
  );
  if (rowAnswers.length > 0) {
    return existingAnswers;
  }

  const legacyAnswers = existingAnswers.filter(
    (answer) => !isWoundsAnalysisRowId(answer.residentId)
  );
  if (legacyAnswers.length === 0 || rows.length === 0) {
    return existingAnswers;
  }

  const firstRowByResident = new Map<string, WoundsAnalysisRow>();
  for (const row of rows) {
    if (!firstRowByResident.has(row.residentId)) {
      firstRowByResident.set(row.residentId, row);
    }
  }

  const migrated: WoundsAnalysisAnswer[] = [...rowAnswers];
  for (const answer of legacyAnswers) {
    const row = firstRowByResident.get(answer.residentId);
    if (!row) continue;
    migrated.push({
      residentId: row.rowId,
      questionId: answer.questionId,
      value: answer.value,
    });
  }

  return migrated;
}

export async function syncWoundsAnalysisState(
  careHomeId: string,
  organizationId: string,
  existingAnswers: WoundsAnalysisAnswer[],
  overwriteEmptyOnly = true
): Promise<{
  rows: WoundsAnalysisRow[];
  auditMonth: string;
  records: WoundAuditRecord[];
  answers: WoundsAnalysisAnswer[];
  hasChanges: boolean;
}> {
  const { auditMonth, records } = await getActiveWoundsForAudit(
    careHomeId,
    organizationId
  );

  const rows = buildWoundsAnalysisRows(records);

  const migratedExisting = migrateLegacyResidentAnswersToRows(
    rows,
    existingAnswers
  );

  const legacyFiltered = migratedExisting.filter(
    (answer) =>
      isWoundsAnalysisRowId(answer.residentId) ||
      rows.some((row) => row.residentId === answer.residentId)
  );

  const currentRowIds = new Set(rows.map((row) => row.rowId));
  const rowIdAnswers = legacyFiltered.filter((answer) =>
    isWoundsAnalysisRowId(answer.residentId)
  );
  const prunedExisting = rowIdAnswers.filter((answer) =>
    currentRowIds.has(answer.residentId)
  );
  const previousRowIds = new Set(
    rowIdAnswers.map((answer) => answer.residentId)
  );

  const mergedAnswers = mergeWoundsAnalysisPrefillAnswers(
    rows,
    records,
    rowIdAnswers.length > 0 ? rowIdAnswers : migratedExisting,
    overwriteEmptyOnly
  );

  const rowsChanged =
    rows.length !== previousRowIds.size ||
    rows.some((row) => !previousRowIds.has(row.rowId)) ||
    [...previousRowIds].some((rowId) => !currentRowIds.has(rowId));

  return {
    rows,
    auditMonth,
    records,
    answers: mergedAnswers,
    hasChanges:
      rowsChanged ||
      !answersEqual(prunedExisting, mergedAnswers) ||
      rowIdAnswers.length !== prunedExisting.length ||
      migratedExisting.length !== existingAnswers.length,
  };
}

export function flattenWoundsAnalysisAnswers(
  residents: Array<{
    id: string;
    name?: string;
    answers?: Array<{ questionId: string; value?: string | null }>;
  }>
): WoundsAnalysisAnswer[] {
  const result: WoundsAnalysisAnswer[] = [];
  for (const resident of residents) {
    for (const answer of resident.answers ?? []) {
      result.push({
        residentId: resident.id,
        questionId: answer.questionId,
        value: answer.value != null ? String(answer.value) : "",
      });
    }
  }
  return result;
}

export function resolveWoundsAnalysisTableData(
  auditId: string,
  auditData: Record<string, unknown> | null | undefined
): WoundsAnalysisTableSnapshot | null {
  if (!isWoundsAnalysisAudit(auditId) || !auditData) {
    return null;
  }

  const stored = auditData.woundsAnalysisData as
    | WoundsAnalysisTableSnapshot
    | undefined;

  if (stored?.rows?.length) {
    return {
      auditMonth: stored.auditMonth ?? getAuditMonthKey(),
      rows: stored.rows,
      columnQuestions:
        stored.columnQuestions ??
        filterWoundsColumnQuestions(
          (auditData.questions as WoundsAnalysisQuestion[]) ??
            DEFAULT_WOUNDS_QUESTIONS
        ),
      answers: stored.answers ?? [],
      totalWounds: stored.totalWounds ?? stored.rows.length,
    };
  }

  const legacyResidents = auditData.residents as
    | Array<{
        id: string;
        name?: string;
        answers?: Array<{ questionId: string; value?: string | null }>;
      }>
    | undefined;

  if (legacyResidents?.length) {
    const rows: WoundsAnalysisRow[] = legacyResidents.map((resident) => ({
      rowId: resident.id,
      woundFolderId: resident.id,
      residentId: resident.id,
      residentName: resident.name ?? "Unknown resident",
      woundType: "",
      location: "",
      woundIndex: 1,
      woundCountForResident: 1,
      folderStatus: "legacy",
    }));

    return {
      auditMonth: getAuditMonthKey(),
      rows,
      columnQuestions: filterWoundsColumnQuestions(
        (auditData.questions as WoundsAnalysisQuestion[]) ??
          DEFAULT_WOUNDS_QUESTIONS
      ),
      answers: flattenWoundsAnalysisAnswers(legacyResidents),
      totalWounds: rows.length,
    };
  }

  return null;
}

export { formatYesNoDisplay };
