import { SupabaseClient } from "@supabase/supabase-js";
import { format, addDays } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { Resident } from "@/types";

const UK_TIMEZONE = "Europe/London";
const FLUID_TYPES = ["Water", "Tea", "Coffee", "Juice", "Milk"];

export interface HandoverAppointment {
  id: string;
  title: string;
  start_time: string;
  location?: string;
}

export interface ResidentHandoverData {
  residentId: string;
  foodIntakeCount: number;
  foodIntakePercentage: number;
  totalFluid: number;
  continenceCount: number;
  medicationPercentage: number;
  medicationTotal: number;
  medicationTaken: number;
  incidentCount: number;
  fallCount: number;
  woundCount: number;
  hospitalTransferCount: number;
  appointmentCount: number;
  appointments: HandoverAppointment[];
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
  return status === "administered" || status === "given" || status === "taken";
}

export async function fetchResidentHandoverData(
  supabase: SupabaseClient,
  resident: Resident,
  date: Date,
  shift: "day" | "night"
): Promise<ResidentHandoverData> {
  const { shiftStartUTC, shiftEndUTC } = getShiftBoundaries(date, shift);
  const { startOfDayUTC, endOfDayUTC } = getFullDayBoundaries(date);

  const [
    logsResult,
    incidentsResult,
    foldersResult,
    transfersResult,
    woundsResult,
    appointmentsResult,
    continenceResult,
    medicationResult,
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
      .lt("created_at", shiftEndUTC.toISOString()),
    supabase
      .from("incident_folders")
      .select("*")
      .eq("resident_id", resident.id)
      .gte("created_at", shiftStartUTC.toISOString())
      .lt("created_at", shiftEndUTC.toISOString()),
    supabase
      .from("hospital_transfer_logs")
      .select("*")
      .eq("resident_id", resident.id)
      .gte("created_at", shiftStartUTC.toISOString())
      .lt("created_at", shiftEndUTC.toISOString()),
    supabase
      .from("wounds")
      .select("id")
      .eq("resident_id", resident.id)
      .neq("status", "healed"),
    supabase
      .from("appointments")
      .select("id, title, start_time, location")
      .eq("resident_id", resident.id)
      .gte("start_time", startOfDayUTC.toISOString())
      .lte("start_time", endOfDayUTC.toISOString()),
    supabase
      .from("continence_entries")
      .select("id")
      .eq("resident_id", resident.id)
      .gte("created_at", shiftStartUTC.toISOString())
      .lt("created_at", shiftEndUTC.toISOString()),
    supabase
      .from("medication_intakes")
      .select("id, status, state")
      .eq("resident_id", resident.id)
      .gte("scheduled_time", shiftStartUTC.toISOString())
      .lt("scheduled_time", shiftEndUTC.toISOString()),
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

  const medicationIntakes = medicationResult.data || [];
  const medicationTotal = medicationIntakes.length;
  const medicationTaken = medicationIntakes.filter(isMedicationTaken).length;
  const medicationPercentage =
    medicationTotal > 0 ? Math.round((medicationTaken / medicationTotal) * 100) : 0;

  const appointments = (appointmentsResult.data || []) as HandoverAppointment[];

  return {
    residentId: resident.id,
    foodIntakeCount: foodLogs.length,
    foodIntakePercentage,
    totalFluid,
    continenceCount: continenceResult.data?.length || 0,
    medicationPercentage,
    medicationTotal,
    medicationTaken,
    incidentCount: incidentsFromFolders + nonFallIncidentsFromIncidents,
    fallCount: fallsFromFolders + fallsFromIncidents,
    woundCount: woundsResult.data?.length || 0,
    hospitalTransferCount: transfersResult.data?.length || 0,
    appointmentCount: appointments.length,
    appointments,
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
