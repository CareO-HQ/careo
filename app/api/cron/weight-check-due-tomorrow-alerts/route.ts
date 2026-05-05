import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const WEIGHT_CHECK_ALERT_TYPE = "weight_check_due_tomorrow";
const DAY_MS = 24 * 60 * 60 * 1000;

interface ResidentRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  organization_id: string;
  care_home_id: string | null;
  weight_check_frequency: "weekly" | "monthly" | "as-needed" | null;
}

interface WeightRecordRow {
  resident_id: string;
  measurement_date: string;
}

interface ExistingAlertRow {
  id: string;
  resident_id: string | null;
  created_at: string;
}

function getExpectedAuthHeader() {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return null;
  }
  return `Bearer ${secret}`;
}

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables for cron route");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getDaysToAdd(frequency: ResidentRow["weight_check_frequency"]): number | null {
  if (frequency === "weekly") {
    return 7;
  }
  if (frequency === "monthly") {
    return 30;
  }
  return null;
}

function toUtcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(dateIso: string, daysToAdd: number): string {
  const date = new Date(`${dateIso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + daysToAdd);
  return toUtcDateKey(date);
}

export async function GET(request: NextRequest) {
  try {
    const expectedAuthHeader = getExpectedAuthHeader();
    const providedAuthHeader = request.headers.get("authorization");

    if (!expectedAuthHeader || providedAuthHeader !== expectedAuthHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();

    const { data: residentRows, error: residentsError } = await supabase
      .from("residents")
      .select("id, first_name, last_name, organization_id, care_home_id, weight_check_frequency")
      .eq("is_active", true);

    if (residentsError) {
      console.error("Cron weight-check reminder resident query failed:", residentsError);
      return NextResponse.json({ error: "Failed to query residents" }, { status: 500 });
    }

    const residents = (residentRows as ResidentRow[] | null) ?? [];
    if (residents.length === 0) {
      return NextResponse.json(
        { success: true, processed: 0, dueTomorrow: 0, created: 0, resolved: 0 },
        { status: 200 }
      );
    }

    const residentIds = residents.map((resident) => resident.id);

    const { data: weightRows, error: weightsError } = await supabase
      .from("weight_records")
      .select("resident_id, measurement_date")
      .in("resident_id", residentIds)
      .order("measurement_date", { ascending: false });

    if (weightsError) {
      console.error("Cron weight-check reminder weight query failed:", weightsError);
      return NextResponse.json({ error: "Failed to query weight records" }, { status: 500 });
    }

    const latestWeightByResident = new Map<string, string>();
    for (const weightRow of (weightRows as WeightRecordRow[] | null) ?? []) {
      if (!latestWeightByResident.has(weightRow.resident_id)) {
        latestWeightByResident.set(weightRow.resident_id, weightRow.measurement_date);
      }
    }

    const { data: existingAlertRows, error: existingAlertsError } = await supabase
      .from("alerts")
      .select("id, resident_id, created_at")
      .eq("type", WEIGHT_CHECK_ALERT_TYPE)
      .eq("is_resolved", false)
      .in("resident_id", residentIds);

    if (existingAlertsError) {
      console.error("Cron weight-check reminder existing alert query failed:", existingAlertsError);
      return NextResponse.json({ error: "Failed to query existing alerts" }, { status: 500 });
    }

    const existingAlerts = (existingAlertRows as ExistingAlertRow[] | null) ?? [];
    const unresolvedAlertByResident = new Map<string, ExistingAlertRow>();
    for (const alert of existingAlerts) {
      if (!alert.resident_id || unresolvedAlertByResident.has(alert.resident_id)) {
        continue;
      }
      unresolvedAlertByResident.set(alert.resident_id, alert);
    }

    const alertsToResolve = existingAlerts
      .filter((alert) => {
        if (!alert.resident_id) {
          return false;
        }
        const latestWeightDate = latestWeightByResident.get(alert.resident_id);
        if (!latestWeightDate) {
          return false;
        }
        const latestWeightMs = new Date(`${latestWeightDate}T23:59:59.999Z`).getTime();
        const alertCreatedMs = new Date(alert.created_at).getTime();
        return latestWeightMs > alertCreatedMs;
      })
      .map((alert) => alert.id);

    let resolvedCount = 0;
    if (alertsToResolve.length > 0) {
      const { data: resolvedRows, error: resolveError } = await supabase
        .from("alerts")
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .in("id", alertsToResolve)
        .eq("is_resolved", false)
        .select("id");

      if (resolveError) {
        console.error("Cron weight-check reminder alert resolve failed:", resolveError);
        return NextResponse.json({ error: "Failed to resolve alerts" }, { status: 500 });
      }

      resolvedCount = resolvedRows?.length ?? 0;
    }

    const tomorrow = new Date();
    tomorrow.setUTCHours(0, 0, 0, 0);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowKey = toUtcDateKey(tomorrow);

    const dueTomorrowResidents = residents.filter((resident) => {
      if (unresolvedAlertByResident.has(resident.id)) {
        return false;
      }
      const frequencyDays = getDaysToAdd(resident.weight_check_frequency);
      if (!frequencyDays) {
        return false;
      }
      const lastMeasurementDate = latestWeightByResident.get(resident.id);
      if (!lastMeasurementDate) {
        return false;
      }
      const nextDueDate = addDays(lastMeasurementDate, frequencyDays);
      return nextDueDate === tomorrowKey;
    });

    const alertsToInsert = dueTomorrowResidents.map((resident) => {
      const fullName = [resident.first_name ?? "", resident.last_name ?? ""].filter(Boolean).join(" ");
      const residentName = fullName.length > 0 ? fullName : "Resident";
      const frequency = resident.weight_check_frequency === "weekly" ? "weekly" : "monthly";
      const latestMeasurementDate = latestWeightByResident.get(resident.id) ?? null;
      const nextDueDate =
        latestMeasurementDate !== null ? addDays(latestMeasurementDate, getDaysToAdd(frequency) ?? 0) : null;

      return {
        resident_id: resident.id,
        organization_id: resident.organization_id,
        care_home_id: resident.care_home_id,
        type: WEIGHT_CHECK_ALERT_TYPE,
        severity: "warning",
        title: "Weight check due tomorrow",
        message: `Weight check is due tomorrow for ${residentName}.`,
        metadata: {
          generated_by: "weight-check-due-tomorrow-cron",
          target_roles: ["nurse", "care_assistant"],
          frequency,
          last_measurement_date: latestMeasurementDate,
          next_due_date: nextDueDate,
          lead_time_days: 1,
        },
      };
    });

    if (alertsToInsert.length > 0) {
      const { error: insertError } = await supabase.from("alerts").insert(alertsToInsert);
      if (insertError) {
        console.error("Cron weight-check reminder alert insert failed:", insertError);
        return NextResponse.json({ error: "Failed to create alerts" }, { status: 500 });
      }
    }

    return NextResponse.json(
      {
        success: true,
        processed: residents.length,
        dueTomorrow: dueTomorrowResidents.length,
        created: alertsToInsert.length,
        resolved: resolvedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Cron weight-check reminder execution failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
