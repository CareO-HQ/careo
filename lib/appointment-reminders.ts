import type { SupabaseClient } from "@supabase/supabase-js";

export const APPOINTMENT_TOMORROW_REMINDER_TYPE = "appointment_tomorrow_reminder";

export interface AppointmentForReminder {
  id: string;
  title: string;
  start_time: string;
  resident_id: string | null;
  organization_id: string;
  care_home_id: string | null;
  team_id: string | null;
  status: string | null;
  resident?: {
    firstName: string;
    lastName: string;
  } | null;
}

interface TeamStaffRow {
  user_id: string;
}

interface NurseRecipientRow {
  id: string;
  active_team_id?: string | null;
}

function getTomorrowBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + 1);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

function isInTomorrowWindow(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const { start, end } = getTomorrowBounds();
  return date >= start && date < end;
}

export async function createTomorrowReminderNotifications(
  supabase: SupabaseClient,
  appointments: AppointmentForReminder[]
) {
  if (!appointments.length) {
    return;
  }

  const tomorrowAppointments = appointments.filter(
    (apt) => apt.status === "scheduled" && !!apt.team_id && isInTomorrowWindow(apt.start_time)
  );

  if (!tomorrowAppointments.length) {
    return;
  }

  const reminderDate = getTomorrowBounds().start.toISOString().slice(0, 10);

  for (const appointment of tomorrowAppointments) {
    if (!appointment.team_id) {
      continue;
    }

    const { data: teamStaffRows, error: teamStaffError } = await supabase
      .from("team_staff")
      .select("user_id")
      .eq("team_id", appointment.team_id);

    if (teamStaffError) {
      console.error("Error fetching team staff for appointment reminder:", teamStaffError);
      continue;
    }

    const teamStaffUserIds = (teamStaffRows as TeamStaffRow[] | null)?.map((row) => row.user_id) ?? [];
    const nurseRecipientIds = new Set<string>();

    if (teamStaffUserIds.length) {
      let nurseByTeamStaffQuery = supabase
        .from("users")
        .select("id")
        .eq("role", "nurse")
        .in("id", teamStaffUserIds);

      if (appointment.care_home_id) {
        nurseByTeamStaffQuery = nurseByTeamStaffQuery.eq("active_care_home_id", appointment.care_home_id);
      }

      const { data: nursesByTeamStaff, error: nursesByTeamStaffError } = await nurseByTeamStaffQuery;

      if (nursesByTeamStaffError) {
        console.error("Error fetching nurse recipients from team_staff for appointment reminder:", nursesByTeamStaffError);
      } else {
        for (const nurse of (nursesByTeamStaff as NurseRecipientRow[] | null) ?? []) {
          nurseRecipientIds.add(nurse.id);
        }
      }
    }

    let nurseByActiveTeamQuery = supabase
      .from("users")
      .select("id, active_team_id")
      .eq("role", "nurse")
      .eq("active_team_id", appointment.team_id);

    if (appointment.care_home_id) {
      nurseByActiveTeamQuery = nurseByActiveTeamQuery.eq("active_care_home_id", appointment.care_home_id);
    }

    const { data: nurseRowsByActiveTeam, error: nursesByActiveTeamError } = await nurseByActiveTeamQuery;

    if (nursesByActiveTeamError) {
      console.error("Error fetching nurse recipients from active_team_id for appointment reminder:", nursesByActiveTeamError);
      continue;
    }

    for (const nurse of (nurseRowsByActiveTeam as NurseRecipientRow[] | null) ?? []) {
      nurseRecipientIds.add(nurse.id);
    }

    const nurseRecipients = Array.from(nurseRecipientIds);
    if (!nurseRecipients.length) {
      continue;
    }

    const startDate = new Date(appointment.start_time);
    const residentName = [appointment.resident?.firstName, appointment.resident?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    const reminderMessage = `${appointment.title} for ${residentName || "resident"} is tomorrow (${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString(
      [],
      { hour: "2-digit", minute: "2-digit" }
    )}).`;
    const notificationLink = appointment.resident_id
      ? `/dashboard/residents/${appointment.resident_id}/appointments`
      : "/dashboard/appointment";

    for (const nurseId of nurseRecipients) {
      const reminderKey = `${appointment.id}:${nurseId}:${reminderDate}`;

      const { data: existingReminder, error: existingReminderError } = await supabase
        .from("notifications")
        .select("id")
        .eq("type", APPOINTMENT_TOMORROW_REMINDER_TYPE)
        .eq("user_id", nurseId)
        .filter("metadata->>reminderKey", "eq", reminderKey)
        .maybeSingle();

      if (existingReminderError) {
        console.error("Error checking existing appointment reminder notification:", existingReminderError);
        continue;
      }

      if (existingReminder?.id) {
        continue;
      }

      const { error: insertError } = await supabase.from("notifications").insert({
        organization_id: appointment.organization_id,
        care_home_id: appointment.care_home_id,
        team_id: appointment.team_id,
        user_id: nurseId,
        type: APPOINTMENT_TOMORROW_REMINDER_TYPE,
        title: "Appointment Reminder",
        message: reminderMessage,
        link: notificationLink,
        sender_id: null,
        sender_name: "System",
        metadata: {
          appointmentId: appointment.id,
          residentId: appointment.resident_id,
          startTime: appointment.start_time,
          teamId: appointment.team_id,
          reminderDate,
          reminderKey,
        },
      });

      if (insertError) {
        console.error("Error creating appointment reminder notification:", insertError);
      }
    }
  }
}
