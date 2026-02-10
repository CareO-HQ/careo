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

// POST - Mark an appointment as read
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase } = createSupabaseClient(request);
    const { id } = await params;

    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if already read
    const { data: existing } = await supabase
      .from("appointment_read_status")
      .select("id")
      .eq("appointment_id", id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json({ success: true, alreadyRead: true }, { status: 200 });
    }

    // Mark as read
    const { error: insertError } = await supabase
      .from("appointment_read_status")
      .insert({
        appointment_id: id,
        user_id: user.id,
      });

    if (insertError) {
      console.error("Error marking appointment as read:", insertError);
      return NextResponse.json(
        { error: insertError.message || "Failed to mark appointment as read" },
        { status: 500 }
      );
    }

    // Also mark the corresponding sidebar notification as read
    try {
      const { data: notifs } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", "appointment_created")
        .contains("metadata", { appointmentId: id });

      if (notifs && notifs.length > 0) {
        const readEntries = notifs.map((n: any) => ({
          notification_id: n.id,
          user_id: user.id,
        }));
        await supabase.from("notification_read_status").upsert(readEntries, {
          onConflict: "notification_id,user_id",
          ignoreDuplicates: true,
        });
      }
    } catch (notifErr) {
      console.error("Error clearing sidebar notification:", notifErr);
      // Don't fail the main operation
    }

    return NextResponse.json({ success: true, alreadyRead: false }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
