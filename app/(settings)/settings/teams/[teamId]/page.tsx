"use client";

import { DataTable } from "@/components/DataTable";
import { columns } from "@/components/settings/teams/singleTeam/columns";
import DeleteTeamModal from "@/components/settings/teams/singleTeam/DeleteTeamModal";
import UpdateTeamForm from "@/components/settings/teams/UpdateTeamForm";
import { Separator } from "@/components/ui/separator";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useParams } from "next/navigation";

export default function TeamPage() {
  const { teamId } = useParams();
  const team = useQuery(api.teams.getTeam, { teamId: teamId as string });

  return (
    <div className="flex flex-col justify-start items-start gap-8">
      <p className="font-semibold text-xl">{team?.name}</p>
      <div className="flex flex-col justify-start items-start gap-2 w-full">
        <UpdateTeamForm teamId={teamId as string} teamName={team?.name ?? ""} />
      </div>
      <Separator />
      <div className="flex flex-col justify-start items-start gap-2 w-full">
        <p className="font-medium">Members</p>
        <div className="flex flex-col justify-start items-start gap-2 w-full">
          <DataTable columns={columns} data={team?.members ?? []} />
        </div>
      </div>
      <Separator />
      <div className="flex flex-col justify-start items-start gap-2 w-full">
        <p className="font-medium">Delete team</p>
        <div className="w-full flex flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Delete{" "}
            <span className="font-semibold text-primary">{team?.name}</span>{" "}
            permanently for all members.
          </p>
          <DeleteTeamModal teamId={teamId as string} />
        </div>
      </div>
    </div>
  );
}
