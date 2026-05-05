import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  computeFoodFluidComplianceInWindow,
  FOOD_FLUID_ALERT_WINDOW_MS,
  FOOD_FLUID_NOT_RECORDED_6H_ALERT_TYPE,
} from "@/lib/food-fluid-log-classification";

interface ResidentRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  organization_id: string;
  care_home_id: string | null;
}

interface FoodFluidLogRow {
  resident_id: string;
  timestamp: string;
  type_of_food_drink: string | null;
  amount_eaten: string | null;
  fluid_consumed_ml: number | null;
}

interface ExistingAlertRow {
  id: string;
  resident_id: string | null;
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

function buildAlertMessage(
  residentName: string,
  missingFood: boolean,
  missingFluid: boolean
): string {
  if (missingFood && missingFluid) {
    return `No qualifying food or fluid intake has been recorded for ${residentName} in the last 6 hours.`;
  }
  if (missingFood) {
    return `No qualifying food intake has been recorded for ${residentName} in the last 6 hours.`;
  }
  return `No qualifying fluid intake has been recorded for ${residentName} in the last 6 hours.`;
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
    const windowStartMs = nowMs - FOOD_FLUID_ALERT_WINDOW_MS;
    const windowStartIso = new Date(windowStartMs).toISOString();

    const { data: residentRows, error: residentsError } = await supabase
      .from("residents")
      .select("id, first_name, last_name, organization_id, care_home_id")
      .eq("is_active", true);

    if (residentsError) {
      console.error("Cron food-fluid resident query failed:", residentsError);
      return NextResponse.json({ error: "Failed to query residents" }, { status: 500 });
    }

    const residents = (residentRows as ResidentRow[] | null) ?? [];
    if (residents.length === 0) {
      return NextResponse.json(
        { success: true, processed: 0, created: 0, resolved: 0 },
        { status: 200 }
      );
    }

    const residentIds = residents.map((r) => r.id);

    const { data: existingAlertRows, error: existingAlertsError } = await supabase
      .from("alerts")
      .select("id, resident_id")
      .eq("type", FOOD_FLUID_NOT_RECORDED_6H_ALERT_TYPE)
      .eq("is_resolved", false)
      .in("resident_id", residentIds);

    if (existingAlertsError) {
      console.error("Cron food-fluid existing alert query failed:", existingAlertsError);
      return NextResponse.json({ error: "Failed to query existing alerts" }, { status: 500 });
    }

    const { data: logRows, error: logsError } = await supabase
      .from("food_fluid_logs")
      .select("resident_id, timestamp, type_of_food_drink, amount_eaten, fluid_consumed_ml")
      .in("resident_id", residentIds)
      .gte("timestamp", windowStartIso)
      .eq("is_archived", false);

    if (logsError) {
      console.error("Cron food-fluid logs query failed:", logsError);
      return NextResponse.json({ error: "Failed to query food_fluid_logs" }, { status: 500 });
    }

    const logsByResident = new Map<string, FoodFluidLogRow[]>();
    for (const row of (logRows as FoodFluidLogRow[] | null) ?? []) {
      const list = logsByResident.get(row.resident_id) ?? [];
      list.push(row);
      logsByResident.set(row.resident_id, list);
    }

    const complianceByResident = new Map<
      string,
      { foodOk: boolean; fluidOk: boolean }
    >();
    for (const id of residentIds) {
      const logs = logsByResident.get(id) ?? [];
      complianceByResident.set(id, computeFoodFluidComplianceInWindow(logs));
    }

    const unresolvedAlertByResident = new Map<string, ExistingAlertRow>();
    for (const alert of (existingAlertRows as ExistingAlertRow[] | null) ?? []) {
      if (alert.resident_id && !unresolvedAlertByResident.has(alert.resident_id)) {
        unresolvedAlertByResident.set(alert.resident_id, alert);
      }
    }

    const alertsToResolveIds: string[] = [];
    for (const alert of (existingAlertRows as ExistingAlertRow[] | null) ?? []) {
      if (!alert.resident_id) continue;
      const { foodOk, fluidOk } = complianceByResident.get(alert.resident_id) ?? {
        foodOk: false,
        fluidOk: false,
      };
      if (foodOk && fluidOk) {
        alertsToResolveIds.push(alert.id);
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
        console.error("Cron food-fluid alert resolve failed:", resolveError);
        return NextResponse.json({ error: "Failed to resolve alerts" }, { status: 500 });
      }

      resolvedCount = resolvedRows?.length ?? 0;
    }

    const alertsToInsert = residents
      .filter((resident) => {
        if (unresolvedAlertByResident.has(resident.id)) {
          return false;
        }
        const { foodOk, fluidOk } = complianceByResident.get(resident.id) ?? {
          foodOk: false,
          fluidOk: false,
        };
        return !foodOk || !fluidOk;
      })
      .map((resident) => {
        const fullName = [resident.first_name ?? "", resident.last_name ?? ""]
          .filter(Boolean)
          .join(" ");
        const residentName = fullName.length > 0 ? fullName : "Resident";
        const { foodOk, fluidOk } = complianceByResident.get(resident.id) ?? {
          foodOk: false,
          fluidOk: false,
        };
        const missingFood = !foodOk;
        const missingFluid = !fluidOk;

        return {
          resident_id: resident.id,
          organization_id: resident.organization_id,
          care_home_id: resident.care_home_id,
          type: FOOD_FLUID_NOT_RECORDED_6H_ALERT_TYPE,
          severity: "warning" as const,
          title: "Food and/or fluid not recorded in 6 hours",
          message: buildAlertMessage(residentName, missingFood, missingFluid),
          metadata: {
            generated_by: "food-fluid-six-hour-alert-cron",
            target_roles: ["nurse", "care_assistant"],
            window_hours: 6,
            missing_food: missingFood,
            missing_fluid: missingFluid,
          },
        };
      });

    if (alertsToInsert.length > 0) {
      const { error: insertError } = await supabase.from("alerts").insert(alertsToInsert);
      if (insertError) {
        console.error("Cron food-fluid alert insert failed:", insertError);
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
    console.error("Cron food-fluid execution failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
