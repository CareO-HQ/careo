"use client";

import { columns } from "@/components/settings/teams/columns";
import { DataTable } from "@/components/DataTable";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useEffect, useState } from "react";

interface TeamWithMembers {
  id: string;
  name: string;
  organizationId: string;
  createdAt: number;
  members: number;
}

export default function TeamsPage() {
  const { supabase } = useSupabase();
  const { activeOrganizationId } = useActiveTeam();
  const [teamsWithMembers, setTeamsWithMembers] = useState<TeamWithMembers[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!activeOrganizationId || !supabase) {
      setIsLoading(false);
      return;
    }

    const fetchTeams = async () => {
      try {
        // Fetch teams
        const { data: teamsData, error: teamsError } = await supabase
          .from("teams")
          .select("id, name, organization_id, created_at")
          .eq("organization_id", activeOrganizationId)
          .order("created_at", { ascending: false });

        if (teamsError) throw teamsError;

        // Fetch member counts for each team
        const teamsWithCounts = await Promise.all(
          (teamsData || []).map(async (team) => {
            const { count, error: countError } = await supabase
              .from("team_staff")
              .select("*", { count: "exact", head: true })
              .eq("team_id", team.id);

            if (countError) {
              console.error(`Error counting members for team ${team.id}:`, countError);
              return {
                id: team.id,
                name: team.name,
                organizationId: team.organization_id,
                createdAt: new Date(team.created_at).getTime(),
                members: 0,
              };
            }

            return {
              id: team.id,
              name: team.name,
              organizationId: team.organization_id,
              createdAt: new Date(team.created_at).getTime(),
              members: count || 0,
            };
          })
        );

        setTeamsWithMembers(teamsWithCounts);
      } catch (error) {
        console.error("Error fetching teams:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeams();
  }, [activeOrganizationId, supabase]);

  if (isLoading) {
    return (
      <div className="flex flex-col justify-start items-start gap-8">
        <p className="font-semibold text-xl">Teams</p>
        <div>Loading teams...</div>
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
