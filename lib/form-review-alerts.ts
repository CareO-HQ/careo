import type { SupabaseClient } from "@supabase/supabase-js";
import { getUKTodayDate } from "@/lib/date-utils";

export const FORM_REVIEW_DUE_TOMORROW_ALERT_TYPE = "form_review_due_tomorrow";

type ReviewDateSource =
  | { kind: "column"; column: "next_review_date" }
  | {
      kind: "columnOrJson";
      column: "next_review_date";
      fallbackColumn: "assessment_data" | "kitchen_review";
      fallbackKey: "nextReviewDate";
    }
  | {
      kind: "json";
      column:
        | "assessment_data"
        | "assessment_details"
        | "risk_factors"
        | "decision"
        | "scale_items"
        | "assessment_entries"
        | "kitchen_review";
      key: "nextReviewDate";
    };

interface FormReviewSource {
  table: string;
  formName: string;
  dateSource: ReviewDateSource;
}

interface FormReviewCandidate {
  formTable: string;
  formName: string;
  formRecordId: string;
  residentId: string;
  organizationId: string;
  nextReviewDate: string;
}

interface ResidentRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean | null;
  care_home_id: string | null;
}

interface ExistingAlertRow {
  id: string;
  resident_id: string | null;
  metadata: {
    form_table?: string;
    form_record_id?: string;
  } | null;
}

function parseDateOrNull(raw: unknown): Date | null {
  if (typeof raw !== "string" || raw.length === 0) {
    return null;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDiaryTimestamp(row: Record<string, unknown>): number {
  const createdAt = parseDateOrNull(row.created_at);
  if (createdAt) {
    return createdAt.getTime();
  }

  const dateRaw = typeof row.date === "string" ? row.date : "";
  const timeRaw = typeof row.time === "string" ? row.time : "";
  if (dateRaw.length > 0) {
    const normalizedTime = timeRaw.length > 0 ? timeRaw : "00:00";
    const fallback = new Date(`${dateRaw}T${normalizedTime}:00`);
    if (!Number.isNaN(fallback.getTime())) {
      return fallback.getTime();
    }
  }

  return Number.NEGATIVE_INFINITY;
}

function latestKeyWorkerDiaryRows(
  rows: Record<string, unknown>[]
): Record<string, unknown>[] {
  const latestByResident = new Map<string, Record<string, unknown>>();

  for (const row of rows) {
    const residentId = typeof row.resident_id === "string" ? row.resident_id : null;
    if (!residentId) {
      continue;
    }

    const existing = latestByResident.get(residentId);
    if (!existing) {
      latestByResident.set(residentId, row);
      continue;
    }

    if (parseDiaryTimestamp(row) > parseDiaryTimestamp(existing)) {
      latestByResident.set(residentId, row);
    }
  }

  return [...latestByResident.values()];
}

function isMissingStatusColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) {
    return false;
  }
  const message = error.message?.toLowerCase() ?? "";
  return (
    (error.code === "PGRST204" || error.code === "42703") &&
    message.includes("status")
  );
}

const JSON_REVIEW_DATE_COLUMNS = [
  "assessment_data",
  "assessment_details",
  "risk_factors",
  "decision",
  "scale_items",
  "assessment_entries",
  "kitchen_review",
] as const;

