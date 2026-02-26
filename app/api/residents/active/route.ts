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

// GET - List all active residents
export async function GET(request: NextRequest) {
  try {
    const { supabase } = createSupabaseClient(request);

    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, active_team_id")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.organization_id) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Fetch all active residents in the organization
    let query = supabase
      .from("residents")
      .select("id, first_name, last_name, room_number, image_url, status")
      .eq("organization_id", profile.organization_id)
      .eq("status", "active")
      .eq("is_active", true)
      .order("first_name", { ascending: true });

    // Optionally filter by team
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    if (teamId) {
      query = query.eq("team_id", teamId);
    }

    const { data: residents, error } = await query;

    if (error) {
      console.error("Error fetching residents:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ residents: residents || [] }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
