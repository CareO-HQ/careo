import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface ResidentPhotoRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  organization_id: string;
  care_home_id: string | null;
  photo_updated_at: string;
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

function getSixMonthsAgoIso() {
  const date = new Date();
  date.setMonth(date.getMonth() - 6);
  return date.toISOString();
}

export async function GET(request: NextRequest) {
  try {
    const expectedAuthHeader = getExpectedAuthHeader();
    const providedAuthHeader = request.headers.get("authorization");

    if (!expectedAuthHeader || providedAuthHeader !== expectedAuthHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    const thresholdIso = getSixMonthsAgoIso();

    const { data: residentRows, error: residentsError } = await supabase
      .from("residents")
      .select("id, first_name, last_name, organization_id, care_home_id, photo_updated_at")
      .not("photo_updated_at", "is", null)
      .lte("photo_updated_at", thresholdIso)
      .eq("is_active", true);

    if (residentsError) {
      console.error("Cron resident photo reminder query failed:", residentsError);
      return NextResponse.json({ error: "Failed to query residents" }, { status: 500 });
    }

    const dueResidents = (residentRows as ResidentPhotoRow[] | null) ?? [];
    if (!dueResidents.length) {
      return NextResponse.json({ success: true, processed: 0, created: 0 }, { status: 200 });
    }

    const residentIds = dueResidents.map((resident) => resident.id);

    const { data: existingAlertRows, error: existingAlertsError } = await supabase
      .from("alerts")
      .select("id, resident_id")
      .eq("type", "resident_photo_refresh_required")
      .eq("is_resolved", false)
      .in("resident_id", residentIds);

    if (existingAlertsError) {
      console.error("Cron existing photo alert query failed:", existingAlertsError);
      return NextResponse.json({ error: "Failed to query existing alerts" }, { status: 500 });
    }

    const existingResidentIds = new Set(
      ((existingAlertRows as ExistingAlertRow[] | null) ?? [])
        .map((row) => row.resident_id)
        .filter((residentId): residentId is string => typeof residentId === "string" && residentId.length > 0)
    );

    const alertsToInsert = dueResidents
      .filter((resident) => !existingResidentIds.has(resident.id))
      .map((resident) => {
        const fullName = [resident.first_name ?? "", resident.last_name ?? ""].filter(Boolean).join(" ");
        const residentName = fullName.length > 0 ? fullName : "Resident";

        return {
          resident_id: resident.id,
          organization_id: resident.organization_id,
          care_home_id: resident.care_home_id,
          type: "resident_photo_refresh_required",
          severity: "warning",
          title: "Profile photo update due",
          message: `Please update ${residentName}'s profile photo. It has not been refreshed in the last 6 months.`,
          metadata: {
            photo_refresh_due: true,
            photo_updated_at: resident.photo_updated_at,
            generated_by: "resident-photo-refresh-cron",
          },
        };
      });

    if (alertsToInsert.length > 0) {
      const { error: insertError } = await supabase.from("alerts").insert(alertsToInsert);
      if (insertError) {
        console.error("Cron photo alert insert failed:", insertError);
        return NextResponse.json({ error: "Failed to create alerts" }, { status: 500 });
      }
    }

    return NextResponse.json(
      {
        success: true,
        processed: dueResidents.length,
        created: alertsToInsert.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Cron resident photo refresh execution failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