const FORM_REVIEW_SOURCES: FormReviewSource[] = [
  { table: "abbey_pain_assessments", formName: "Abbey Pain Assessment", dateSource: { kind: "json", column: "assessment_data", key: "nextReviewDate" } },
  { table: "bedrail_consents", formName: "Bedrail Consent", dateSource: { kind: "json", column: "assessment_data", key: "nextReviewDate" } },
  { table: "bedrails_risk_assessments", formName: "Bed Rails Risk Assessment", dateSource: { kind: "json", column: "decision", key: "nextReviewDate" } },
  { table: "bladder_bowel_assessments", formName: "Bladder and Bowel Assessment", dateSource: { kind: "column", column: "next_review_date" } },
  { table: "braden_risk_assessments", formName: "Braden Risk Assessment", dateSource: { kind: "json", column: "assessment_details", key: "nextReviewDate" } },
  { table: "capacity_consents", formName: "Capacity Consent", dateSource: { kind: "json", column: "assessment_data", key: "nextReviewDate" } },
  { table: "choking_risk_assessments", formName: "Choking Risk Assessment", dateSource: { kind: "json", column: "risk_factors", key: "nextReviewDate" } },
  { table: "cornell_depression_scales", formName: "Cornell Depression Scale", dateSource: { kind: "json", column: "scale_items", key: "nextReviewDate" } },
  { table: "dependency_assessments", formName: "Dependency Assessment", dateSource: { kind: "json", column: "assessment_details", key: "nextReviewDate" } },
  {
    table: "diet_notifications",
    formName: "Diet Notification",
    dateSource: {
      kind: "columnOrJson",
      column: "next_review_date",
      fallbackColumn: "kitchen_review",
      fallbackKey: "nextReviewDate",
    },
  },
  { table: "fall_risk_assessments", formName: "Fall Risk Assessment", dateSource: { kind: "json", column: "assessment_details", key: "nextReviewDate" } },
  {
    table: "general_risk_assessments",
    formName: "General Risk Assessment",
    dateSource: {
      kind: "columnOrJson",
      column: "next_review_date",
      fallbackColumn: "assessment_data",
      fallbackKey: "nextReviewDate",
    },
  },
  { table: "moving_handling_assessments", formName: "Moving and Handling Assessment", dateSource: { kind: "json", column: "risk_factors", key: "nextReviewDate" } },
  { table: "must_assessments", formName: "MUST Assessment", dateSource: { kind: "column", column: "next_review_date" } },
  { table: "nutritional_assessments", formName: "Nutritional Assessment", dateSource: { kind: "json", column: "assessment_details", key: "nextReviewDate" } },
  { table: "oral_assessments", formName: "Oral Assessment", dateSource: { kind: "json", column: "assessment_details", key: "nextReviewDate" } },
  { table: "pain_assessments", formName: "Pain Assessment", dateSource: { kind: "json", column: "assessment_entries", key: "nextReviewDate" } },
  { table: "peeps", formName: "PEEP", dateSource: { kind: "json", column: "assessment_data", key: "nextReviewDate" } },
  { table: "personal_profiles", formName: "Personal Profile", dateSource: { kind: "column", column: "next_review_date" } },
  { table: "resident_valuables_assessments", formName: "Resident Valuables", dateSource: { kind: "column", column: "next_review_date" } },
  { table: "restraints_consents", formName: "Restraints Consent", dateSource: { kind: "json", column: "assessment_data", key: "nextReviewDate" } },
  { table: "smoking_risk_assessments", formName: "Smoking Risk Assessment", dateSource: { kind: "column", column: "next_review_date" } },
  { table: "specimen_records", formName: "Specimen Record Log", dateSource: { kind: "column", column: "next_review_date" } },
  { table: "key_worker_diary", formName: "Key Worker Diary", dateSource: { kind: "column", column: "next_review_date" } },
];

function addCalendarDays(dateKey: string, delta: number): string {
  const parts = dateKey.split("-").map(Number);
  const year = parts[0] ?? 1970;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  const nextDate = new Date(Date.UTC(year, month - 1, day + delta));
  return nextDate.toISOString().slice(0, 10);
}

function readReviewDate(
  row: Record<string, unknown>,
  source: ReviewDateSource
): string | null {
  if (source.kind === "column") {
    const value = row[source.column];
    return typeof value === "string" && value.length > 0 ? value : null;
  }

  if (source.kind === "columnOrJson") {
    const columnValue = row[source.column];
    if (typeof columnValue === "string" && columnValue.length > 0) {
      return columnValue;
    }

    const container = row[source.fallbackColumn];
    if (!container || typeof container !== "object") {
      return null;
    }
    const fallbackValue = (container as Record<string, unknown>)[source.fallbackKey];
    return typeof fallbackValue === "string" && fallbackValue.length > 0 ? fallbackValue : null;
  }

  const container = row[source.column];
  if (!container || typeof container !== "object") {
    return null;
  }
  const dateValue = (container as Record<string, unknown>)[source.key];
  return typeof dateValue === "string" && dateValue.length > 0 ? dateValue : null;
}

function readReviewDateFromAnySource(
  row: Record<string, unknown>,
  source: ReviewDateSource
): string | null {
  const preferred = readReviewDate(row, source);
  if (preferred) {
    return preferred;
  }

  const directColumnValue = row.next_review_date;
  if (typeof directColumnValue === "string" && directColumnValue.length > 0) {
    return directColumnValue;
  }

  for (const jsonColumn of JSON_REVIEW_DATE_COLUMNS) {
    const container = row[jsonColumn];
    if (!container || typeof container !== "object") {
      continue;
    }
    const nextReviewDate = (container as Record<string, unknown>).nextReviewDate;
    if (typeof nextReviewDate === "string" && nextReviewDate.length > 0) {
      return nextReviewDate;
    }
  }

  return null;
}

function residentName(row: ResidentRow | undefined): string {
  if (!row) {
    return "Resident";
  }
  const fullName = [row.first_name ?? "", row.last_name ?? ""].filter(Boolean).join(" ");
  return fullName.length > 0 ? fullName : "Resident";
}

function candidateKey(formTable: string, formRecordId: string): string {
  return `${formTable}:${formRecordId}`;
}

