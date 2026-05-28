import {
  endOfMonth,
  format,
  startOfMonth,
} from "date-fns";
import { supabase } from "@/lib/supabase";

export const FALLS_REGISTER_COLUMN_IDS = [
  "falls-q-1",
  "falls-q-2",
  "falls-q-3",
  "falls-q-4",
  "falls-q-6",
  "falls-q-7",
] as const;

export type FallsRegisterColumnId = (typeof FALLS_REGISTER_COLUMN_IDS)[number];

export const FALLS_REGISTER_OPTIONS: Record<string, string[]> = {
  "falls-q-2": [
    "Bedroom",
    "Toilet / bathroom",
    "Lounges",
    "Corridors",
    "Dining Room",
    "Outside Home",
    "Other",
  ],
  "falls-q-3": [
    "None",
    "Bruises",
    "Cuts & Laceration",
    "Fractured Hip",
    "Fractured Vertebrae",
    "Fractured Wrist",
    "Other head injury",
    "Total number of fractures",
  ],
  "falls-q-4": ["None", "GP", "Ambulance A&E"],
  "falls-q-7": [
    "Physio Referral",
    "GP Review",
    "Medication Review",
    "Sensor Mat Installed",
    "Increased Supervision",
    "Other",
  ],
};

export const NURSE_ACTION_LABELS: Record<string, string> = {
  OnCallManager: "On-call manager informed",
  DutySocialWorker: "Duty social worker informed",
  CarePlanUpdated: "Care plan updated",
  BodyMapCompleted: "Body map completed",
  TrustIncidentReport: "Trust incident report emailed to home manager",
  RiskAssessment: "Risk assessment completed",
  ObservationsCommenced: "Observations commenced",
  WoundAssessment: "Wound assessment completed",
  SafeguardingForms: "Safeguarding forms prepared for home manager",
  KeyWorkerContacted: "Key worker contacted",
};

export interface FallsRegisterQuestion {
  id: string;
  text: string;
  type: "text";
}

export const DEFAULT_FALLS_COLUMN_QUESTIONS: FallsRegisterQuestion[] = [
  { id: "falls-q-1", text: "Time of Fall", type: "text" },
  { id: "falls-q-2", text: "Location of Fall", type: "text" },
  { id: "falls-q-3", text: "Injuries Sustained", type: "text" },
  { id: "falls-q-4", text: "Referrals", type: "text" },
  { id: "falls-q-6", text: "Number of Falls", type: "text" },
  { id: "falls-q-7", text: "Action Taken", type: "text" },
];

export interface PostFallFormData {
  dateOfFall?: string;
  timeOfFall?: string;
  locationOfFall?: string;
}

