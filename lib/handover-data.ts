import { SupabaseClient } from "@supabase/supabase-js";
import { format, addDays } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { Resident } from "@/types";

const UK_TIMEZONE = "Europe/London";
const FLUID_TYPES = ["Water", "Tea", "Coffee", "Juice", "Milk"];

export interface HandoverAppointment {
  id: string;
  title: string;
  start_time: string;
  location?: string;
}

export interface HandoverBowelDetail {
  timestamp: string; // e.g. "Today 08:15"
}

export type MedicationSlotStatus = "completed" | "partial" | "not_taken";

export interface HandoverMedicationSlot {
  time: string;                  // e.g. "8:00 AM"
  status: MedicationSlotStatus;
}

export interface HandoverMedicationDetail {
  // Only slots where at least one action (taken OR refused/missed) happened
  actionedSlots: HandoverMedicationSlot[];
  overallStatus: "completed" | "partial" | "not_taken" | "none";
  prnGivenList: Array<{ name: string; time: string; amount?: string }>;
}

export interface HandoverAppointmentDetail {
  title: string;
  relativeDay: string; // e.g. "today", "tomorrow"
  time: string; // e.g. "10:30"
}

export interface HandoverIncidentDetail {
  type: string; // e.g. "Fall", "Incident"
  relativeDay: string; // e.g. "yesterday", "today"
  time: string; // e.g. "19:45"
  outcome: string; // e.g. "No injury"
}

export interface HandoverWoundDetail {
  activeCount: number;
  nextReviewTime?: string; // e.g. "Tomorrow 09:00"
}

export interface HandoverTransferDetail {
  type: "transferred" | "returned" | "none";
  time?: string; // e.g. "11:30"
  relativeDay?: string; // e.g. "today"
  hasDischargeSummary?: boolean;
}

export interface ResidentHandoverData {
  residentId: string;
  foodIntakeCount: number;
  foodIntakePercentage: number;
  totalFluid: number;
  targetFluid: number;
  continenceCount: number;
  bowelDetail?: HandoverBowelDetail;
  medicationPercentage: number;
  medicationTotal: number;
  medicationTaken: number;
  medicationDetail?: HandoverMedicationDetail;
  incidentCount: number;
  fallCount: number;
  latestIncident?: HandoverIncidentDetail;
  woundCount: number;
  woundDetail?: HandoverWoundDetail;
  hospitalTransferCount: number;
  latestTransfer?: HandoverTransferDetail;
  appointmentCount: number;
  appointments: HandoverAppointment[];
  nextAppointment?: HandoverAppointmentDetail;
}

export interface ShiftBoundaries {
  shiftStartUTC: Date;
  shiftEndUTC: Date;
}

export interface DayBoundaries {
  startOfDayUTC: Date;
  endOfDayUTC: Date;
}

export function getShiftBoundaries(date: Date, shift: "day" | "night"): ShiftBoundaries {
  const dateStr = format(date, "yyyy-MM-dd");

  if (shift === "day") {
    return {
      shiftStartUTC: fromZonedTime(`${dateStr}T08:00:00`, UK_TIMEZONE),
      shiftEndUTC: fromZonedTime(`${dateStr}T20:00:00`, UK_TIMEZONE),
    };
  }

  const nextDayStr = format(addDays(date, 1), "yyyy-MM-dd");
  return {
    shiftStartUTC: fromZonedTime(`${dateStr}T20:00:00`, UK_TIMEZONE),
    shiftEndUTC: fromZonedTime(`${nextDayStr}T08:00:00`, UK_TIMEZONE),
  };
}

export function getFullDayBoundaries(date: Date): DayBoundaries {
  const dateStr = format(date, "yyyy-MM-dd");
  return {
    startOfDayUTC: fromZonedTime(`${dateStr}T00:00:00`, UK_TIMEZONE),
    endOfDayUTC: fromZonedTime(`${dateStr}T23:59:59`, UK_TIMEZONE),
  };
}

function getMedicationStatus(intake: { status?: string | null; state?: string | null }): string {
  return intake.status || intake.state || "scheduled";
}

function isMedicationTaken(intake: { status?: string | null; state?: string | null }): boolean {
  const status = getMedicationStatus(intake);
  return (
    status === "administered" ||
    status === "given" ||
    status === "taken" ||
    status === "dispensed" ||
    status === "made_available"
  );
}

function isMedicationRefused(intake: { status?: string | null; state?: string | null }): boolean {
  const status = getMedicationStatus(intake);
  return (
    status === "refused" ||
    status === "missed" ||
    status === "skipped" ||
    status === "refused_destroyed"
  );
}

