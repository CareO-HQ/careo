import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildChecksIntervalAlertMessage,
  buildChecksIntervalAlertTitle,
  CHECKS_INTERVAL_OVERDUE_ALERT_TYPE,
  type CheckIntervalAlertMetadata,
} from "@/lib/checks-interval-alerts";

interface CheckConfigurationRow {
  id: string;
  resident_id: string;
  check_type: string;
  frequency_minutes: number | null;
  organization_id: string;
  care_home_id: string | null;
}

interface ResidentRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface RecordingRow {
  configuration_id: string | null;
  resident_id: string;
  check_type: string;
  record_date_time: string;
}

interface ExistingAlertRow {
  id: string;
  resident_id: string | null;
  metadata: {
    check_config_id?: string;
  } | null;
}

function getExpectedAuthHeader(): string | null {
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

function getResidentName(row: ResidentRow | undefined): string {
  if (!row) return "Resident";
  const fullName = [row.first_name ?? "", row.last_name ?? ""].filter(Boolean).join(" ");
  return fullName.length > 0 ? fullName : "Resident";
}

export async function GET(request: NextRequest) {
  try {
    const expectedAuthHeader = getExpectedAuthHeader();
    const providedAuthHeader = request.headers.get("authorization");
    if (!expectedAuthHeader || providedAuthHeader !== expectedAuthHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    const nowMs = Date.now();

    const { data: configsData, error: configsError } = await supabase
      .from("night_check_configurations")
      .select("id, resident_id, check_type, frequency_minutes, organization_id, care_home_id")
      .eq("is_active", true);
    if (configsError) {
      console.error("Cron checks interval config query failed:", configsError);
      return NextResponse.json({ error: "Failed to query check configurations" }, { status: 500 });
    }

    const configs = (configsData as CheckConfigurationRow[] | null)?.filter(
      (row) => typeof row.frequency_minutes === "number" && row.frequency_minutes > 0
    ) ?? [];
    if (configs.length === 0) {
      return NextResponse.json({ success: true, processed: 0, created: 0, resolved: 0 }, { status: 200 });
    }

    const residentIds = Array.from(new Set(configs.map((row) => row.resident_id)));

    const { data: residentData, error: residentError } = await supabase
      .from("residents")
      .select("id, first_name, last_name")
      .in("id", residentIds)
      .eq("is_active", true);
    if (residentError) {
      console.error("Cron checks interval resident query failed:", residentError);
      return NextResponse.json({ error: "Failed to query residents" }, { status: 500 });
    }
    const residentMap = new Map<string, ResidentRow>(
      ((residentData as ResidentRow[] | null) ?? []).map((row) => [row.id, row])
    );

    const { data: existingAlertsData, error: existingAlertsError } = await supabase
      .from("alerts")
      .select("id, resident_id, metadata")
      .eq("type", CHECKS_INTERVAL_OVERDUE_ALERT_TYPE)
      .eq("is_resolved", false)
      .in("resident_id", residentIds);
    if (existingAlertsError) {
      console.error("Cron checks interval existing alerts query failed:", existingAlertsError);
      return NextResponse.json({ error: "Failed to query existing alerts" }, { status: 500 });
    }

    const unresolvedAlertByConfigId = new Map<string, ExistingAlertRow>();
    for (const alert of (existingAlertsData as ExistingAlertRow[] | null) ?? []) {
      const configId = alert.metadata?.check_config_id;
      if (!configId || unresolvedAlertByConfigId.has(configId)) continue;
      unresolvedAlertByConfigId.set(configId, alert);
    }

    const { data: recordingsData, error: recordingsError } = await supabase
      .from("night_check_recordings")
      .select("configuration_id, resident_id, check_type, record_date_time")
      .in("resident_id", residentIds)
      .order("record_date_time", { ascending: false });
    if (recordingsError) {
      console.error("Cron checks interval recordings query failed:", recordingsError);
      return NextResponse.json({ error: "Failed to query check recordings" }, { status: 500 });
    }

    const latestByConfigId = new Map<string, string>();
    const latestByResidentAndType = new Map<string, string>();
    for (const recording of (recordingsData as RecordingRow[] | null) ?? []) {
      if (recording.configuration_id && !latestByConfigId.has(recording.configuration_id)) {
        latestByConfigId.set(recording.configuration_id, recording.record_date_time);
      }
      const residentTypeKey = `${recording.resident_id}:${recording.check_type}`;
      if (!latestByResidentAndType.has(residentTypeKey)) {
        latestByResidentAndType.set(residentTypeKey, recording.record_date_time);
      }
    }

    const alertsToResolveIds: string[] = [];
    const alertsToInsert: Array<{
      resident_id: string;
      organization_id: string;
      care_home_id: string | null;
      type: string;
      severity: "warning";
      title: string;
      message: string;
      metadata: CheckIntervalAlertMetadata;
    }> = [];

    for (const config of configs) {
      const frequencyMinutes = config.frequency_minutes;
      if (!frequencyMinutes) continue;

      const latestRecordedAt =
        latestByConfigId.get(config.id) ??
        latestByResidentAndType.get(`${config.resident_id}:${config.check_type}`) ??
        null;

      const unresolvedAlert = unresolvedAlertByConfigId.get(config.id);
      if (!latestRecordedAt) {
        if (!unresolvedAlert) {
          const residentName = getResidentName(residentMap.get(config.resident_id));
          const overdueByMinutes = frequencyMinutes;
          alertsToInsert.push({
            resident_id: config.resident_id,
            organization_id: config.organization_id,
            care_home_id: config.care_home_id,
            type: CHECKS_INTERVAL_OVERDUE_ALERT_TYPE,
            severity: "warning",
            title: buildChecksIntervalAlertTitle(config.check_type),
            message: buildChecksIntervalAlertMessage({
              residentName,
              checkType: config.check_type,
              frequencyMinutes,
              overdueByMinutes,
            }),
            metadata: {
              check_config_id: config.id,
              check_type: config.check_type,
              frequency_minutes: frequencyMinutes,
              last_recorded_at: null,
              generated_by: "checks-interval-alert-cron",
              overdue_by_minutes: overdueByMinutes,
            },
          });
        }
        continue;
      }

      const elapsedMinutes = Math.floor((nowMs - new Date(latestRecordedAt).getTime()) / 60000);
      const isOverdue = elapsedMinutes >= frequencyMinutes;
      if (isOverdue) {
        if (!unresolvedAlert) {
          const residentName = getResidentName(residentMap.get(config.resident_id));
          const overdueByMinutes = elapsedMinutes - frequencyMinutes;
          alertsToInsert.push({
            resident_id: config.resident_id,
            organization_id: config.organization_id,
            care_home_id: config.care_home_id,
            type: CHECKS_INTERVAL_OVERDUE_ALERT_TYPE,
            severity: "warning",
            title: buildChecksIntervalAlertTitle(config.check_type),
            message: buildChecksIntervalAlertMessage({
              residentName,
              checkType: config.check_type,
              frequencyMinutes,
              overdueByMinutes,
            }),
            metadata: {
              check_config_id: config.id,
              check_type: config.check_type,
              frequency_minutes: frequencyMinutes,
              last_recorded_at: latestRecordedAt,
              generated_by: "checks-interval-alert-cron",
              overdue_by_minutes: overdueByMinutes,
            },
          });
        }
        continue;
      }

      if (unresolvedAlert) {
        alertsToResolveIds.push(unresolvedAlert.id);
      }
    }

    let resolvedCount = 0;
    if (alertsToResolveIds.length > 0) {
      const { data: resolvedRows, error: resolveError } = await supabase
        .from("alerts")
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .in("id", alertsToResolveIds)
        .eq("is_resolved", false)
        .select("id");
      if (resolveError) {
        console.error("Cron checks interval resolve failed:", resolveError);
        return NextResponse.json({ error: "Failed to resolve checks alerts" }, { status: 500 });
      }
      resolvedCount = resolvedRows?.length ?? 0;
    }

    if (alertsToInsert.length > 0) {
      const { error: insertError } = await supabase.from("alerts").insert(alertsToInsert);
      if (insertError) {
        console.error("Cron checks interval insert failed:", insertError);
        return NextResponse.json({ error: "Failed to create checks alerts" }, { status: 500 });
      }
    }

    return NextResponse.json(
      {
        success: true,
        processed: configs.length,
        created: alertsToInsert.length,
        resolved: resolvedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Cron checks interval execution failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
