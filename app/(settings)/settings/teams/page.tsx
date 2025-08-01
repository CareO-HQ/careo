"use client";

import { columns } from "@/components/settings/teams/columns";
import { DataTable } from "@/components/DataTable";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function TeamsPage() {
  // Use the real query to get actual teams data
  const teamsWithMembers = useQuery(api.auth.getTeamsWithMembers, {});
  console.log("Teams data:", teamsWithMembers);

  // Add error boundary-like protection
  if (teamsWithMembers === undefined) {
    return (
      <div className="flex flex-col justify-start items-start gap-8">
        <p className="font-semibold text-xl">Teams</p>
        <div>Loading teams...</div>
      </div>
    );
  }

  if (!Array.isArray(teamsWithMembers)) {
    return (
      <div className="flex flex-col justify-start items-start gap-8">
        <p className="font-semibold text-xl">Teams</p>
        <div>Error loading teams data: {JSON.stringify(teamsWithMembers)}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-start items-start gap-8">
      <p className="font-semibold text-xl">Teams</p>
      <div className="flex flex-col justify-start items-start gap-2 w-full">
        <DataTable columns={columns} data={teamsWithMembers} redirectTeam />
      </div>
    </div>
  );
}