function formatRelativeDayAndTime(dateObj: Date, targetDate: Date = new Date()): { relativeDay: string; time: string } {
  const time = format(dateObj, "HH:mm");
  const targetFormatted = format(targetDate, "yyyy-MM-dd");
  const dateFormatted = format(dateObj, "yyyy-MM-dd");
  const yesterdayFormatted = format(addDays(targetDate, -1), "yyyy-MM-dd");
  const tomorrowFormatted = format(addDays(targetDate, 1), "yyyy-MM-dd");

  if (dateFormatted === targetFormatted) {
    return { relativeDay: "today", time };
  } else if (dateFormatted === yesterdayFormatted) {
    return { relativeDay: "yesterday", time };
  } else if (dateFormatted === tomorrowFormatted) {
    return { relativeDay: "tomorrow", time };
  }
  return { relativeDay: `on ${format(dateObj, "d MMM")}`, time };
}

export async function fetchResidentHandoverData(
  supabase: SupabaseClient,
  resident: Resident,
  date: Date,
  shift: "day" | "night"
): Promise<ResidentHandoverData> {
  const { shiftStartUTC, shiftEndUTC } = getShiftBoundaries(date, shift);
  const { startOfDayUTC, endOfDayUTC } = getFullDayBoundaries(date);
  const dateKey = format(date, "yyyy-MM-dd");

  const [
    logsResult,
    incidentsResult,
    foldersResult,
    transfersResult,
    woundsResult,
    appointmentsResult,
    continenceResult,
    medicationResult,
    latestBowelResult,
  ] = await Promise.all([
    supabase
      .from("food_fluid_logs")
      .select("*")
      .eq("resident_id", resident.id)
      .gte("timestamp", startOfDayUTC.toISOString())
      .lte("timestamp", endOfDayUTC.toISOString())
      .eq("is_archived", false)
      .order("timestamp", { ascending: false }),
    supabase
      .from("incidents")
      .select("*")
      .eq("resident_id", resident.id)
      .gte("created_at", shiftStartUTC.toISOString())
      .lt("created_at", shiftEndUTC.toISOString())
      .order("created_at", { ascending: false }),
    supabase
      .from("incident_folders")
      .select("*")
      .eq("resident_id", resident.id)
      .gte("created_at", shiftStartUTC.toISOString())
      .lt("created_at", shiftEndUTC.toISOString())
      .order("created_at", { ascending: false }),
    supabase
      .from("hospital_transfer_logs")
      .select("*")
      .eq("resident_id", resident.id)
      .eq("date", dateKey)
      .order("created_at", { ascending: false }),
    supabase
      .from("wounds")
      .select("*")
      .eq("resident_id", resident.id)
      .neq("status", "healed"),
    supabase
      .from("appointments")
      .select("id, title, start_time, location")
      .eq("resident_id", resident.id)
      .gte("start_time", startOfDayUTC.toISOString())
      .order("start_time", { ascending: true }),
    supabase
      .from("continence_entries")
      .select("*")
      .eq("resident_id", resident.id)
      .gte("created_at", shiftStartUTC.toISOString())
      .lt("created_at", shiftEndUTC.toISOString()),
    supabase
      .from("medication_intakes")
      .select("*, medications(name, schedule_type)")
      .eq("resident_id", resident.id)
      .gte("scheduled_time", startOfDayUTC.toISOString())
      .lte("scheduled_time", endOfDayUTC.toISOString()),
    supabase
      .from("continence_entries")
      .select("*")
      .eq("resident_id", resident.id)
      .eq("entry_type", "bowel")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const logs = logsResult.data || [];
  const foodLogs = logs.filter(
    (log) =>
      log.type_of_food_drink &&
      !FLUID_TYPES.includes(log.type_of_food_drink) &&
      !log.fluid_consumed_ml &&
      log.amount_eaten &&
      log.amount_eaten !== "None" &&
      log.amount_eaten.trim() !== ""
  );
  const fluidLogs = logs.filter(
    (log) =>
      FLUID_TYPES.includes(log.type_of_food_drink) ||
      (log.fluid_consumed_ml && log.fluid_consumed_ml > 0)
  );
  const totalFluid = fluidLogs.reduce((sum, log) => sum + (log.fluid_consumed_ml || 0), 0);
  const foodIntakePercentage = Math.min(Math.round((foodLogs.length / 3) * 100), 100);
  const targetFluid = resident.fluid_target || 1800;

  // Bowel detail
  let bowelDetail: HandoverBowelDetail | undefined = undefined;
  const latestBowel = latestBowelResult.data?.[0];
  if (latestBowel) {
    const bowelTime = latestBowel.time
      ? `${latestBowel.date || format(new Date(latestBowel.created_at), "yyyy-MM-dd")}T${latestBowel.time}`
      : latestBowel.created_at;
    const bowelDate = new Date(bowelTime);
    const { relativeDay, time } = formatRelativeDayAndTime(isNaN(bowelDate.getTime()) ? new Date(latestBowel.created_at) : bowelDate, date);
    const isRelative = relativeDay === "today" || relativeDay === "yesterday" || relativeDay === "tomorrow";
    const capitalizedDay = relativeDay.charAt(0).toUpperCase() + relativeDay.slice(1);
    bowelDetail = {
      // Relative days: "Today 08:15" | Past dates: "24 Jul at 14:36"
      timestamp: isRelative ? `${capitalizedDay} ${time}` : `${capitalizedDay.replace("On ", "")} at ${time}`,
    };
  }

  const incidents = incidentsResult.data || [];
  const folders = foldersResult.data || [];
  const fallsFromFolders = folders.filter((f) => f.folder_type === "fall").length;
  const incidentsFromFolders = folders.filter((f) => f.folder_type === "incident").length;
  const fallsFromIncidents = incidents.filter((inc) => {
    if (inc.folder_id) return false;
    const types = inc.incident_types || [];
    return types.some((t: string) => t.toLowerCase() === "fall" || t.toLowerCase() === "falls");
  }).length;
  const nonFallIncidentsFromIncidents = incidents.filter((inc) => {
    if (inc.folder_id) return false;
    const types = inc.incident_types || [];
    return !types.some((t: string) => t.toLowerCase() === "fall" || t.toLowerCase() === "falls");
  }).length;

  let latestIncident: HandoverIncidentDetail | undefined = undefined;
  const combinedIncidentItem = incidents[0] || folders[0];
  if (combinedIncidentItem) {
    const incDate = new Date(combinedIncidentItem.created_at || combinedIncidentItem.date);
    const { relativeDay, time } = formatRelativeDayAndTime(incDate, date);
    const isFall = (combinedIncidentItem.folder_type === "fall") || 
      (combinedIncidentItem.incident_types && combinedIncidentItem.incident_types.some((t: string) => t.toLowerCase().includes("fall")));
    const injury = combinedIncidentItem.injury_sustained || combinedIncidentItem.injury_details 
      ? "Injury reported" 
      : "No injury";
    latestIncident = {
      type: isFall ? "Fall" : "Incident",
      relativeDay,
      time,
      outcome: injury,
    };
  }

  // Medication processing
  const medicationIntakes = medicationResult.data || [];
  const medicationTotal = medicationIntakes.length;
  const medicationTaken = medicationIntakes.filter(isMedicationTaken).length;
  const medicationPercentage =
    medicationTotal > 0 ? Math.round((medicationTaken / medicationTotal) * 100) : 0;

  const prnGivenList: Array<{ name: string; time: string; amount?: string }> = [];
  const slotMap: Record<string, { total: number; taken: number; refused: number }> = {};

  medicationIntakes.forEach((intake: any) => {
    const medName = intake.medications?.name || intake.medication_name || "Medication";
    const isPRN = intake.medications?.schedule_type === "PRN (As Needed)" || intake.schedule_type === "PRN (As Needed)";
    const isTaken = isMedicationTaken(intake);

    if (isPRN && isTaken) {
      // Convert administered_at/scheduled_time from UTC to UK timezone before formatting
      const prnRaw = new Date(intake.administered_at || intake.scheduled_time);
      const prnUK = toZonedTime(prnRaw, UK_TIMEZONE);
      const prnTimeStr = format(prnUK, "h:mm a");
      prnGivenList.push({
        name: medName,
        time: prnTimeStr,
        amount: intake.quantity ? `${intake.quantity}` : "1",
      });
    } else if (!isPRN) {
      // Convert scheduled_time from UTC to UK timezone so slots show as UK times (e.g. 8:00 AM not IST equivalent)
      const slotUK = toZonedTime(new Date(intake.scheduled_time), UK_TIMEZONE);
      const slotTime = format(slotUK, "h:mm a");
      if (!slotMap[slotTime]) {
        slotMap[slotTime] = { total: 0, taken: 0, refused: 0 };
      }
      slotMap[slotTime].total += 1;
      if (isTaken) slotMap[slotTime].taken += 1;
      else if (isMedicationRefused(intake)) slotMap[slotTime].refused += 1;
    }
  });

  // Build actionedSlots: only include slots where at least one medication was taken OR refused/missed
  // Slots where all medications are still 'scheduled' (no action taken) are hidden from handover
  const actionedSlots: HandoverMedicationSlot[] = Object.keys(slotMap)
    .sort()
    .filter((slot) => slotMap[slot].taken > 0 || slotMap[slot].refused > 0)
    .map((slot) => {
      const { total, taken } = slotMap[slot];
      const status: MedicationSlotStatus =
        taken === total ? "completed" :
        taken > 0       ? "partial"   : "not_taken";
      return { time: slot, status };
    });

  const overallStatus: HandoverMedicationDetail["overallStatus"] =
    actionedSlots.length === 0
      ? "none"
      : actionedSlots.every((s) => s.status === "completed")
      ? "completed"
      : actionedSlots.some((s) => s.status === "completed" || s.status === "partial")
      ? "partial"
      : "not_taken";

  const medicationDetail: HandoverMedicationDetail = {
    actionedSlots,
    overallStatus,
    prnGivenList,
  };

  // Appointments processing
  const appointments = (appointmentsResult.data || []) as HandoverAppointment[];
  let nextAppointment: HandoverAppointmentDetail | undefined = undefined;
  if (appointments.length > 0) {
    const earliest = appointments[0];
    const aptDate = new Date(earliest.start_time);
    const { relativeDay, time } = formatRelativeDayAndTime(aptDate, date);
    nextAppointment = {
      title: earliest.title,
      relativeDay,
      time,
    };
  }

  // Wounds processing
  const activeWounds = woundsResult.data || [];
  let woundDetail: HandoverWoundDetail | undefined = undefined;
  if (activeWounds.length > 0) {
    const upcomingReviews = activeWounds
      .map((w: any) => w.expected_next_review ? new Date(w.expected_next_review) : null)
      .filter((d): d is Date => d !== null && !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    let nextReviewTimeStr: string | undefined = undefined;
    if (upcomingReviews.length > 0) {
      const { relativeDay, time } = formatRelativeDayAndTime(upcomingReviews[0], date);
      const capDay = relativeDay.charAt(0).toUpperCase() + relativeDay.slice(1);
      nextReviewTimeStr = `${capDay} ${time}`;
    }

    woundDetail = {
      activeCount: activeWounds.length,
      nextReviewTime: nextReviewTimeStr,
    };
  }

  // Hospital transfer processing
  const transfers = transfersResult.data || [];
  let latestTransfer: HandoverTransferDetail | undefined = undefined;
  if (transfers.length > 0) {
    const t = transfers[0];
    const tDate = new Date(t.created_at || t.date);
    const { relativeDay, time } = formatRelativeDayAndTime(tDate, date);
    const isReturn = t.transfer_type === "return" || t.reason?.toLowerCase().includes("returned");
    latestTransfer = {
      type: isReturn ? "returned" : "transferred",
      time,
      relativeDay,
      hasDischargeSummary: !!t.discharge_summary_received || !!t.discharge_summary,
    };
  }

  return {
    residentId: resident.id,
    foodIntakeCount: foodLogs.length,
    foodIntakePercentage,
    totalFluid,
    targetFluid,
    continenceCount: continenceResult.data?.length || 0,
    bowelDetail,
    medicationPercentage,
    medicationTotal,
    medicationTaken,
    medicationDetail,
    incidentCount: incidentsFromFolders + nonFallIncidentsFromIncidents,
    fallCount: fallsFromFolders + fallsFromIncidents,
    latestIncident,
    woundCount: activeWounds.length,
    woundDetail,
    hospitalTransferCount: transfers.length,
    latestTransfer,
    appointmentCount: appointments.length,
    appointments,
    nextAppointment,
  };
}

export async function fetchAllResidentsHandoverData(
  supabase: SupabaseClient,
  residents: Resident[],
  date: Date,
  shift: "day" | "night"
): Promise<Record<string, ResidentHandoverData>> {
  const results = await Promise.all(
    residents.map((resident) => fetchResidentHandoverData(supabase, resident, date, shift))
  );

  return results.reduce(
    (acc, data) => {
      acc[data.residentId] = data;
      return acc;
    },
    {} as Record<string, ResidentHandoverData>
  );
}

