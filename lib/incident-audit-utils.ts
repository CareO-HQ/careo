import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { formatIncidentTimeDisplay } from "@/lib/incident-time-utils";
import { supabase } from "@/lib/supabase";
import {
  type FallIncidentRecord,
  getAuditMonthKey,
  formatExactFallTime,
} from "@/lib/falls-register-utils";

const INCIDENT_SELECT = `
  id,
  date,
  time,
  injury_description,
  body_part_injured,
  nurse_actions,
  home_name,
  unit,
  folder_id,
  resident_id,
  incident_types,
  home_manager_informed_by,
  home_manager_informed_date_time,
  on_call_manager_name,
  on_call_contacted_date_time,
  nok_informed_who,
  nok_informed_date_time,
  trust_care_manager_name,
  trust_key_worker_name,
  resident:residents(id, first_name, last_name)
`;

export const INCIDENT_AUDIT_ID = "34";

export const INCIDENT_AUDIT_ROW_PREFIX = "incident-audit-";

export const INCIDENT_AUDIT_QUESTION_IDS = [
  "acc-q-2",
  "acc-q-3",
  "acc-q-4",
  "acc-q-5",
  "acc-q-6",
  "acc-q-7",
  "acc-q-8",
  "acc-q-9",
  "acc-q-10",
  "acc-q-11",
] as const;

export type IncidentAuditQuestionId = (typeof INCIDENT_AUDIT_QUESTION_IDS)[number];

export const INCIDENT_AUDIT_OPTION_PILLS: Record<string, string[]> = {
  "acc-q-4": ["None", "Minor", "Major (medical advice / A&E)"],
};

const INCIDENT_TYPE_LABELS: Record<string, string> = {
  FallWitnessed: "Fall (witnessed)",
  FallUnwitnessed: "Fall (unwitnessed)",
  PressureUlcer: "Pressure ulcer",
  Wound: "Wound",
  Illness: "Illness",
  NearMiss: "Near miss",
  ExpectedDeath: "Expected death",
  UnexpectedDeath: "Unexpected death",
  StaffingLevels: "Staffing levels",
  Equipment: "Equipment",
  StaffAccident: "Staff accident",
  AbuseOfStaff: "Abuse of staff",
  Behavioural: "Behavioural issues",
  Safeguarding: "Safeguarding involving resident",
  Medication: "Medication incident",
  AbsentWithoutLeave: "Absent without leave",
  WeightLoss: "Weight loss",
  Choking: "Choking",
  Bruise: "Bruise",
  ResidentAltercation: "Resident-on-resident altercation",
  Infection: "Infection",
  Covid: "COVID",
  FireSafety: "Fire & safety",
  SelfHarm: "Self-harm",
  PSNI: "PSNI (police) involvement",
  Theft: "Theft",
  MissingResident: "Missing resident",
  Other: "Other",
};

export interface IncidentAuditQuestion {
  id: string;
  text: string;
  type: "compliance" | "yesno" | "text" | "date" | "risk" | string;
  isSection?: boolean;
}

export interface IncidentAuditAnswer {
  residentId: string;
  questionId: string;
  value: string;
}

export interface IncidentAuditRow {
  rowId: string;
  incidentId: string;
  residentId: string;
  residentName: string;
  incidentDate: string;
  incidentTypeLabel?: string;
  incidentIndex: number;
  incidentCountForResident: number;
  roomNumber?: string;
  teamId?: string | null;
}

export interface IncidentAuditTableSnapshot {
  auditMonth: string;
  rows: IncidentAuditRow[];
  columnQuestions: IncidentAuditQuestion[];
  answers: IncidentAuditAnswer[];
  totalIncidents?: number;
}

export function isIncidentAudit(auditId: string): boolean {
  return auditId === INCIDENT_AUDIT_ID;
}

export function formatIncidentTypeLabel(
  incidentTypes: string[] | null | undefined
): string {
  if (!incidentTypes?.length) {
    return "Incident";
  }
  return incidentTypes
    .map(
      (type) =>
        INCIDENT_TYPE_LABELS[type] ||
        type.replace(/([A-Z])/g, " $1").trim()
    )
    .join(", ");
}

export function getIncidentAuditRowId(incidentId: string): string {
  return `${INCIDENT_AUDIT_ROW_PREFIX}${incidentId}`;
}

