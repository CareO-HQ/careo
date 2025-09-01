"use client";
import { useQuery } from "convex/react";
import { columns } from "./ columns";
import { DataTable } from "./data-table";
import { api } from "@/convex/_generated/api";
import { useActiveTeam } from "@/hooks/use-active-team";

export default function ResidentsPage() {
  const { activeTeamId, activeTeam } = useActiveTeam();
  const residents = useQuery(api.residents.getByTeamId, {
    teamId: activeTeamId ?? "skip"
  });
  return (
    <div className="container mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Residents</h1>
      </div>
      <DataTable
        columns={columns}
        data={residents || []}
        teamName={activeTeam?.name ?? ""}
      />
      {/* <pre>{JSON.stringify(residents, null, 2)}</pre> */}
    </div>
  );
}
