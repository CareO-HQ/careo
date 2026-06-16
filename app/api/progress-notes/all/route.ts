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

// GET - Get all progress notes for a resident (for documents page)
export async function GET(request: NextRequest) {
  try {
    const { supabase, response } = createSupabaseClient(request);
    
    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error("Auth error in all notes:", authError);
      return NextResponse.json({ 
        error: "Authentication failed", 
        details: authError.message 
      }, { status: 401 });
    }
    if (!user) {
      console.error("No user found in all notes");
      return NextResponse.json({ error: "Unauthorized - No user found" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const residentId = searchParams.get("residentId");
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : null;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : null;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : null;
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : null;
    const type = searchParams.get("type") || "all";
    const searchQuery = searchParams.get("searchQuery") || "";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    if (!residentId) {
      return NextResponse.json({ error: "residentId is required" }, { status: 400 });
    }

    // Query builder
    let query = supabase
      .from("progress_notes")
      .select("*", { count: "exact" })
      .eq("resident_id", residentId);

    // Apply type filter
    if (type && type !== "all") {
      query = query.eq("type", type);
    }

    // Apply search filter
    if (searchQuery) {
      query = query.or(`note.ilike.%${searchQuery}%,author_name.ilike.%${searchQuery}%,type.ilike.%${searchQuery}%`);
    }

    // Apply year and month filters
    if (year) {
      if (month) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        query = query.gte("date", startDate).lte("date", endDate);
      } else {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;
        query = query.gte("date", startDate).lte("date", endDate);
      }
    }

    // Order
    query = query
      .order("date", { ascending: sortOrder.toLowerCase() === "asc" })
      .order("time", { ascending: sortOrder.toLowerCase() === "asc" });

    // Pagination
    if (limit !== null && offset !== null) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data: notes, error, count } = await query;

    if (error) {
      console.error("Error fetching progress notes:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform to match frontend expectations
    const transformedNotes = (notes || []).map((note: any) => ({
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

    const result = limit !== null && offset !== null
      ? { notes: transformedNotes, totalCount: count || 0 }
      : transformedNotes;

    const jsonResponse = NextResponse.json(result);
    
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
    console.error("Error in GET /api/progress-notes/all:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