export function isIncidentAuditRowId(rowId: string): boolean {
  return rowId.startsWith(INCIDENT_AUDIT_ROW_PREFIX);
}

export function formatIncidentDate(incidentDate: string): string {
  try {
    return format(parseISO(incidentDate), "dd MMM yyyy");
  } catch {
    return incidentDate;
  }
}

/** Human-readable date and time for incident audit cells. */
export function formatIncidentAuditDateTime(
  date: string | null | undefined,
  time: string | null | undefined
): string {
  const dateTrimmed = date?.trim() ?? "";
  const timeTrimmed = time?.trim() ?? "";

  let datePart = "";
  if (dateTrimmed) {
    try {
      datePart = format(parseISO(dateTrimmed), "dd MMM yyyy");
    } catch {
      datePart = dateTrimmed;
    }
  }

  let timePart = "";
  if (timeTrimmed && /^\d{1,2}:\d{2}$/.test(timeTrimmed)) {
    timePart = formatIncidentTimeDisplay(timeTrimmed);
  } else if (timeTrimmed) {
    timePart = timeTrimmed;
  }

  if (datePart && timePart) {
    return `${datePart} · ${timePart}`;
  }
  return datePart || timePart;
}

/** Format a stored audit answer for Date & Time (acc-q-2). */
export function formatIncidentAuditDateTimeAnswer(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const isoDateTimeMatch = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}:\d{2}))?$/
  );
  if (isoDateTimeMatch) {
    return formatIncidentAuditDateTime(
      isoDateTimeMatch[1],
      isoDateTimeMatch[2] ?? ""
    );
  }

  return trimmed;
}

export function filterIncidentColumnQuestions(
  questions: IncidentAuditQuestion[]
): IncidentAuditQuestion[] {
  return questions.filter((q) => !q.isSection);
}

function normalizeIncidentRow(row: Record<string, unknown>): FallIncidentRecord {
  const residentValue = row.resident as
    | { id: string; first_name: string; last_name: string }
    | { id: string; first_name: string; last_name: string }[]
    | null;
  const resident = Array.isArray(residentValue)
    ? residentValue[0] ?? null
    : residentValue;

  return {
    ...(row as Omit<FallIncidentRecord, "resident">),
    resident,
  };
}

export async function getIncidentsForIncidentAuditMonth(
  careHomeId: string,
  organizationId: string,
  monthDate: Date = new Date()
): Promise<{
  auditMonth: string;
  incidents: FallIncidentRecord[];
}> {
  const monthStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");
  const auditMonth = getAuditMonthKey(monthDate);

  const { data: residents, error: residentsError } = await supabase
    .from("residents")
    .select("id")
    .eq("care_home_id", careHomeId)
    .eq("organization_id", organizationId);

  if (residentsError) {
    throw residentsError;
  }

  const residentIds = (residents ?? []).map((resident) => resident.id);
  if (residentIds.length === 0) {
    return { auditMonth, incidents: [] };
  }

  const { data: incidentFolders, error: foldersError } = await supabase
    .from("incident_folders")
    .select("id")
    .in("resident_id", residentIds)
    .eq("folder_type", "incident");

  if (foldersError) {
    throw foldersError;
  }

  const incidentFolderIds = (incidentFolders ?? []).map((folder) => folder.id);
  if (incidentFolderIds.length === 0) {
    return { auditMonth, incidents: [] };
  }

  const { data, error } = await supabase
    .from("incidents")
    .select(INCIDENT_SELECT)
    .eq("organization_id", organizationId)
    .in("folder_id", incidentFolderIds)
    .gte("date", monthStart)
    .lte("date", monthEnd);

  if (error) {
    throw error;
  }

  const incidents = (data ?? [])
    .map((row) => normalizeIncidentRow(row as Record<string, unknown>))
    .filter((incident) => Boolean(incident.folder_id));

  incidents.sort((left, right) => {
    const leftDate = left.date ?? "";
    const rightDate = right.date ?? "";
    if (leftDate !== rightDate) {
      return leftDate.localeCompare(rightDate);
    }
    const leftTime = formatExactFallTime(undefined, left.time);
    const rightTime = formatExactFallTime(undefined, right.time);
    return leftTime.localeCompare(rightTime);
  });

  return { auditMonth, incidents };
}

