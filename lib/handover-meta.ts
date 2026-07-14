import type { SupabaseClient } from "@supabase/supabase-js";
import { Resident } from "@/types";
import {
  fetchAllResidentsHandoverData,
  ResidentHandoverData,
} from "@/lib/handover-data";
import { getTeamCapacity } from "@/lib/team-capacity";

export interface HandoverMetaStats {
  totalBeds: number | null;
  vacantBeds: number | null;
  hospitalAdmissions: number;
}

export function computeHospitalAdmissions(
  handoverData: Record<string, ResidentHandoverData>
): number {
  return Object.values(handoverData).reduce(
    (sum, data) => sum + data.hospitalTransferCount,
    0
  );
}

export function computeMetaFromCapacityAndHandoverData(
  bedCount: number | null,
  residentCount: number,
  handoverData: Record<string, ResidentHandoverData>
): HandoverMetaStats {
  const totalBeds = bedCount !== null && bedCount > 0 ? bedCount : null;
  const vacantBeds =
    totalBeds !== null ? Math.max(0, totalBeds - residentCount) : null;

  return {
    totalBeds,
    vacantBeds,
    hospitalAdmissions: computeHospitalAdmissions(handoverData),
  };
}

export async function fetchHandoverMetaStats(
  supabase: SupabaseClient,
  teamId: string,
  residents: Resident[],
  date: Date,
  shift: "day" | "night",
  existingHandoverData?: Record<string, ResidentHandoverData>
): Promise<HandoverMetaStats> {
  const [capacity, handoverData] = await Promise.all([
    getTeamCapacity(supabase, teamId),
    existingHandoverData
      ? Promise.resolve(existingHandoverData)
      : fetchAllResidentsHandoverData(supabase, residents, date, shift),
  ]);

  return computeMetaFromCapacityAndHandoverData(
    capacity?.bedCount ?? null,
    capacity?.residentCount ?? residents.length,
    handoverData
  );
}

export function formatMetaStatValue(value: number | null): string {
  if (value === null) return "—";
  return String(value);
}
