import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getExpectedAuthHeader() {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null;
  return `Bearer ${secret}`;
}

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Missing env vars");
  return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET(request: NextRequest) {
  try {
    const expectedAuthHeader = getExpectedAuthHeader();
    const providedAuthHeader = request.headers.get("authorization");

    if (!expectedAuthHeader || providedAuthHeader !== expectedAuthHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    
    const { data: configs, error } = await supabase
      .from("night_check_configurations")
      .select("id, start_time, end_time, created_at, is_active")
      .eq("is_active", true);

    if (error) {
      console.error("Cron check cleanup query failed:", error);
      return NextResponse.json({ error: "Failed to query configs" }, { status: 500 });
    }

    if (!configs || !configs.length) {
      return NextResponse.json({ success: true, deleted: 0 }, { status: 200 });
    }

    const ukNowStr = new Date().toLocaleString('en-US', { timeZone: 'Europe/London' });
    const ukNow = new Date(ukNowStr);
    const idsToDelete: string[] = [];

    for (const config of configs) {
      if (!config.start_time || !config.end_time) continue;
      
      const createdAt = new Date(config.created_at);
      const ukCreatedAtStr = createdAt.toLocaleString('en-US', { timeZone: 'Europe/London' });
      const ukCreatedAt = new Date(ukCreatedAtStr);
      
      const [endHours, endMinutes] = config.end_time.split(':').map(Number);
      const [startHours, startMinutes] = config.start_time.split(':').map(Number);

      let expirationDate = new Date(ukCreatedAt);
      expirationDate.setHours(endHours, endMinutes, 0, 0);

      if (startHours > endHours) {
          // Night shift crossing midnight
          if (ukCreatedAt.getHours() >= 12) {
              expirationDate.setDate(expirationDate.getDate() + 1);
          }
      }

      if (ukNow > expirationDate) {
          idsToDelete.push(config.id);
      }
    }

    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("night_check_configurations")
        .delete()
        .in("id", idsToDelete);

      if (deleteError) {
        console.error("Cron check cleanup delete failed:", deleteError);
        return NextResponse.json({ error: "Failed to delete configs" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, deleted: idsToDelete.length }, { status: 200 });
  } catch (error) {
    console.error("Cron check cleanup execution failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
