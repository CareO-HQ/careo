"use client";
import { api } from "@/convex/_generated/api";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useQuery } from "convex/react";
import { columns } from "./ columns";
import { DataTable } from "./data-table";
import { Resident } from "@/types";

export default function ResidentsPage() {
  const { activeTeamId, activeTeam } = useActiveTeam();
  const residents = useQuery(api.residents.getByTeamId, {
    teamId: activeTeamId ?? "skip"
  }) as Resident[] | undefined;
  return (
    <div className="container mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Residents</h1>
      </div>
      <DataTable<Resident, unknown>
        columns={columns}
        data={residents || []}
        teamName={activeTeam?.name ?? ""}
      />
    </div>
  );
}
