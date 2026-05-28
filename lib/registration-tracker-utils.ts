import { format, parseISO } from "date-fns";
import { supabase } from "@/lib/supabase";

export const REGISTRATION_TRACKER_AUDIT_IDS = {
  NISCC: "32",
  NMC: "33",
} as const;

export type RegistrationTrackerAuditId =
  (typeof REGISTRATION_TRACKER_AUDIT_IDS)[keyof typeof REGISTRATION_TRACKER_AUDIT_IDS];

export type RegistrationTrackerType = "niscc" | "nmc";

export interface RegistrationTrackerQuestion {
  id: string;
  text: string;
  type: "text" | "date";
}

export interface RegistrationTrackerAnswer {
  residentId: string;
  questionId: string;
  value: string;
}

export interface RegistrationTrackerRow {
  staffId: string;
  staffName: string;
  roleLabel: string;
}

export interface RegistrationTrackerUser {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  is_saas_admin?: boolean | null;
  date_of_join: string | null;
  nmc_pin_number: string | null;
  nmc_renewal_fee_date: string | null;
  niscc_registration_number: string | null;
  niscc_registration_date: string | null;
  niscc_annual_fee_date: string | null;
}

export const DEFAULT_NMC_TRACKER_QUESTIONS: RegistrationTrackerQuestion[] = [
  { id: "nmc-q1", text: "Employment Start Date", type: "date" },
  { id: "nmc-q2", text: "NMC PIN Number", type: "text" },
  { id: "nmc-q3", text: "Date of Birth", type: "date" },
  { id: "nmc-q4", text: "NMC Renewal Fee Date", type: "date" },
  { id: "nmc-q5", text: "Revalidation Date", type: "date" },
  { id: "nmc-q6", text: "Registration Checked and Confirmed", type: "date" },
  {
    id: "nmc-q7",
    text: "Notes - including any restrictions to practice",
    type: "text",
  },
];

export const DEFAULT_NISCC_TRACKER_QUESTIONS: RegistrationTrackerQuestion[] = [
  { id: "niscc-q2", text: "Employment Start Date", type: "date" },
  { id: "niscc-q3", text: "NISCC Registration Number", type: "text" },
  { id: "niscc-q4", text: "NISCC Registration Date", type: "date" },
  { id: "niscc-q5", text: "Annual Fee Date", type: "date" },
  { id: "niscc-q6", text: "Renewal Date", type: "date" },
  { id: "niscc-q7", text: "Registration Checked and Confirmed", type: "date" },
  {
    id: "niscc-q8",
    text: "Notes - including any restrictions to practice",
    type: "text",
  },
];

const NMC_PREFILL_QUESTION_IDS = ["nmc-q1", "nmc-q2", "nmc-q4"] as const;
const NISCC_PREFILL_QUESTION_IDS = [
  "niscc-q2",
  "niscc-q3",
  "niscc-q4",
  "niscc-q5",
] as const;

export function isRegistrationTrackerAudit(
  auditId: string
): auditId is RegistrationTrackerAuditId {
  return (
    auditId === REGISTRATION_TRACKER_AUDIT_IDS.NMC ||
    auditId === REGISTRATION_TRACKER_AUDIT_IDS.NISCC
  );
}

export function getRegistrationTrackerType(
  auditId: RegistrationTrackerAuditId
): RegistrationTrackerType {
  return auditId === REGISTRATION_TRACKER_AUDIT_IDS.NMC ? "nmc" : "niscc";
}

export function getRegistrationTrackerQuestions(
  auditId: RegistrationTrackerAuditId
): RegistrationTrackerQuestion[] {
  return auditId === REGISTRATION_TRACKER_AUDIT_IDS.NMC
    ? DEFAULT_NMC_TRACKER_QUESTIONS
    : DEFAULT_NISCC_TRACKER_QUESTIONS;
}

