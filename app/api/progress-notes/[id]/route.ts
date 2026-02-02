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

// PATCH - Update a progress note
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, response } = createSupabaseClient(request);
    const { id } = await params;
    
    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, date, time, note } = body;

    // Build update object
    const updates: any = {};
    if (type !== undefined) updates.type = type;
    if (date !== undefined) updates.date = date;
    if (time !== undefined) updates.time = time;
    if (note !== undefined) updates.note = note;
    updates.updated_at = new Date().toISOString();

    // Update progress note
    const { data: updatedNote, error: updateError } = await supabase
      .from("progress_notes")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating progress note:", updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    if (!updatedNote) {
      return NextResponse.json(
        { error: "Progress note not found" },
        { status: 404 }
      );
    }

    // Transform response
    const transformedNote = {
      _id: updatedNote.id,
      id: updatedNote.id,
      residentId: updatedNote.resident_id,
      type: updatedNote.type,
      date: updatedNote.date,
      time: updatedNote.time,
      note: updatedNote.note,
      authorId: updatedNote.author_id,
      authorName: updatedNote.author_name,
      createdAt: updatedNote.created_at,
      updatedAt: updatedNote.updated_at,
    };

    return NextResponse.json(transformedNote, { headers: response.headers });
  } catch (error: any) {
    console.error("Error in PATCH /api/progress-notes/[id]:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a progress note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, response } = createSupabaseClient(request);
    const { id } = await params;
    
    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete progress note
    const { error: deleteError } = await supabase
      .from("progress_notes")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting progress note:", deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { headers: response.headers });
  } catch (error: any) {
    console.error("Error in DELETE /api/progress-notes/[id]:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