/** Injury text from incident report fields (injury description + body part). */
export function getInjuryPrefillFromIncidentReport(
  incident: FallIncidentRecord
): string {
  const description = incident.injury_description?.trim() ?? "";
  const bodyPart = incident.body_part_injured?.trim() ?? "";

  if (!description && !bodyPart) {
    return "";
  }

  if (description && bodyPart) {
    return `${description} — Body part: ${bodyPart}`;
  }

  return description || `Body part: ${bodyPart}`;
}

function yesNoFromTruthy(value: boolean): string {
  return value ? "yes" : "no";
}

function hasNurseAction(
  incident: FallIncidentRecord,
  actionKey: string
): boolean {
  return (incident.nurse_actions ?? []).includes(actionKey);
}

export function buildPrefillValuesForIncidentAuditRow(
  incident: FallIncidentRecord
): Record<IncidentAuditQuestionId, string> {
  const location =
    incident.unit?.trim() || incident.home_name?.trim() || "";

  return {
    "acc-q-2": formatIncidentAuditDateTime(incident.date, incident.time),
    "acc-q-3": location,
    "acc-q-4": getInjuryPrefillFromIncidentReport(incident) || "None",
    "acc-q-5": yesNoFromTruthy(
      Boolean(
        incident.nok_informed_who?.trim() ||
          incident.nok_informed_date_time?.trim()
      )
    ),
    "acc-q-6": yesNoFromTruthy(Boolean(incident.trust_key_worker_name?.trim())),
    "acc-q-7": "",
    "acc-q-8": yesNoFromTruthy(hasNurseAction(incident, "RiskAssessment")),
    "acc-q-9": yesNoFromTruthy(hasNurseAction(incident, "CarePlanUpdated")),
    "acc-q-10": yesNoFromTruthy(
      hasNurseAction(incident, "ObservationsCommenced")
    ),
    "acc-q-11": "",
  };
}

export function mergeIncidentAuditPrefillAnswers(
  rows: IncidentAuditRow[],
  incidents: FallIncidentRecord[],
  existingAnswers: IncidentAuditAnswer[],
  overwriteEmptyOnly = true
): IncidentAuditAnswer[] {
  const incidentById = new Map(incidents.map((incident) => [incident.id, incident]));
  const currentRowIds = new Set(rows.map((row) => row.rowId));
  const answerMap = new Map<string, IncidentAuditAnswer>();

  for (const answer of existingAnswers) {
    if (
      isIncidentAuditRowId(answer.residentId) &&
      currentRowIds.has(answer.residentId) &&
      INCIDENT_AUDIT_QUESTION_IDS.includes(
        answer.questionId as IncidentAuditQuestionId
      )
    ) {
      answerMap.set(`${answer.residentId}::${answer.questionId}`, answer);
    }
  }

  for (const row of rows) {
    const incident = incidentById.get(row.incidentId);
    if (!incident) continue;

    const prefill = buildPrefillValuesForIncidentAuditRow(incident);

    for (const questionId of INCIDENT_AUDIT_QUESTION_IDS) {
      const key = `${row.rowId}::${questionId}`;
      const existing = answerMap.get(key);
      if (existing && overwriteEmptyOnly && existing.value.trim()) {
        continue;
      }

      answerMap.set(key, {
        residentId: row.rowId,
        questionId,
        value: prefill[questionId],
      });
    }
  }

  return Array.from(answerMap.values());
}

