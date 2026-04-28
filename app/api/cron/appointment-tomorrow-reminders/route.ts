import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  createTomorrowReminderNotifications,
  type AppointmentForReminder,
} from "@/lib/appointment-reminders";

interface AppointmentRow {
  id: string;
  title: string;
  start_time: string;
  resident_id: string | null;
  organization_id: string;
  care_home_id: string | null;
  team_id: string | null;
  status: string | null;
}

interface ResidentRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

function getExpectedAuthHeader() {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return null;
  }
  return `Bearer ${secret}`;
}

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables for cron route");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getTomorrowRangeIso() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + 1);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const expectedAuthHeader = getExpectedAuthHeader();
    const providedAuthHeader = request.headers.get("authorization");

    if (!expectedAuthHeader || providedAuthHeader !== expectedAuthHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { startIso, endIso } = getTomorrowRangeIso();

    const { data: appointmentRows, error: appointmentsError } = await supabase
      .from("appointments")
      .select("id, title, start_time, resident_id, organization_id, care_home_id, team_id, status")
      .eq("status", "scheduled")
      .gte("start_time", startIso)
      .lt("start_time", endIso);

    if (appointmentsError) {
      console.error("Cron reminder appointment query failed:", appointmentsError);
      return NextResponse.json({ error: "Failed to query appointments" }, { status: 500 });
    }

    const appointments = (appointmentRows as AppointmentRow[] | null) ?? [];
    if (!appointments.length) {
      return NextResponse.json({ success: true, processed: 0 }, { status: 200 });
    }

    const residentIds = Array.from(
      new Set(
        appointments
          .map((appointment) => appointment.resident_id)
          .filter((residentId): residentId is string => typeof residentId === "string" && residentId.length > 0)
      )
    );

    const residentMap = new Map<string, { firstName: string; lastName: string }>();
    if (residentIds.length > 0) {
      const { data: residentRows, error: residentsError } = await supabase
        .from("residents")
        .select("id, first_name, last_name")
        .in("id", residentIds);

      if (residentsError) {
        console.error("Cron reminder resident query failed:", residentsError);
        return NextResponse.json({ error: "Failed to query residents" }, { status: 500 });
      }

      for (const resident of (residentRows as ResidentRow[] | null) ?? []) {
        residentMap.set(resident.id, {
          firstName: resident.first_name ?? "",
          lastName: resident.last_name ?? "",
        });
      }
    }

    const appointmentsForReminder: AppointmentForReminder[] = appointments.map((appointment) => ({
      ...appointment,
      resident: appointment.resident_id ? residentMap.get(appointment.resident_id) ?? null : null,
    }));

    await createTomorrowReminderNotifications(supabase, appointmentsForReminder);

    return NextResponse.json(
      {
        success: true,
        processed: appointmentsForReminder.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Cron appointment reminder execution failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
