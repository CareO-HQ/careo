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

// GET - List appointments with filters
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
    const teamId = searchParams.get("teamId");
    const careHomeId = searchParams.get("careHomeId");
    const organizationId = searchParams.get("organizationId");
    const status = searchParams.get("status");
    const includeAll = searchParams.get("includeAll") === "true";

    // Build query
    let query = supabase
      .from("appointments")
      .select("*")
      .order("start_time", { ascending: true });

    // Apply filters
    if (residentId) {
      query = query.eq("resident_id", residentId);
    }
    if (teamId) {
      query = query.eq("team_id", teamId);
    }
    if (careHomeId) {
      query = query.eq("care_home_id", careHomeId);
    }
    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }
    if (status) {
      query = query.eq("status", status);
    }

    // Filter for upcoming appointments if includeAll is false
    if (!includeAll && !status) {
      const now = new Date().toISOString();
      query = query.eq("status", "scheduled").gte("start_time", now);
    }

    const { data: appointments, error } = await query;

    if (error) {
      console.error("Error fetching appointments:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get read status for current user
    const appointmentIds = (appointments || []).map((apt: any) => apt.id);
    let readStatusMap: Record<string, boolean> = {};

    if (appointmentIds.length > 0) {
      const { data: readStatuses } = await supabase
        .from("appointment_read_status")
        .select("appointment_id")
        .eq("user_id", user.id)
        .in("appointment_id", appointmentIds);

      if (readStatuses) {
        readStatusMap = readStatuses.reduce((acc: Record<string, boolean>, status: any) => {
          acc[status.appointment_id] = true;
          return acc;
        }, {});
      }
    }

    // Add read status and resident info to appointments
    const appointmentsWithStatus = await Promise.all(
      (appointments || []).map(async (apt: any) => {
        // Fetch resident info
        let resident: { id: string; firstName: string; lastName: string; imageUrl: string | null } | null = null;
        if (apt.resident_id) {
          const { data: residentData } = await supabase
            .from("residents")
            .select("id, first_name, last_name, image_url")
            .eq("id", apt.resident_id)
            .single();

          if (residentData) {
            resident = {
              id: residentData.id,
              firstName: residentData.first_name,
              lastName: residentData.last_name,
              imageUrl: residentData.image_url ?? null,
            };
          }
        }

        return {
          ...apt,
          _id: apt.id, // For compatibility
          residentId: apt.resident_id,
          startTime: apt.start_time,
          endTime: apt.end_time,
          staffId: apt.staff_id,
          isRead: !!readStatusMap[apt.id],
          resident,
        };
      })
    );

    return NextResponse.json({ appointments: appointmentsWithStatus }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create appointment and send notifications
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
      title,
      description,
      startTime,
      endTime,
      location,
      staffId,
      organizationId,
      teamId,
    } = body;

    // Validate required fields
    if (!residentId || !title || !startTime || !location || !organizationId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify resident exists and get care home info
    const { data: resident, error: residentError } = await supabase
      .from("residents")
      .select("id, care_home_id, team_id, first_name, last_name")
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

    // Convert staffId (email or UUID) to UUID if needed
    let staffUserId: string | null = null;
    if (staffId) {
      // Check if it's already a UUID (format check)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(staffId)) {
        staffUserId = staffId;
      } else {
        // Look up by email
        const { data: staffUser } = await supabase
          .from("users")
          .select("id")
          .eq("email", staffId)
          .single();
        if (staffUser?.id) {
          staffUserId = staffUser.id;
        }
      }
    }

    // Create appointment
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .insert({
        resident_id: residentId,
        organization_id: organizationId,
        care_home_id: resident.care_home_id,
        title,
        description: description || null,
        start_time: startTime,
        end_time: endTime || startTime,
        location,
        staff_id: staffUserId,
        team_id: finalTeamId,
        status: "scheduled",
        created_by: user.id,
      })
      .select()
      .single();

    if (appointmentError || !appointment) {
      console.error("Error creating appointment:", appointmentError);
      return NextResponse.json(
        { error: appointmentError?.message || "Failed to create appointment" },
        { status: 500 }
      );
    }

    // Get user info for notification sender
    const { data: userData } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", user.id)
      .single();

    const senderName = userData?.name || user.email || "System";
    const creatorEmail = user.email || "";

    // Create notifications for managers and assigned staff
    try {
      const notificationRecipients: Array<{ userId: string; email: string }> = [];

      // 0. Add creator (self) to recipients so they also see the side bar badge
      notificationRecipients.push({
        userId: user.id,
        email: creatorEmail,
      });

      // 1. Get all managers for the care home using the users table
      if (resident.care_home_id) {
        const { data: managers, error: managersError } = await supabase
          .from("users")
          .select("id, email")
          .eq("active_care_home_id", resident.care_home_id)
          .eq("role", "manager");

        if (!managersError && managers) {
          for (const manager of managers) {
            // Check if already in recipients (e.g. if creator is also a manager)
            const alreadyAdded = notificationRecipients.some(
              (r) => r.userId === manager.id
            );
            if (!alreadyAdded && manager.email) {
              notificationRecipients.push({
                userId: manager.id,
                email: manager.email,
              });
            }
          }
        }
      }

      // Add assigned staff if resolved
      if (staffUserId) {
        // staffUserId was already resolved from staffId earlier
        const alreadyAdded = notificationRecipients.some(
          (r) => r.userId === staffUserId
        );
        if (!alreadyAdded) {
          // Look up email for the resolved staff user
          const { data: staffUserData } = await supabase
            .from("users")
            .select("email")
            .eq("id", staffUserId)
            .single();
          notificationRecipients.push({
            userId: staffUserId,
            email: staffUserData?.email || "",
          });
        }
      }

      // Create notifications for each recipient
      const notificationMessage = `${title} for ${resident.first_name} ${resident.last_name} on ${new Date(startTime).toLocaleDateString()}`;
      const notificationLink = `/dashboard/residents/${residentId}/appointments`;

      const notifications = notificationRecipients.map((recipient) => ({
        organization_id: organizationId,
        care_home_id: resident.care_home_id,
        user_id: recipient.userId,
        title: "New Appointment Created",
        message: notificationMessage,
        type: "appointment_created",
        link: notificationLink,
        sender_id: user.id,
        sender_name: senderName,
        metadata: {
          appointmentId: appointment.id,
          residentId: residentId,
          residentName: `${resident.first_name} ${resident.last_name}`,
          careHomeId: resident.care_home_id,
          startTime: startTime,
          location: location,
        },
      }));

      if (notifications.length > 0) {
        const { error: notificationError } = await supabase
          .from("notifications")
          .insert(notifications);

        if (notificationError) {
          console.error("Error creating notifications:", notificationError);
          // Don't fail appointment creation if notifications fail
        }
      }
    } catch (notificationErr) {
      console.error("Error in notification creation:", notificationErr);
      // Don't fail appointment creation if notifications fail
    }

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