export interface FallIncidentRecord {
  id: string;
  date: string;
  time: string | null;
  injury_description: string | null;
  body_part_injured: string | null;
  nurse_actions: string[] | null;
  home_name: string | null;
  unit: string | null;
  folder_id: string | null;
  resident_id: string;
  incident_types: string[];
  home_manager_informed_by: string | null;
  home_manager_informed_date_time: string | null;
  on_call_manager_name: string | null;
  on_call_contacted_date_time: string | null;
  nok_informed_who: string | null;
  nok_informed_date_time: string | null;
  trust_care_manager_name: string | null;
  trust_key_worker_name: string | null;
  resident: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export interface FallRegisterRow {
  rowId: string;
  incidentId: string;
  residentId: string;
  residentName: string;
  fallDate: string;
  fallCount: number;
}

export interface FallsRegisterAnswer {
  residentId: string;
  questionId: string;
  value: string;
}

export function getFallRowId(incidentId: string): string {
  return `fall-${incidentId}`;
}

export function isFallIncident(incidentTypes: string[] | null | undefined): boolean {
  if (!incidentTypes?.length) return false;
  return incidentTypes.some((t) => {
    const normalized = t.trim().toLowerCase();
    return (
      t === "FallWitnessed" ||
      t === "FallUnwitnessed" ||
      normalized === "fall" ||
      normalized === "falls"
    );
  });
}

export function getAuditMonthKey(date: Date = new Date()): string {
  return format(date, "yyyy-MM");
}

export function formatAuditMonthLabel(auditMonth: string): string {
  const parsed = new Date(`${auditMonth}-01T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return auditMonth;
  return format(parsed, "MMMM yyyy");
}

export function formatExactFallTime(
  postFall: PostFallFormData | undefined,
  incidentTime: string | null | undefined
): string {
  const raw = postFall?.timeOfFall?.trim() || incidentTime?.trim();
  if (!raw) return "";

  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    const hours = match[1].padStart(2, "0");
    return `${hours}:${match[2]}`;
  }

  return raw;
}

export function getEffectiveFallDate(
  incident: FallIncidentRecord,
  postFall: PostFallFormData | undefined
): string | null {
  if (postFall?.dateOfFall?.trim()) {
    return postFall.dateOfFall.trim();
  }
  if (incident.date?.trim()) {
    return incident.date.trim();
  }
  return null;
}

export function isFallInAuditMonth(
  incident: FallIncidentRecord,
  postFall: PostFallFormData | undefined,
  monthStart: string,
  monthEnd: string
): boolean {
  const effectiveDate = getEffectiveFallDate(incident, postFall);
  if (!effectiveDate) return false;
  return effectiveDate >= monthStart && effectiveDate <= monthEnd;
}

export function formatInjuryDescription(incident: FallIncidentRecord): string {
  const parts: string[] = [];
  if (incident.injury_description?.trim()) {
    parts.push(incident.injury_description.trim());
  }
  if (incident.body_part_injured?.trim()) {
    parts.push(`Body part: ${incident.body_part_injured.trim()}`);
  }
  return parts.length > 0 ? parts.join(" — ") : "None";
}

export function extractNotificationRecipients(
  incident: FallIncidentRecord
): string {
  const recipients: string[] = [];

  if (incident.home_manager_informed_date_time?.trim()) {
    if (incident.home_manager_informed_by?.trim()) {
      recipients.push(
        `Home Manager: ${incident.home_manager_informed_by.trim()}`
      );
    } else {
      recipients.push("Home Manager: Informed");
    }
  }

  if (
    incident.on_call_manager_name?.trim() ||
    incident.on_call_contacted_date_time?.trim()
  ) {
    recipients.push(
      `Out of Hours On-Call Manager: ${
        incident.on_call_manager_name?.trim() || "Informed"
      }`
    );
  }

  if (
    incident.nok_informed_who?.trim() ||
    incident.nok_informed_date_time?.trim()
  ) {
    recipients.push(
      `Next of Kin: ${incident.nok_informed_who?.trim() || "Informed"}`
    );
  }

  if (incident.trust_care_manager_name?.trim()) {
    recipients.push(
      `Care Manager: ${incident.trust_care_manager_name.trim()}`
    );
  }

  if (incident.trust_key_worker_name?.trim()) {
    recipients.push(
      `Key Worker: ${incident.trust_key_worker_name.trim()}`
    );
  }

  return recipients.length > 0 ? recipients.join("; ") : "None";
}

export function formatNurseActions(
  nurseActions: string[] | null | undefined
): string {
  if (!nurseActions?.length) return "";
  return nurseActions
    .map((action) => NURSE_ACTION_LABELS[action] ?? action)
    .join(", ");
}

function resolveLocationFromPostFallAssessment(
  incident: FallIncidentRecord,
  postFallByFolderId: Map<string, PostFallFormData>
): string {
  if (!incident.folder_id) return "";
  return postFallByFolderId.get(incident.folder_id)?.locationOfFall?.trim() ?? "";
}

export function buildFallRegisterRows(
  incidents: FallIncidentRecord[],
  postFallByFolderId: Map<string, PostFallFormData>
): FallRegisterRow[] {
  const fallIncidents = incidents.filter((incident) =>
    isFallIncident(incident.incident_types)
  );

  const countsByResident = new Map<string, number>();
  for (const incident of fallIncidents) {
    countsByResident.set(
      incident.resident_id,
      (countsByResident.get(incident.resident_id) ?? 0) + 1
    );
  }

  return fallIncidents.map((incident) => {
    const firstName = incident.resident?.first_name ?? "";
    const lastName = incident.resident?.last_name ?? "";
    const residentName = `${firstName} ${lastName}`.trim() || "Unknown resident";
    const postFall = incident.folder_id
      ? postFallByFolderId.get(incident.folder_id)
      : undefined;

    return {
      rowId: getFallRowId(incident.id),
      incidentId: incident.id,
      residentId: incident.resident_id,
      residentName,
      fallDate: getEffectiveFallDate(incident, postFall) ?? incident.date,
      fallCount: countsByResident.get(incident.resident_id) ?? 1,
    };
  });
}

export function buildPrefillValuesForRow(
  incident: FallIncidentRecord,
  postFallByFolderId: Map<string, PostFallFormData>,
  fallCount: number
): Record<FallsRegisterColumnId, string> {
  const postFall = incident.folder_id
    ? postFallByFolderId.get(incident.folder_id)
    : undefined;

  return {
    "falls-q-1": formatExactFallTime(postFall, incident.time),
    "falls-q-2": resolveLocationFromPostFallAssessment(incident, postFallByFolderId),
    "falls-q-3": formatInjuryDescription(incident),
    "falls-q-4": extractNotificationRecipients(incident),
    "falls-q-6": String(fallCount),
    "falls-q-7": formatNurseActions(incident.nurse_actions) || "Other",
  };
}

export function mergePrefillAnswers(
  rows: FallRegisterRow[],
  incidents: FallIncidentRecord[],
  postFallByFolderId: Map<string, PostFallFormData>,
  existingAnswers: FallsRegisterAnswer[],
  overwriteEmptyOnly = true
): FallsRegisterAnswer[] {
  const incidentById = new Map(incidents.map((incident) => [incident.id, incident]));
  const currentRowIds = new Set(rows.map((row) => row.rowId));
  const answerMap = new Map<string, FallsRegisterAnswer>();

  for (const answer of existingAnswers) {
    if (
      currentRowIds.has(answer.residentId) &&
      FALLS_REGISTER_COLUMN_IDS.includes(
        answer.questionId as FallsRegisterColumnId
      )
    ) {
      answerMap.set(`${answer.residentId}::${answer.questionId}`, answer);
    }
  }

  for (const row of rows) {
    const incident = incidentById.get(row.incidentId);
    if (!incident) continue;

    const prefill = buildPrefillValuesForRow(
      incident,
      postFallByFolderId,
      row.fallCount
    );

    for (const columnId of FALLS_REGISTER_COLUMN_IDS) {
      const key = `${row.rowId}::${columnId}`;
      const existing = answerMap.get(key);
      if (existing && overwriteEmptyOnly && existing.value.trim()) {
        continue;
      }

      answerMap.set(key, {
        residentId: row.rowId,
        questionId: columnId,
        value: prefill[columnId],
      });
    }
  }

  return Array.from(answerMap.values());
}

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

function parsePostFallFormData(reportData: unknown): PostFallFormData {
  if (!reportData || typeof reportData !== "object") {
    return {};
  }

  const data = reportData as Record<string, unknown>;
  return {
    dateOfFall:
      typeof data.dateOfFall === "string" ? data.dateOfFall : undefined,
    timeOfFall:
      typeof data.timeOfFall === "string" ? data.timeOfFall : undefined,
    locationOfFall:
      typeof data.locationOfFall === "string" ? data.locationOfFall : undefined,
  };
}

async function fetchFallFolderIdsCreatedInMonth(
  careHomeId: string,
  organizationId: string,
  monthStart: string,
  monthEnd: string
): Promise<string[]> {
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
    return [];
  }

  const { data: folders, error: foldersError } = await supabase
    .from("incident_folders")
    .select("id")
    .eq("folder_type", "fall")
    .in("resident_id", residentIds)
    .gte("created_at", monthStart)
    .lte("created_at", `${monthEnd}T23:59:59.999Z`);

  if (foldersError) {
    throw foldersError;
  }

  return (folders ?? []).map((folder) => folder.id);
}

async function fetchPostFallAssessmentsForFolders(
  folderIds: string[]
): Promise<Map<string, PostFallFormData>> {
  if (folderIds.length === 0) {
    return new Map();
  }

  const { data: postFallReports, error: postFallError } = await supabase
    .from("trust_incident_reports")
    .select("folder_id, report_data")
    .eq("report_type", "post-fall-assessment")
    .in("folder_id", folderIds);

  if (postFallError) {
    throw postFallError;
  }

  const postFallByFolderId = new Map<string, PostFallFormData>();
  for (const report of postFallReports ?? []) {
    if (!report.folder_id) continue;
    postFallByFolderId.set(
      report.folder_id,
      parsePostFallFormData(report.report_data)
    );
  }

  return postFallByFolderId;
}

export async function getFallIncidentsForMonth(
  careHomeId: string,
  organizationId: string,
  monthDate: Date = new Date()
): Promise<{
  auditMonth: string;
  incidents: FallIncidentRecord[];
  postFallByFolderId: Map<string, PostFallFormData>;
  rows: FallRegisterRow[];
}> {
  const monthStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");
  const auditMonth = getAuditMonthKey(monthDate);

  const folderIdsInMonth = await fetchFallFolderIdsCreatedInMonth(
    careHomeId,
    organizationId,
    monthStart,
    monthEnd
  );

  const postFallByFolderId = await fetchPostFallAssessmentsForFolders(
    folderIdsInMonth
  );

  if (folderIdsInMonth.length === 0) {
    return {
      auditMonth,
      incidents: [],
      postFallByFolderId,
      rows: [],
    };
  }

  const { data: incidentRows, error: incidentsError } = await supabase
    .from("incidents")
    .select(INCIDENT_SELECT)
    .eq("organization_id", organizationId)
    .in("folder_id", folderIdsInMonth);

  if (incidentsError) {
    throw incidentsError;
  }

  const fallIncidents = (incidentRows ?? [])
    .map((row) => normalizeIncidentRow(row as Record<string, unknown>))
    .filter((incident) => isFallIncident(incident.incident_types));

  fallIncidents.sort((left, right) => {
    const leftPostFall = left.folder_id
      ? postFallByFolderId.get(left.folder_id)
      : undefined;
    const rightPostFall = right.folder_id
      ? postFallByFolderId.get(right.folder_id)
      : undefined;
    const leftDate = getEffectiveFallDate(left, leftPostFall) ?? left.date;
    const rightDate = getEffectiveFallDate(right, rightPostFall) ?? right.date;

    if (leftDate !== rightDate) {
      return leftDate.localeCompare(rightDate);
    }

    const leftTime = formatExactFallTime(leftPostFall, left.time);
    const rightTime = formatExactFallTime(rightPostFall, right.time);
    return leftTime.localeCompare(rightTime);
  });

  const rows = buildFallRegisterRows(fallIncidents, postFallByFolderId);

  return {
    auditMonth,
    incidents: fallIncidents,
    postFallByFolderId,
    rows,
  };
}

function answersEqual(
  left: FallsRegisterAnswer[],
  right: FallsRegisterAnswer[]
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

export async function syncFallRegisterState(
  careHomeId: string,
  organizationId: string,
  existingAnswers: FallsRegisterAnswer[],
  overwriteEmptyOnly = true
): Promise<{
  rows: FallRegisterRow[];
  auditMonth: string;
  incidents: FallIncidentRecord[];
  answers: FallsRegisterAnswer[];
  hasChanges: boolean;
}> {
  const { auditMonth, incidents, postFallByFolderId, rows } =
    await getFallIncidentsForMonth(careHomeId, organizationId);

  const legacyFiltered = existingAnswers.filter(
    (answer) =>
      answer.residentId.startsWith("fall-") &&
      FALLS_REGISTER_COLUMN_IDS.includes(
        answer.questionId as FallsRegisterColumnId
      )
  );

  const currentRowIds = new Set(rows.map((row) => row.rowId));
  const prunedExisting = legacyFiltered.filter((answer) =>
    currentRowIds.has(answer.residentId)
  );

  const mergedAnswers = mergePrefillAnswers(
    rows,
    incidents,
    postFallByFolderId,
    legacyFiltered,
    overwriteEmptyOnly
  );

  return {
    rows,
    auditMonth,
    incidents,
    answers: mergedAnswers,
    hasChanges:
      !answersEqual(prunedExisting, mergedAnswers) ||
      legacyFiltered.length !== prunedExisting.length,
  };
}
