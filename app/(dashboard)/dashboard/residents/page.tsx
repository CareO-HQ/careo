"use client";
import { api } from "@/convex/_generated/api";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useQuery } from "convex/react";
import { columns } from "./ columns";
import { DataTable } from "./data-table";
import { Resident } from "@/types";

export default function ResidentsPage() {
  const { activeTeamId, activeTeam, activeOrganizationId, activeOrganization } = useActiveTeam();

  // Fetch residents - either for specific team or entire organization
  const residents = useQuery(
    activeTeamId
      ? api.residents.getByTeamId
      : activeOrganizationId
      ? api.residents.getByOrganization
      : "skip",
    activeTeamId
      ? { teamId: activeTeamId }
      : activeOrganizationId
      ? { organizationId: activeOrganizationId }
      : "skip"
  ) as Resident[] | undefined;

  // Determine display name for header
  const displayName = activeTeamId
    ? activeTeam?.name || 'selected unit'
    : activeOrganizationId
    ? `All units in ${activeOrganization?.name || 'care home'}`
    : '';

  return (
    <div className="container mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Residents</h1>
      </div>
      <DataTable<Resident, unknown>
        columns={columns}
        data={residents || []}
        teamName={displayName}
      />
    </div>
  );
}
