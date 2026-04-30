import type { SupabaseClient } from "@supabase/supabase-js";

const MEDICATION_ALERT_TARGET_ROLES = ["nurse"] as const;
const OVERDUE_TRIGGER_MS = 60 * 60 * 1000;
const OVERDUE_ALERT_TTL_MS = 6 * 60 * 60 * 1000;
const OVERDUE_ALERT_MAX_AGE_MS = OVERDUE_TRIGGER_MS + OVERDUE_ALERT_TTL_MS;

interface MedicationNameRow {
  name: string;
}

interface ResidentJoinRow {
  first_name: string | null;
  last_name: string | null;
  organization_id: string;
}

interface MedicationIntakeCronRow {
  id: string;
  resident_id: string;
  scheduled_time: string;
  organization_id: string;
  care_home_id: string | null;
  medication: MedicationNameRow | MedicationNameRow[] | null;
  resident: ResidentJoinRow | ResidentJoinRow[] | null;
}

interface AlertMetadataRow {
  id: string;
  metadata: { intake_id?: string } | null;
}

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

async function findUnresolvedMedicationAlertForIntake(
  supabase: SupabaseClient,
  residentId: string,
  intakeId: string
): Promise<AlertMetadataRow | null> {
  const { data: allAlerts, error } = await supabase
    .from("alerts")
    .select("id, metadata")
    .eq("type", "medication")
    .eq("resident_id", residentId)
    .eq("is_resolved", false);

  if (error) {
    console.error("[medication-missed-alerts-cron] find alert:", error);
    return null;
  }

  const found = (allAlerts as AlertMetadataRow[] | null)?.find(
    (a) => a.metadata?.intake_id === intakeId
  );
  return found ?? null;
}

async function deleteUnresolvedMedicationAlertForIntake(
  supabase: SupabaseClient,
  residentId: string,
  intakeId: string
): Promise<boolean> {
  const existing = await findUnresolvedMedicationAlertForIntake(supabase, residentId, intakeId);
  if (!existing) {
    return true;
  }

  const { error } = await supabase.from("alerts").delete().eq("id", existing.id);
  if (error) {
    console.error("[medication-missed-alerts-cron] delete alert:", error);
    return false;
  }

  return true;
}

async function upsertMedicationAlert(
  supabase: SupabaseClient,
  intake: MedicationIntakeCronRow,
  payload: {
    severity: "critical" | "warning" | "info";
    title: string;
    message: string;
  },
  nowIso: string
): Promise<boolean> {
  const med = unwrapOne(intake.medication);
  const res = unwrapOne(intake.resident);
  if (!med?.name || !res) {
    return false;
  }

  const organizationId = intake.organization_id || res.organization_id;
  const existing = await findUnresolvedMedicationAlertForIntake(
    supabase,
    intake.resident_id,
    intake.id
  );

  const alertData = {
    resident_id: intake.resident_id,
    type: "medication" as const,
    severity: payload.severity,
    title: payload.title,
    message: payload.message,
    organization_id: organizationId,
    care_home_id: intake.care_home_id,
    target_roles: [...MEDICATION_ALERT_TARGET_ROLES],
    metadata: { intake_id: intake.id, scheduled_time: intake.scheduled_time },
    updated_at: nowIso,
  };

  if (existing) {
    const { error } = await supabase.from("alerts").update(alertData).eq("id", existing.id);
    if (error) {
      console.error("[medication-missed-alerts-cron] update alert:", error);
      return false;
    }
    return true;
  }

  const { error } = await supabase.from("alerts").insert(alertData);
  if (error) {
    console.error("[medication-missed-alerts-cron] insert alert:", error);
    return false;
  }
  return true;
}

/**
 * Creates/updates medication alerts for intakes still scheduled:
 * - Info: due within the next 30 minutes (optional reminder).
 * - Critical: scheduled_time is at least 60 minutes in the past (missed window).
 */
export async function runMedicationMissedAlertsCron(
  supabase: SupabaseClient
): Promise<{ pre_alerts: number; overdue_alerts: number }> {
  const now = new Date();
  const nowIso = now.toISOString();
  const thirtyMinsFromNow = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
  const oneHourAgo = new Date(now.getTime() - OVERDUE_TRIGGER_MS).toISOString();

  const selectWithJoins =
    "id, resident_id, scheduled_time, organization_id, care_home_id, medication:medication_id(name), resident:resident_id(first_name, last_name, organization_id)";

  const { data: dueSoon, error: dueSoonError } = await supabase
    .from("medication_intakes")
    .select(selectWithJoins)
    .eq("status", "scheduled")
    .lte("scheduled_time", thirtyMinsFromNow)
    .gt("scheduled_time", nowIso);

  if (dueSoonError) {
    throw new Error(`dueSoon query: ${dueSoonError.message}`);
  }

  let preAlertsUpdated = 0;
  for (const raw of dueSoon ?? []) {
    const intake = raw as MedicationIntakeCronRow;
    const scheduledTime = new Date(intake.scheduled_time);
    const remainingMins = Math.round((scheduledTime.getTime() - now.getTime()) / 60_000);
    const med = unwrapOne(intake.medication);
    const res = unwrapOne(intake.resident);
    if (!med?.name || !res) continue;

    const ok = await upsertMedicationAlert(
      supabase,
      intake,
      {
        severity: "info",
        title: "Medication Due Soon",
        message: `${med.name} for ${res.first_name ?? ""} ${res.last_name ?? ""} - Time left to administer: ${remainingMins} minutes`,
      },
      nowIso
    );
    if (ok) preAlertsUpdated += 1;
  }

  const { data: overdue, error: overdueError } = await supabase
    .from("medication_intakes")
    .select(selectWithJoins)
    .eq("status", "scheduled")
    .lt("scheduled_time", oneHourAgo);

  if (overdueError) {
    throw new Error(`overdue query: ${overdueError.message}`);
  }

  let overdueAlertsUpdated = 0;
  for (const raw of overdue ?? []) {
    const intake = raw as MedicationIntakeCronRow;
    const scheduledTime = new Date(intake.scheduled_time);
    const elapsedSinceScheduledMs = now.getTime() - scheduledTime.getTime();
    if (elapsedSinceScheduledMs >= OVERDUE_ALERT_MAX_AGE_MS) {
      const deleted = await deleteUnresolvedMedicationAlertForIntake(
        supabase,
        intake.resident_id,
        intake.id
      );
      if (!deleted) {
        continue;
      }
      continue;
    }

    const overdueMins = Math.round((now.getTime() - scheduledTime.getTime()) / 60_000);
    const med = unwrapOne(intake.medication);
    const res = unwrapOne(intake.resident);
    if (!med?.name || !res) continue;

    const ok = await upsertMedicationAlert(
      supabase,
      intake,
      {
        severity: "critical",
        title: "Medication Overdue",
        message: `${med.name} for ${res.first_name ?? ""} ${res.last_name ?? ""} - Overdue by: ${overdueMins} minutes`,
      },
      nowIso
    );
    if (ok) overdueAlertsUpdated += 1;
  }

  return { pre_alerts: preAlertsUpdated, overdue_alerts: overdueAlertsUpdated };
}
