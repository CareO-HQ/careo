import type { SupabaseClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import { getShiftBoundaries } from "@/lib/handover-data";
import { hospitalTransferService } from "@/lib/hospital-transfer-service";

export const HANDOVER_ACTIVE_LABEL = "handover_active";
export const HANDOVER_DOCUMENTED_LABEL = "handover_documented";

export interface HandoverTransferState {
  logId: string;
  isActive: boolean;
}

interface ShiftTransferLogRow {
  id: string;
  resident_id: string;
  label: string | null;
  created_at: string;
}

export async function fetchHandoverTransferStates(
  supabase: SupabaseClient,
  residentIds: string[],
  date: Date,
  shift: "day" | "night"
): Promise<Record<string, HandoverTransferState>> {
  if (residentIds.length === 0) {
    return {};
  }

  const { shiftStartUTC, shiftEndUTC } = getShiftBoundaries(date, shift);

  const { data, error } = await supabase
    .from("hospital_transfer_logs")
    .select("id, resident_id, label, created_at")
    .in("resident_id", residentIds)
    .gte("created_at", shiftStartUTC.toISOString())
    .lt("created_at", shiftEndUTC.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching handover transfer states:", error);
    return {};
  }

  const states: Record<string, HandoverTransferState> = {};

  for (const log of (data ?? []) as ShiftTransferLogRow[]) {
    if (states[log.resident_id]) continue;
    states[log.resident_id] = {
      logId: log.id,
      isActive: log.label === HANDOVER_ACTIVE_LABEL,
    };
  }

  return states;
}

export async function markHandoverHospitalAdmission(options: {
  residentId: string;
  organizationId: string;
  createdBy: string;
  date: Date;
}): Promise<{ logId: string }> {
  const dateString = format(options.date, "yyyy-MM-dd");

  const created = await hospitalTransferService.createTransferLog({
    residentId: options.residentId,
    date: dateString,
    hospitalName: "Pending",
    reason: "Marked from handover",
    label: HANDOVER_ACTIVE_LABEL,
    organizationId: options.organizationId,
    createdBy: options.createdBy,
  });

  return { logId: created.id as string };
}

export async function deactivateHandoverHospitalAdmission(logId: string): Promise<void> {
  await hospitalTransferService.updateTransferLog(logId, {
    label: HANDOVER_DOCUMENTED_LABEL,
  });
}

export function formatResidentNameAndRoom(
  firstName: string,
  lastName: string,
  roomNumber?: string | null
): string {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim() || "Unknown";
  if (!roomNumber) return name;
  return `${name} (Room ${roomNumber})`;
}

export function formatResidentNameWithRoom(
  fullName: string,
  roomNumber?: string | null
): string {
  const name = fullName.trim() || "Unknown";
  if (!roomNumber || roomNumber === "—") return name;
  return `${name} (Room ${roomNumber})`;
}