export function formatRoleLabel(role: string | null | undefined): string {
  if (!role) return "";
  const normalized = role.toLowerCase().trim();
  if (normalized === "care-staff" || normalized === "carer") return "CA/SCA";
  if (normalized === "nurse") return "Nurse";
  if (normalized === "manager") return "Manager";
  if (normalized === "admin") return "Admin";
  if (normalized === "care_assistant") return "Care Assistant";
  if (normalized === "owner") return "Owner";
  return role
    .split(/[-_]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function filterUsersForRegistrationTracker(
  users: RegistrationTrackerUser[],
  auditId: RegistrationTrackerAuditId
): RegistrationTrackerUser[] {
  if (auditId === REGISTRATION_TRACKER_AUDIT_IDS.NMC) {
    return users.filter(
      (user) => user.role?.toLowerCase().trim() === "nurse"
    );
  }

  return users.filter((user) => {
    const role = user.role?.toLowerCase().trim();
    return role !== "owner" && user.is_saas_admin !== true;
  });
}

export function mapUsersToRegistrationRows(
  users: RegistrationTrackerUser[]
): RegistrationTrackerRow[] {
  return users.map((user) => {
    const nameParts = (user.name || "").trim().split(/\s+/);
    const first = nameParts[0] || user.email || "Staff";
    const last = nameParts.slice(1).join(" ");
    const staffName = `${first} ${last}`.trim();

    return {
      staffId: user.id,
      staffName,
      roleLabel: formatRoleLabel(user.role),
    };
  });
}

function formatDateValue(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const parsed = parseISO(value);
    return format(parsed, "yyyy-MM-dd");
  } catch {
    return value;
  }
}

export function buildPrefillValuesForStaff(
  user: RegistrationTrackerUser,
  auditId: RegistrationTrackerAuditId
): Record<string, string> {
  if (auditId === REGISTRATION_TRACKER_AUDIT_IDS.NMC) {
    return {
      "nmc-q1": formatDateValue(user.date_of_join),
      "nmc-q2": user.nmc_pin_number?.trim() || "",
      "nmc-q4": formatDateValue(user.nmc_renewal_fee_date),
    };
  }

  return {
    "niscc-q2": formatDateValue(user.date_of_join),
    "niscc-q3": user.niscc_registration_number?.trim() || "",
    "niscc-q4": formatDateValue(user.niscc_registration_date),
    "niscc-q5": formatDateValue(user.niscc_annual_fee_date),
  };
}

function getPrefillQuestionIds(
  auditId: RegistrationTrackerAuditId
): readonly string[] {
  return auditId === REGISTRATION_TRACKER_AUDIT_IDS.NMC
    ? NMC_PREFILL_QUESTION_IDS
    : NISCC_PREFILL_QUESTION_IDS;
}

export function mergePrefillAnswers(
  rows: RegistrationTrackerRow[],
  users: RegistrationTrackerUser[],
  existingAnswers: RegistrationTrackerAnswer[],
  auditId: RegistrationTrackerAuditId,
  overwriteEmptyOnly = true
): RegistrationTrackerAnswer[] {
  const userById = new Map(users.map((user) => [user.id, user]));
  const currentStaffIds = new Set(rows.map((row) => row.staffId));
  const answerMap = new Map<string, RegistrationTrackerAnswer>();
  const prefillQuestionIds = getPrefillQuestionIds(auditId);

  for (const answer of existingAnswers) {
    if (currentStaffIds.has(answer.residentId)) {
      answerMap.set(`${answer.residentId}::${answer.questionId}`, answer);
    }
  }

  for (const row of rows) {
    const user = userById.get(row.staffId);
    if (!user) continue;

    const prefill = buildPrefillValuesForStaff(user, auditId);

    for (const questionId of prefillQuestionIds) {
      const key = `${row.staffId}::${questionId}`;
      const existing = answerMap.get(key);
      const prefillValue = prefill[questionId] || "";

      if (!prefillValue) continue;

      if (existing && overwriteEmptyOnly && existing.value.trim()) {
        continue;
      }

      answerMap.set(key, {
        residentId: row.staffId,
        questionId,
        value: prefillValue,
      });
    }
  }

  return Array.from(answerMap.values());
}

function answersEqual(
  left: RegistrationTrackerAnswer[],
  right: RegistrationTrackerAnswer[]
): boolean {
  if (left.length !== right.length) return false;

  const leftMap = new Map(
    left.map((answer) => [`${answer.residentId}::${answer.questionId}`, answer.value])
  );

  for (const answer of right) {
    const key = `${answer.residentId}::${answer.questionId}`;
    if (leftMap.get(key) !== answer.value) {
      return false;
    }
  }

  return true;
}

export async function fetchRegistrationTrackerUsers(
  careHomeId: string,
  organizationId: string,
  auditId: RegistrationTrackerAuditId
): Promise<RegistrationTrackerUser[]> {
  let query = supabase
    .from("users")
    .select(
      "id, name, email, role, is_saas_admin, date_of_join, nmc_pin_number, nmc_renewal_fee_date, niscc_registration_number, niscc_registration_date, niscc_annual_fee_date"
    )
    .eq("active_organization_id", organizationId)
    .eq("active_care_home_id", careHomeId)
    .eq("is_onboarding_complete", true);

  if (auditId === REGISTRATION_TRACKER_AUDIT_IDS.NMC) {
    query = query.eq("role", "nurse");
  }

  const { data, error } = await query;
  if (error) throw error;

  const users = (data as RegistrationTrackerUser[]) || [];
  return filterUsersForRegistrationTracker(users, auditId);
}

export async function syncRegistrationTrackerState(
  careHomeId: string,
  organizationId: string,
  auditId: RegistrationTrackerAuditId,
  baseAnswers: RegistrationTrackerAnswer[],
  overwriteEmptyOnly = true
): Promise<{
  rows: RegistrationTrackerRow[];
  answers: RegistrationTrackerAnswer[];
  hasChanges: boolean;
  users: RegistrationTrackerUser[];
}> {
  const users = await fetchRegistrationTrackerUsers(
    careHomeId,
    organizationId,
    auditId
  );
  const rows = mapUsersToRegistrationRows(users);
  const answers = mergePrefillAnswers(
    rows,
    users,
    baseAnswers,
    auditId,
    overwriteEmptyOnly
  );

  return {
    rows,
    answers,
    hasChanges: !answersEqual(baseAnswers, answers),
    users,
  };
}

export function formatRegistrationDate(value: string): string {
  if (!value) return "—";
  try {
    const normalized = value.includes("T") ? value : `${value}T00:00:00`;
    const parsed = parseISO(normalized);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return format(parsed, "dd MMM yyyy");
  } catch {
    return value;
  }
}

export interface RegistrationTrackerSnapshot {
  trackerType: RegistrationTrackerType;
  rows: RegistrationTrackerRow[];
  columnQuestions: RegistrationTrackerQuestion[];
  answers: RegistrationTrackerAnswer[];
  totalStaff: number;
}

interface LegacyResidentSnapshot {
  id: string;
  firstName?: string;
  lastName?: string;
  roomNumber?: string;
  answers?: Array<{
    questionId: string;
    value?: string | null;
  }>;
}

/** Build table snapshot from saved history, including legacy sidebar-format completions. */
export function resolveRegistrationTrackerData(
  auditId: string,
  auditData: Record<string, unknown> | null | undefined
): RegistrationTrackerSnapshot | null {
  if (!isRegistrationTrackerAudit(auditId) || !auditData) {
    return null;
  }

  const stored = auditData.registrationTrackerData as
    | RegistrationTrackerSnapshot
    | undefined;
  if (stored?.rows?.length) {
    return stored;
  }

  const residents = (auditData.residents as LegacyResidentSnapshot[]) || [];
  if (residents.length === 0) {
    return stored ?? null;
  }

  const trackerType = getRegistrationTrackerType(auditId);
  const columnQuestions =
    (auditData.questions as RegistrationTrackerQuestion[]) ||
    getRegistrationTrackerQuestions(auditId);

  const rows = residents.map((resident) => ({
    staffId: resident.id,
    staffName:
      `${resident.firstName || ""} ${resident.lastName || ""}`.trim() ||
      "Staff",
    roleLabel: resident.roomNumber || "",
  }));

  const answerMap = new Map<string, RegistrationTrackerAnswer>();

  for (const answer of (auditData.answers as RegistrationTrackerAnswer[]) ||
    []) {
    if (answer.residentId && answer.questionId) {
      answerMap.set(`${answer.residentId}::${answer.questionId}`, answer);
    }
  }

  for (const resident of residents) {
    for (const answer of resident.answers || []) {
      if (!answer.questionId || !answer.value) continue;
      const key = `${resident.id}::${answer.questionId}`;
      if (!answerMap.has(key)) {
        answerMap.set(key, {
          residentId: resident.id,
          questionId: answer.questionId,
          value: answer.value,
        });
      }
    }
  }

  return {
    trackerType,
    rows,
    columnQuestions,
    answers: Array.from(answerMap.values()),
    totalStaff: rows.length,
  };
}
