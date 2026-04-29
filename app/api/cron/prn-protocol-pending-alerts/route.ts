import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  PRN_PROTOCOL_ALERT_WINDOW_MS,
  PRN_PROTOCOL_ALERT_WINDOW_HOURS,
  PRN_PROTOCOL_PENDING_12H_ALERT_TYPE,
} from "@/lib/medication-alerts";

interface PrnMedicationRow {
  id: string;
  resident_id: string;
  organization_id: string;
  created_at: string;
}

interface ResidentCareHomeRow {
  id: string;
  care_home_id: string | null;
}

interface PrnProtocolRow {
  medication_id: string | null;
}

interface ExistingAlertRow {
  id: string;
  metadata: {
    medication_id?: string;
  } | null;
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
    const thresholdIso = new Date(Date.now() - PRN_PROTOCOL_ALERT_WINDOW_MS).toISOString();

    const { data: medicationRows, error: medicationError } = await supabase
      .from("medications")
      .select("id, resident_id, organization_id, created_at")
      .eq("schedule_type", "PRN (As Needed)")
      .neq("status", "discontinued")
      .lte("created_at", thresholdIso);

    if (medicationError) {
      console.error("Cron PRN pending medications query failed:", medicationError);
      return NextResponse.json(
        {
          error: "Failed to query medications",
          detail: medicationError.message,
          code: medicationError.code,
        },
        { status: 500 }
      );
    }

    const medications = (medicationRows as PrnMedicationRow[] | null) ?? [];

    const residentIds = [...new Set(medications.map((m) => m.resident_id))];
    const careHomeByResidentId = new Map<string, string | null>();
    if (residentIds.length > 0) {
      const { data: residentRows, error: residentsError } = await supabase
        .from("residents")
        .select("id, care_home_id")
        .in("id", residentIds);

      if (residentsError) {
        console.error("Cron PRN pending residents query failed:", residentsError);
        return NextResponse.json(
          {
            error: "Failed to query residents for care_home_id",
            detail: residentsError.message,
            code: residentsError.code,
          },
          { status: 500 }
        );
      }

      for (const row of (residentRows as ResidentCareHomeRow[] | null) ?? []) {
        careHomeByResidentId.set(row.id, row.care_home_id ?? null);
      }
    }
    if (medications.length === 0) {
      return NextResponse.json(
        { success: true, checked: 0, created: 0, resolved: 0 },
        { status: 200 }
      );
    }

    const medicationIds = medications.map((m) => m.id);

    const { data: protocolRows, error: protocolError } = await supabase
      .from("prn_protocols")
      .select("medication_id")
      .in("medication_id", medicationIds)
      .neq("status", "archived");

    if (protocolError) {
      console.error("Cron PRN pending protocols query failed:", protocolError);
      return NextResponse.json({ error: "Failed to query PRN protocols" }, { status: 500 });
    }

    const protocolMedicationIds = new Set(
      ((protocolRows as PrnProtocolRow[] | null) ?? [])
        .map((row) => row.medication_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    );

    const { data: existingAlertRows, error: existingAlertError } = await supabase
      .from("alerts")
      .select("id, metadata")
      .eq("type", PRN_PROTOCOL_PENDING_12H_ALERT_TYPE)
      .eq("is_resolved", false);

    if (existingAlertError) {
      console.error("Cron PRN pending existing alert query failed:", existingAlertError);
      return NextResponse.json({ error: "Failed to query existing alerts" }, { status: 500 });
    }

    const unresolvedAlertByMedicationId = new Map<string, ExistingAlertRow>();
    for (const alert of (existingAlertRows as ExistingAlertRow[] | null) ?? []) {
      const medicationId = alert.metadata?.medication_id;
      if (medicationId && !unresolvedAlertByMedicationId.has(medicationId)) {
        unresolvedAlertByMedicationId.set(medicationId, alert);
      }
    }

    const alertsToResolve: string[] = [];
    for (const medicationId of protocolMedicationIds) {
      const existingAlert = unresolvedAlertByMedicationId.get(medicationId);
      if (existingAlert) {
        alertsToResolve.push(existingAlert.id);
      }
    }

    let resolvedCount = 0;
    if (alertsToResolve.length > 0) {
      const { data: resolvedRows, error: resolveError } = await supabase
        .from("alerts")
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolution_note: "Auto-resolved: PRN protocol submitted",
        })
        .in("id", alertsToResolve)
        .eq("is_resolved", false)
        .select("id");

      if (resolveError) {
        console.error("Cron PRN pending alert resolve failed:", resolveError);
        return NextResponse.json({ error: "Failed to resolve alerts" }, { status: 500 });
      }

      resolvedCount = resolvedRows?.length ?? 0;
    }

    const alertsToInsert = medications
      .filter((medication) => {
        if (protocolMedicationIds.has(medication.id)) {
          return false;
        }
        return !unresolvedAlertByMedicationId.has(medication.id);
      })
      .map((medication) => ({
        resident_id: medication.resident_id,
        organization_id: medication.organization_id,
        care_home_id: careHomeByResidentId.get(medication.resident_id) ?? null,
        type: PRN_PROTOCOL_PENDING_12H_ALERT_TYPE,
        severity: "warning" as const,
        title: "PRN protocol form pending",
        message: `A PRN medication has been active for more than ${PRN_PROTOCOL_ALERT_WINDOW_HOURS} hours without a completed PRN protocol form.`,
        metadata: {
          medication_id: medication.id,
          redirect_to: "medication_docs",
          generated_by: "prn-protocol-pending-alert-cron",
          target_roles: ["nurse"],
          window_hours: PRN_PROTOCOL_ALERT_WINDOW_HOURS,
        },
      }));

    if (alertsToInsert.length > 0) {
      const { error: insertError } = await supabase.from("alerts").insert(alertsToInsert);
      if (insertError) {
        console.error("Cron PRN pending alert insert failed:", insertError);
        return NextResponse.json({ error: "Failed to create alerts" }, { status: 500 });
      }
    }

    return NextResponse.json(
      {
        success: true,
        checked: medications.length,
        created: alertsToInsert.length,
        resolved: resolvedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Cron PRN pending execution failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
