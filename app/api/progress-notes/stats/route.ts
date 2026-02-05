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
          // In App Router, we can only set cookies on the response
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          // In App Router, we can only delete cookies on the response
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

// GET - Get progress notes statistics for a resident
export async function GET(request: NextRequest) {
  try {
    const { supabase, response } = createSupabaseClient(request);
    
    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error("Auth error in stats:", authError);
      return NextResponse.json({ 
        error: "Authentication failed", 
        details: authError.message 
      }, { status: 401 });
    }
    if (!user) {
      console.error("No user found in stats");
      return NextResponse.json({ error: "Unauthorized - No user found" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const residentId = searchParams.get("residentId");

    if (!residentId) {
      return NextResponse.json({ error: "residentId is required" }, { status: 400 });
    }

    // Get all notes for the resident
    const { data: notes, error } = await supabase
      .from("progress_notes")
      .select("type")
      .eq("resident_id", residentId);

    if (error) {
      console.error("Error fetching progress notes stats:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate stats
    const stats = {
      totalCount: notes?.length || 0,
      dailyCount: notes?.filter((n: any) => n.type === "daily").length || 0,
      medicalCount: notes?.filter((n: any) => n.type === "medical").length || 0,
      incidentCount: notes?.filter((n: any) => n.type === "incident").length || 0,
      behavioralCount: notes?.filter((n: any) => n.type === "behavioral").length || 0,
      otherCount: notes?.filter((n: any) => n.type === "other").length || 0,
    };

    const jsonResponse = NextResponse.json(stats);
    
    // Copy cookies from response if any were set
    try {
      response.cookies.getAll().forEach((cookie) => {
        jsonResponse.cookies.set(cookie.name, cookie.value, cookie);
      });
    } catch (e) {
      console.warn("Error copying cookies:", e);
    }
    
    return jsonResponse;
  } catch (error: any) {
    console.error("Error in GET /api/progress-notes/stats:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