function answersEqual(
  left: IncidentAuditAnswer[],
  right: IncidentAuditAnswer[]
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

interface ResidentMeta {
  teamId?: string | null;
  roomNumber?: string;
}

async function fetchResidentMetaForCareHome(
  careHomeId: string,
  organizationId: string
): Promise<Map<string, ResidentMeta>> {
  const { data, error } = await supabase
    .from("residents")
    .select("id, team_id, room_number")
    .eq("care_home_id", careHomeId)
    .eq("organization_id", organizationId);

  if (error) {
    throw error;
  }

  const map = new Map<string, ResidentMeta>();
  for (const resident of data ?? []) {
    map.set(resident.id, {
      teamId: resident.team_id,
      roomNumber: resident.room_number ?? undefined,
    });
  }
  return map;
}

export function buildIncidentAuditRows(
  incidents: FallIncidentRecord[],
  residentMeta: Map<string, ResidentMeta>
): IncidentAuditRow[] {
  const indexByRowId = new Map<string, number>();
  const grouped = new Map<string, FallIncidentRecord[]>();

  for (const incident of incidents) {
    const list = grouped.get(incident.resident_id) ?? [];
    list.push(incident);
    grouped.set(incident.resident_id, list);
  }

  for (const group of grouped.values()) {
    group.forEach((incident, index) => {
      indexByRowId.set(getIncidentAuditRowId(incident.id), index + 1);
    });
  }

  return incidents.map((incident) => {
    const firstName = incident.resident?.first_name ?? "";
    const lastName = incident.resident?.last_name ?? "";
    const residentName =
      `${firstName} ${lastName}`.trim() || "Unknown resident";
    const meta = residentMeta.get(incident.resident_id);
    const auditRowId = getIncidentAuditRowId(incident.id);

    return {
      rowId: auditRowId,
      incidentId: incident.id,
      residentId: incident.resident_id,
      residentName,
      incidentDate: incident.date,
      incidentTypeLabel: formatIncidentTypeLabel(incident.incident_types),
      incidentIndex: indexByRowId.get(auditRowId) ?? 1,
      incidentCountForResident: grouped.get(incident.resident_id)?.length ?? 1,
      roomNumber: meta?.roomNumber,
      teamId: meta?.teamId ?? null,
    };
  });
}

export async function syncIncidentAuditState(
  careHomeId: string,
  organizationId: string,
  existingAnswers: IncidentAuditAnswer[],
  overwriteEmptyOnly = true
): Promise<{
  rows: IncidentAuditRow[];
  auditMonth: string;
  incidents: FallIncidentRecord[];
  answers: IncidentAuditAnswer[];
  hasChanges: boolean;
}> {
  const { auditMonth, incidents } = await getIncidentsForIncidentAuditMonth(
    careHomeId,
    organizationId
  );

  const residentMeta = await fetchResidentMetaForCareHome(
    careHomeId,
    organizationId
  );

  const rows = buildIncidentAuditRows(incidents, residentMeta);

  const legacyFiltered = existingAnswers.filter((answer) =>
    isIncidentAuditRowId(answer.residentId)
  );

  const currentRowIds = new Set(rows.map((row) => row.rowId));
  const prunedExisting = legacyFiltered.filter((answer) =>
    currentRowIds.has(answer.residentId)
  );
  const previousRowIds = new Set(
    legacyFiltered.map((answer) => answer.residentId)
  );

  const mergedAnswers = mergeIncidentAuditPrefillAnswers(
    rows,
    incidents,
    legacyFiltered,
    overwriteEmptyOnly
  );

  const rowsChanged =
    rows.length !== previousRowIds.size ||
    rows.some((row) => !previousRowIds.has(row.rowId)) ||
    [...previousRowIds].some((rowId) => !currentRowIds.has(rowId));

  return {
    rows,
    auditMonth,
    incidents,
    answers: mergedAnswers,
    hasChanges:
      rowsChanged ||
      !answersEqual(prunedExisting, mergedAnswers) ||
      legacyFiltered.length !== prunedExisting.length,
  };
}

export function flattenIncidentAuditAnswers(
  residents: Array<{
    id: string;
    answers?: Array<{ questionId: string; value?: string | null }>;
  }>
): IncidentAuditAnswer[] {
  const result: IncidentAuditAnswer[] = [];
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

export function resolveIncidentAuditTableData(
  auditId: string,
  auditData: Record<string, unknown> | null | undefined
): IncidentAuditTableSnapshot | null {
  if (!isIncidentAudit(auditId) || !auditData) {
    return null;
  }

  const stored = auditData.incidentAuditData as
    | IncidentAuditTableSnapshot
    | undefined;

  if (stored?.rows?.length) {
    return {
      auditMonth: stored.auditMonth ?? getAuditMonthKey(),
      rows: stored.rows,
      columnQuestions:
        stored.columnQuestions ??
        filterIncidentColumnQuestions(
          (auditData.questions as IncidentAuditQuestion[]) ?? []
        ),
      answers: stored.answers ?? [],
      totalIncidents: stored.totalIncidents ?? stored.rows.length,
    };
  }

  return null;
}

export function formatYesNoDisplay(value: string | undefined): string {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "yes") return "Yes";
  if (v === "no") return "No";
  return "—";
}
