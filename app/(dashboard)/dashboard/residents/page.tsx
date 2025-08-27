"use client";
import { useQuery } from "convex/react";
import { columns } from "./ columns";
import { DataTable } from "./data-table";
import { api } from "@/convex/_generated/api";
import { useActiveTeam } from "@/hooks/use-active-team";

export default function ResidentsPage() {
  const { activeTeamId, activeTeam } = useActiveTeam();
  
  const residents = useQuery(
    api.residents.getByTeamId, 
    activeTeamId ? { teamId: activeTeamId } : "skip"
  );

  console.dir("ACTIVE TEAM ID", activeTeamId);
  console.dir("RESIDENTS", residents);

  return (
    <div className="container mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Residents</h1>
        {activeTeam && (
          <div className="text-sm text-muted-foreground">
            Team: {activeTeam.name}
          </div>
        )}
      </div>

      <DataTable
        columns={columns}
        data={residents || []}
        teamName={activeTeam?.name ?? ""}
      />
    </div>
  );
}
