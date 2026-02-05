import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { NextRequest, NextResponse } from "next/server";

// Helper to create Supabase client
function createSupabaseClient(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.delete(name);
        },
      },
    }
  );

  return { supabase, response };
}

// GET - Get upcoming appointments
export async function GET(request: NextRequest) {
  try {
    const { supabase } = createSupabaseClient(request);

    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const residentId = searchParams.get("residentId");
    const teamId = searchParams.get("teamId");
    const organizationId = searchParams.get("organizationId");
    const limit = parseInt(searchParams.get("limit") || "50");

    const now = new Date().toISOString();

    // Build query
    let query = supabase
      .from("appointments")
      .select("*")
      .eq("status", "scheduled")
      .gte("start_time", now)
      .order("start_time", { ascending: true })
      .limit(limit);

    // Apply filters
    if (residentId) {
      query = query.eq("resident_id", residentId);
    }
    if (teamId) {
      query = query.eq("team_id", teamId);
    }
    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    const { data: appointments, error } = await query;

    if (error) {
      console.error("Error fetching upcoming appointments:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ appointments: appointments || [] }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
