import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runFormReviewDueTomorrowAlerts } from "@/lib/form-review-alerts";

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

export async function GET(request: NextRequest) {
  try {
    const expectedAuthHeader = getExpectedAuthHeader();
    const providedAuthHeader = request.headers.get("authorization");
    if (!expectedAuthHeader || providedAuthHeader !== expectedAuthHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    const result = await runFormReviewDueTomorrowAlerts(supabase);
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error("Cron form-review-alerts execution failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
