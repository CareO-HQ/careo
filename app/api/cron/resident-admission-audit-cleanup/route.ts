import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { subDays } from "date-fns";

const AUDIT_LOG_RETENTION_DAYS = 30;

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
    const cutoffIso = subDays(new Date(), AUDIT_LOG_RETENTION_DAYS).toISOString();

    const { data, error } = await supabase
      .from("resident_admission_audit_logs")
      .delete()
      .lt("created_at", cutoffIso)
      .select("id");

    if (error) {
      console.error("Cron resident admission audit cleanup delete failed:", error);
      return NextResponse.json({ error: "Failed to delete audit logs" }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: data?.length ?? 0 }, { status: 200 });
  } catch (error) {
    console.error("Cron resident admission audit cleanup execution failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
