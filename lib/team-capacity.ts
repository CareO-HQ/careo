import type { SupabaseClient } from "@supabase/supabase-js";

export interface TeamCapacity {
  teamId: string;
  teamName: string | null;
  bedCount: number | null;
  residentCount: number;
  isAtCapacity: boolean;
  isOverCapacity: boolean;
}

export async function getTeamCapacity(
  supabase: SupabaseClient,
  teamId: string
): Promise<TeamCapacity | null> {
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, name, bed_count")
    .eq("id", teamId)
    .maybeSingle();

  if (teamError || !team) {
    return null;
  }

  const { count, error: countError } = await supabase
    .from("residents")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId)
    .eq("status", "active");

  if (countError) {
    return null;
  }

  const bedCount = team.bed_count ?? null;
  const residentCount = count ?? 0;

  return {
    teamId: team.id,
    teamName: team.name,
    bedCount,
    residentCount,
    isAtCapacity: bedCount !== null && residentCount >= bedCount,
    isOverCapacity: bedCount !== null && residentCount > bedCount,
  };
}

export async function getActiveResidentCountsByTeam(
  supabase: SupabaseClient,
  careHomeId: string
): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("residents")
    .select("team_id")
    .eq("care_home_id", careHomeId)
    .eq("status", "active");

  if (error) {
    return new Map();
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.team_id) continue;
    counts.set(row.team_id, (counts.get(row.team_id) ?? 0) + 1);
  }

  return counts;
}

export function getCapacityWarningMessage(
  teamName: string,
  residentCount: number,
  bedCount: number,
  projectedCount?: number
): string {
  const count = projectedCount ?? residentCount;
  if (count > bedCount) {
    return `${teamName} is over capacity (${count}/${bedCount} beds). You can still proceed.`;
  }
  return `${teamName} is at capacity (${count}/${bedCount} beds). You can still proceed.`;
}

export function shouldWarnCapacity(
  bedCount: number | null | undefined,
  projectedCount: number
): bedCount is number {
  return bedCount != null && bedCount > 0 && projectedCount >= bedCount;
}

export interface TeamBedRecord {
  id: string;
  bed_count: number | null;
}

export function sumTeamBedCounts(teams: TeamBedRecord[]): number | null {
  const configuredTeams = teams.filter(
    (team) => team.bed_count != null && team.bed_count > 0
  );

  if (configuredTeams.length === 0) {
    return null;
  }

  return configuredTeams.reduce((sum, team) => sum + (team.bed_count ?? 0), 0);
}

export function getBedCapacityForScope(
  scope: { kind: "team" | "care_home" | "organization"; id: string },
  teams: TeamBedRecord[],
  activeResidentCount: number
): number {
  if (scope.kind === "team") {
    const team = teams.find((entry) => entry.id === scope.id);
    if (team?.bed_count != null && team.bed_count > 0) {
      return team.bed_count;
    }
    return Math.max(50, activeResidentCount);
  }

  const totalBedCount = sumTeamBedCounts(teams);
  if (totalBedCount != null && totalBedCount > 0) {
    return totalBedCount;
  }

  return Math.max(50, activeResidentCount);
}

export function computeOccupancyRate(
  activeResidentCount: number,
  bedCapacity: number
): number {
  if (bedCapacity <= 0) {
    return 0;
  }

  return Math.round((activeResidentCount / bedCapacity) * 100);
}