export async function runFormReviewDueTomorrowAlerts(
  supabase: SupabaseClient
): Promise<{ processed: number; dueTomorrow: number; created: number; resolved: number }> {
  const today = getUKTodayDate();
  const tomorrow = addCalendarDays(today, 1);
  const candidates: FormReviewCandidate[] = [];

  for (const source of FORM_REVIEW_SOURCES) {
    let { data, error } = await supabase
      .from(source.table)
      .select("*")
      .neq("status", "archived");

    if (isMissingStatusColumnError(error)) {
      const fallbackQuery = await supabase.from(source.table).select("*");
      data = fallbackQuery.data;
      error = fallbackQuery.error;
    }

    if (error) {
      console.error(`Form review alert query failed for table ${source.table}:`, error);
      continue;
    }

    const sourceRows = (data as Record<string, unknown>[] | null) ?? [];
    const rowsToEvaluate =
      source.table === "key_worker_diary"
        ? latestKeyWorkerDiaryRows(sourceRows)
        : sourceRows;

    for (const row of rowsToEvaluate) {
      const formRecordId = typeof row.id === "string" ? row.id : null;
      const residentId = typeof row.resident_id === "string" ? row.resident_id : null;
      const organizationId = typeof row.organization_id === "string" ? row.organization_id : null;
      const nextReviewDate = readReviewDateFromAnySource(row, source.dateSource);

      if (!formRecordId || !residentId || !organizationId || !nextReviewDate) {
        continue;
      }

      if (nextReviewDate !== tomorrow) {
        continue;
      }

      candidates.push({
        formTable: source.table,
        formName: source.formName,
        formRecordId,
        residentId,
        organizationId,
        nextReviewDate,
      });
    }
  }

  if (candidates.length === 0) {
    return { processed: 0, dueTomorrow: 0, created: 0, resolved: 0 };
  }

  const residentIds = [...new Set(candidates.map((candidate) => candidate.residentId))];
  const { data: residentRows, error: residentsError } = await supabase
    .from("residents")
    .select("id, first_name, last_name, is_active, care_home_id")
    .in("id", residentIds);

  if (residentsError) {
    throw new Error(`Failed to query residents for form review alerts: ${residentsError.message}`);
  }

  const residentMap = new Map<string, ResidentRow>(
    ((residentRows as ResidentRow[] | null) ?? []).map((row) => [row.id, row])
  );
  const activeCandidates = candidates.filter((candidate) => {
    const resident = residentMap.get(candidate.residentId);
    return resident?.is_active !== false;
  });

  if (activeCandidates.length === 0) {
    return { processed: 0, dueTomorrow: 0, created: 0, resolved: 0 };
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("alerts")
    .select("id, resident_id, metadata")
    .eq("type", FORM_REVIEW_DUE_TOMORROW_ALERT_TYPE)
    .eq("is_resolved", false)
    .in("resident_id", residentIds);

  if (existingError) {
    throw new Error(`Failed to query existing form review alerts: ${existingError.message}`);
  }

  const existingAlerts = (existingRows as ExistingAlertRow[] | null) ?? [];
  const existingByKey = new Map<string, ExistingAlertRow>();
  for (const alert of existingAlerts) {
    const formTable = alert.metadata?.form_table;
    const formRecordId = alert.metadata?.form_record_id;
    if (!formTable || !formRecordId) {
      continue;
    }
    const key = candidateKey(formTable, formRecordId);
    if (!existingByKey.has(key)) {
      existingByKey.set(key, alert);
    }
  }

  const dueSet = new Set(activeCandidates.map((candidate) => candidateKey(candidate.formTable, candidate.formRecordId)));
  const staleAlertIds = existingAlerts
    .filter((alert) => {
      const formTable = alert.metadata?.form_table;
      const formRecordId = alert.metadata?.form_record_id;
      if (!formTable || !formRecordId) {
        return true;
      }
      return !dueSet.has(candidateKey(formTable, formRecordId));
    })
    .map((alert) => alert.id);

  let resolved = 0;
  if (staleAlertIds.length > 0) {
    const { data: resolvedRows, error: resolveError } = await supabase
      .from("alerts")
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
      })
      .in("id", staleAlertIds)
      .eq("is_resolved", false)
      .select("id");

    if (resolveError) {
      throw new Error(`Failed to resolve stale form review alerts: ${resolveError.message}`);
    }
    resolved = resolvedRows?.length ?? 0;
  }

  const inserts = activeCandidates
    .filter((candidate) => !existingByKey.has(candidateKey(candidate.formTable, candidate.formRecordId)))
    .map((candidate) => {
      const resident = residentMap.get(candidate.residentId);
      const fullName = residentName(resident);
      return {
        resident_id: candidate.residentId,
        organization_id: candidate.organizationId,
        care_home_id: resident?.care_home_id ?? null,
        type: FORM_REVIEW_DUE_TOMORROW_ALERT_TYPE,
        severity: "warning" as const,
        title: "Form review due tomorrow",
        message: `${candidate.formName} review is due tomorrow for ${fullName} (review date ${candidate.nextReviewDate}).`,
        metadata: {
          form_table: candidate.formTable,
          form_record_id: candidate.formRecordId,
          form_name: candidate.formName,
          next_review_date: candidate.nextReviewDate,
          lead_time_days: 1,
          generated_by: "form-review-alerts-cron",
          target_roles: ["nurse"],
        },
      };
    });

  if (inserts.length > 0) {
    const { error: insertError } = await supabase.from("alerts").insert(inserts);
    if (insertError) {
      throw new Error(`Failed to create form review alerts: ${insertError.message}`);
    }
  }

  return {
    processed: activeCandidates.length,
    dueTomorrow: activeCandidates.length,
    created: inserts.length,
    resolved,
  };
}
