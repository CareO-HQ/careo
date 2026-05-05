import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BOWEL_ALERT_TYPE = "bowel_not_recorded_3_days";
const BOWEL_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000;

interface ResidentRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  organization_id: string;
  care_home_id: string | null;
}

interface BowelEntryRow {
  resident_id: string;
  created_at: string;
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

export async function GET(request: NextRequest) {
  try {
    const expectedAuthHeader = getExpectedAuthHeader();
    const providedAuthHeader = request.headers.get("authorization");

    if (!expectedAuthHeader || providedAuthHeader !== expectedAuthHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    const nowMs = Date.now();

    const { data: residentRows, error: residentsError } = await supabase
      .from("residents")
      .select("id, first_name, last_name, organization_id, care_home_id")
      .eq("is_active", true);

    if (residentsError) {
      console.error("Cron bowel reminder resident query failed:", residentsError);
      return NextResponse.json({ error: "Failed to query residents" }, { status: 500 });
    }

    const residents = (residentRows as ResidentRow[] | null) ?? [];
    if (residents.length === 0) {
      return NextResponse.json(
        { success: true, processed: 0, created: 0, resolved: 0 },
        { status: 200 }
      );
    }

    const residentIds = residents.map((resident) => resident.id);

    const { data: existingAlertRows, error: existingAlertsError } = await supabase
      .from("alerts")
      .select("id, resident_id, created_at")
      .eq("type", BOWEL_ALERT_TYPE)
      .eq("is_resolved", false)
      .in("resident_id", residentIds);

    if (existingAlertsError) {
      console.error("Cron bowel reminder existing alert query failed:", existingAlertsError);
      return NextResponse.json({ error: "Failed to query existing alerts" }, { status: 500 });
    }

    const { data: bowelRows, error: bowelRowsError } = await supabase
      .from("continence_entries")
      .select("resident_id, created_at")
      .eq("entry_type", "bowel")
      .in("resident_id", residentIds)
      .order("created_at", { ascending: false });

    if (bowelRowsError) {
      console.error("Cron bowel reminder continence query failed:", bowelRowsError);
      return NextResponse.json({ error: "Failed to query bowel entries" }, { status: 500 });
    }

    const latestBowelByResident = new Map<string, string>();
    for (const bowelRow of (bowelRows as BowelEntryRow[] | null) ?? []) {
      if (!latestBowelByResident.has(bowelRow.resident_id)) {
        latestBowelByResident.set(bowelRow.resident_id, bowelRow.created_at);
      }
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
        const lastBowelCreatedAt = latestBowelByResident.get(alert.resident_id);
        if (!lastBowelCreatedAt) {
          return false;
        }
        return new Date(lastBowelCreatedAt).getTime() > new Date(alert.created_at).getTime();
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
        console.error("Cron bowel reminder alert resolve failed:", resolveError);
        return NextResponse.json({ error: "Failed to resolve alerts" }, { status: 500 });
      }

      resolvedCount = resolvedRows?.length ?? 0;
    }

    const alertsToInsert = residents
      .filter((resident) => {
        if (unresolvedAlertByResident.has(resident.id)) {
          return false;
        }
        const lastBowelCreatedAt = latestBowelByResident.get(resident.id);
        if (!lastBowelCreatedAt) {
          return true;
        }
        const inactivityDurationMs = nowMs - new Date(lastBowelCreatedAt).getTime();
        return inactivityDurationMs >= BOWEL_THRESHOLD_MS;
      })
      .map((resident) => {
        const fullName = [resident.first_name ?? "", resident.last_name ?? ""].filter(Boolean).join(" ");
        const residentName = fullName.length > 0 ? fullName : "Resident";
        const lastBowelAt = latestBowelByResident.get(resident.id) ?? null;

        return {
          resident_id: resident.id,
          organization_id: resident.organization_id,
          care_home_id: resident.care_home_id,
          type: BOWEL_ALERT_TYPE,
          severity: "warning",
          title: "No bowel recorded for 3 days",
          message: `No bowel entry has been recorded for ${residentName} in the last 3 days.`,
          metadata: {
            generated_by: "bowel-three-day-alert-cron",
            threshold_days: 3,
            last_bowel_recorded_at: lastBowelAt,
            target_roles: ["nurse"],
          },
        };
      });

    if (alertsToInsert.length > 0) {
      const { error: insertError } = await supabase.from("alerts").insert(alertsToInsert);
      if (insertError) {
        console.error("Cron bowel reminder alert insert failed:", insertError);
        return NextResponse.json({ error: "Failed to create alerts" }, { status: 500 });
      }
    }

    return NextResponse.json(
      {
        success: true,
        processed: residents.length,
        created: alertsToInsert.length,
        resolved: resolvedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Cron bowel reminder execution failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
