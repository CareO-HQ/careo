"use client";
import { useQuery } from "convex/react";
import { columns } from "./ columns";
import { DataTable } from "./data-table";
import { api } from "@/convex/_generated/api";
import { useActiveTeam } from "@/hooks/use-active-team";
import { authClient } from "@/lib/auth-client";

export default function ResidentsPage() {
  const { activeTeamId, activeTeam } = useActiveTeam();
  const { data: activeOrganization } = authClient.useActiveOrganization();
  
  const teamResidents = useQuery(
    api.residents.getByTeamId, 
    activeTeamId ? { teamId: activeTeamId } : "skip"
  );
  
  const organizationResidents = useQuery(
    api.residents.getByOrganization,
    !activeTeamId && activeOrganization?.id ? { organizationId: activeOrganization.id } : "skip"
  );
  const residents = activeTeamId ? teamResidents : organizationResidents;

  return (
    <div className="container mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Residents</h1>
      </div>
      <DataTable
        columns={columns}
        data={residents || []}
        teamName={activeTeam?.name ?? activeOrganization?.name ?? ""}
      />
    </div>
  );
}
