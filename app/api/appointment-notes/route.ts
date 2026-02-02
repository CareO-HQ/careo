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

// GET - List appointment notes for a resident
export async function GET(request: NextRequest) {
  try {
    const { supabase, response } = createSupabaseClient(request);
    
    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const residentId = searchParams.get("residentId");
    const activeOnly = searchParams.get("activeOnly") !== "false";

    if (!residentId) {
      return NextResponse.json(
        { error: "residentId is required" },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from("appointment_notes")
      .select("*")
      .eq("resident_id", residentId)
      .order("created_at", { ascending: false });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data: notes, error } = await query;

    if (error) {
      console.error("Error fetching appointment notes:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notes: notes || [] }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new appointment note
export async function POST(request: NextRequest) {
  try {
    const { supabase, response } = createSupabaseClient(request);
    
    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      residentId,
      category,
      preparationTime,
      preparationNotes,
      preferredTime,
      transportPreference,
      instructions,
      transportationNeeds,
      medicalNeeds,
      priority,
      organizationId,
      teamId,
    } = body;

    // Validate required fields
    if (!residentId || !category || !organizationId) {
      return NextResponse.json(
        { error: "Missing required fields: residentId, category, organizationId" },
        { status: 400 }
      );
    }

    // Verify resident exists
    const { data: resident, error: residentError } = await supabase
      .from("residents")
      .select("id, organization_id, team_id")
      .eq("id", residentId)
      .single();

    if (residentError || !resident) {
      return NextResponse.json(
        { error: "Resident not found" },
        { status: 404 }
      );
    }

    // Use resident's team_id if teamId not provided
    const finalTeamId = teamId || resident.team_id;

    // Create appointment note
    const { data: note, error: insertError } = await supabase
      .from("appointment_notes")
      .insert({
        resident_id: residentId,
        organization_id: organizationId,
        team_id: finalTeamId,
        category,
        preparation_time: preparationTime || null,
        preparation_notes: preparationNotes || null,
        preferred_time: preferredTime || null,
        transport_preference: transportPreference || null,
        instructions: instructions || null,
        transportation_needs: transportationNeeds || [],
        medical_needs: medicalNeeds || [],
        priority: priority || "medium",
        is_active: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError || !note) {
      console.error("Error creating appointment note:", insertError);
      return NextResponse.json(
        { error: insertError?.message || "Failed to create appointment note" },
        { status: 500 }
      );
    }

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
