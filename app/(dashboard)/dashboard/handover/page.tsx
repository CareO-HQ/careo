"use client";

import { api } from "@/convex/_generated/api";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useQuery } from "convex/react";
import { Resident } from "@/types";
import { Button } from "@/components/ui/button";
import { columns } from "./columns";
import { DataTable } from "./data-table";

export default function HandoverPage() {
  const { activeTeamId, activeTeam } = useActiveTeam();
  const residents = useQuery(api.residents.getByTeamId, {
    teamId: activeTeamId ?? "skip"
  }) as Resident[] | undefined;

  return (
    <div className="container mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Handover Sheet</h1>
        <Button variant="outline">All Handovers</Button>
      </div>
      <DataTable<Resident, unknown>
        columns={columns}
        data={residents || []}
        teamName={activeTeam?.name ?? ""}
      />
    </div>
  );
}