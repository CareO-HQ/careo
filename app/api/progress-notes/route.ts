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
          // Recreate response to update cookies
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          // In App Router, we can only delete cookies on the response
          // Recreate response to update cookies
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

// GET - List progress notes with pagination and filtering
export async function GET(request: NextRequest) {
  console.log("[GET /api/progress-notes] Request received");
  try {
    const { supabase, response } = createSupabaseClient(request);
    console.log("[GET /api/progress-notes] Supabase client created");
    
    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error("Auth error:", authError);
      return NextResponse.json({ 
        error: "Authentication failed", 
        details: authError.message 
      }, { status: 401 });
    }
    if (!user) {
      console.error("No user found");
      return NextResponse.json({ error: "Unauthorized - No user found" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const residentId = searchParams.get("residentId");
    const filterType = searchParams.get("filterType") || "all";
    const searchQuery = searchParams.get("searchQuery") || "";
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!residentId) {
      return NextResponse.json({ error: "residentId is required" }, { status: 400 });
    }

    // Build query
    let query = supabase
      .from("progress_notes")
      .select("*")
      .eq("resident_id", residentId)
      .order("created_at", { ascending: false })
      .limit(limit + 1); // Fetch one extra to check if there's more

    // Apply type filter
    if (filterType && filterType !== "all") {
      query = query.eq("type", filterType);
    }

    // Apply cursor for pagination
    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    console.log("[GET /api/progress-notes] Executing query...");
    const { data: notes, error } = await query;
    console.log("[GET /api/progress-notes] Query complete", { noteCount: notes?.length || 0, hasError: !!error });

    if (error) {
      console.error("Error fetching progress notes:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      return NextResponse.json({ 
        error: error.message || "Failed to fetch progress notes",
        details: error,
        code: error.code
      }, { status: 500 });
    }

    // Check if there are more results
    const hasMore = notes && notes.length > limit;
    const page = hasMore ? notes.slice(0, limit) : (notes || []);
    const nextCursor = hasMore && page.length > 0 
      ? page[page.length - 1].created_at 
      : null;

    // Apply search filter if provided
    let filteredPage = page;
    if (searchQuery && searchQuery.trim() !== "") {
      const searchLower = searchQuery.toLowerCase();
      filteredPage = page.filter((note: any) =>
        note.note?.toLowerCase().includes(searchLower) ||
        note.author_name?.toLowerCase().includes(searchLower) ||
        note.type?.toLowerCase().includes(searchLower)
      );
    }

    // Transform to match frontend expectations
    const transformedNotes = filteredPage.map((note: any) => ({
      _id: note.id,
      id: note.id,
      residentId: note.resident_id,
      type: note.type,
      date: note.date,
      time: note.time,
      note: note.note,
      authorId: note.author_id,
      authorName: note.author_name,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    }));

    console.log("[GET /api/progress-notes] Returning response", { noteCount: transformedNotes.length });
    const jsonResponse = NextResponse.json({
      page: transformedNotes,
      isDone: !hasMore,
      continueCursor: nextCursor,
    });
    
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
    console.error("Error in GET /api/progress-notes:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      { 
        error: error.message || "Internal server error",
        type: error.name || "Error",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// POST - Create a new progress note
export async function POST(request: NextRequest) {
  try {
    const { supabase, response } = createSupabaseClient(request);
    
    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error("Auth error:", authError);
      return NextResponse.json({ 
        error: "Authentication failed", 
        details: authError.message 
      }, { status: 401 });
    }
    if (!user) {
      console.error("No user found");
      return NextResponse.json({ error: "Unauthorized - No user found" }, { status: 401 });
    }

    const body = await request.json();
    const { residentId, type, date, time, note, authorId, authorName } = body;

    // Validate required fields
    if (!residentId || !type || !date || !time || !note || !authorId || !authorName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get resident to get organization_id
    const { data: resident, error: residentError } = await supabase
      .from("residents")
      .select("organization_id")
      .eq("id", residentId)
      .single();

    if (residentError || !resident) {
      return NextResponse.json(
        { error: "Resident not found" },
        { status: 404 }
      );
    }

    // Insert progress note
    const { data: newNote, error: insertError } = await supabase
      .from("progress_notes")
      .insert({
        resident_id: residentId,
        organization_id: resident.organization_id,
        type,
        date,
        time,
        note,
        author_id: authorId,
        author_name: authorName,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating progress note:", insertError);
      console.error("Error details:", JSON.stringify(insertError, null, 2));
      return NextResponse.json(
        { 
          error: insertError.message || "Failed to create progress note",
          details: insertError 
        },
        { status: 500 }
      );
    }

    // Transform response
    const transformedNote = {
      _id: newNote.id,
      id: newNote.id,
      residentId: newNote.resident_id,
      type: newNote.type,
      date: newNote.date,
      time: newNote.time,
      note: newNote.note,
      authorId: newNote.author_id,
      authorName: newNote.author_name,
      createdAt: newNote.created_at,
      updatedAt: newNote.updated_at,
    };

    const jsonResponse = NextResponse.json(transformedNote, { status: 201 });
    
    // Copy cookies from response if any were set
    response.cookies.getAll().forEach((cookie) => {
      jsonResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    
    return jsonResponse;
  } catch (error: any) {
    console.error("Error in POST /api/progress-notes:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      { 
        error: error.message || "Internal server error",
        type: error.name || "Error",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
