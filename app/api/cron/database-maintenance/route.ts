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
    
    // Call the database maintenance RPC function
    const { error } = await supabase.rpc("perform_daily_maintenance");

    if (error) {
      console.error("Cron database maintenance query failed:", error);
      return NextResponse.json({ error: "Failed to execute database maintenance" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Database maintenance completed successfully" }, { status: 200 });
  } catch (error) {
    console.error("Cron database maintenance failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
