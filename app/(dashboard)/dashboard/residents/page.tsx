"use client";

import { useQuery } from "convex/react";
import { columns } from "./ columns";
import { DataTable } from "./data-table";
import data from "./data.json";
import { api } from "@/convex/_generated/api";
import { useActiveTeam } from "@/hooks/use-active-team";

export default function ResidentsPage() {
  const { activeTeamId, activeTeam } = useActiveTeam();
  const residents = useQuery(api.residents.getByTeamId, {
    teamId: activeTeamId ?? "skip"
  });
  return (
    <div className="container mx-auto ">
      <h1 className="text-2xl font-bold mb-4">Residents</h1>
      <DataTable
        columns={columns}
        data={data}
        teamName={activeTeam?.name ?? ""}
      />
      <pre>{JSON.stringify(residents, null, 2)}</pre>
    </div>
  );
}
