"use client";

import CreateMedicationDemo from "@/components/medication/demo/CreateMedicationDemo";
import { DataTable } from "./data-table";
import { columns } from "./ columns";
import data from "./data.json";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function MedicationPage() {
  const { activeTeamId, activeTeam } = useActiveTeam();
  const medications = useQuery(api.medication.getActiveByTeamId, {
    teamId: activeTeamId
  });
  const todaysMedicationIntakes = useQuery(
    api.medication.getTodaysMedicationIntakes,
    {
      teamId: activeTeamId
    }
  );
  console.dir("TODAYS MEDICATION INTAKES", todaysMedicationIntakes);
  console.dir("MEDICATIONS", medications);
  return (
    <div>
      <CreateMedicationDemo />
      <DataTable
        columns={columns}
        data={data}
        teamName={activeTeam?.name ?? ""}
      />
    </div>
  );
}
