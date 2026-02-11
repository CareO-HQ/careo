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

// POST - Mark multiple appointments as read
export async function POST(request: NextRequest) {
  try {
    const { supabase } = createSupabaseClient(request);

    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { appointmentIds } = body;

    if (!Array.isArray(appointmentIds) || appointmentIds.length === 0) {
      return NextResponse.json(
        { error: "appointmentIds must be a non-empty array" },
        { status: 400 }
      );
    }

    // Get existing read statuses to avoid duplicates
    const { data: existing } = await supabase
      .from("appointment_read_status")
      .select("appointment_id")
      .eq("user_id", user.id)
      .in("appointment_id", appointmentIds);

    const existingIds = new Set((existing || []).map((e: any) => e.appointment_id));
    const newIds = appointmentIds.filter((id: string) => !existingIds.has(id));

    // Insert new read statuses
    if (newIds.length > 0) {
      const readStatuses = newIds.map((appointmentId: string) => ({
        appointment_id: appointmentId,
        user_id: user.id,
      }));

      const { error: insertError } = await supabase
        .from("appointment_read_status")
        .insert(readStatuses);

      if (insertError) {
        console.error("Error marking appointments as read:", insertError);
        return NextResponse.json(
          { error: insertError.message || "Failed to mark appointments as read" },
          { status: 500 }
        );
      }
    }

    // Also clear the corresponding sidebar notifications
    try {
      const { data: notifs } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", "appointment_created")
        .in("metadata->>appointmentId", appointmentIds);

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
      console.error("Error clearing sidebar notifications:", notifErr);
      // Don't fail the main operation
    }

    return NextResponse.json({ success: true, marked: newIds.length }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
