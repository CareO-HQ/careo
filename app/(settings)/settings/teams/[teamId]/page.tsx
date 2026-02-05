"use client";

import { DataTable } from "@/components/DataTable";
import { columns } from "@/components/settings/teams/singleTeam/columns";
import DeleteTeamModal from "@/components/settings/teams/singleTeam/DeleteTeamModal";
import UpdateTeamForm from "@/components/settings/teams/UpdateTeamForm";
import { Separator } from "@/components/ui/separator";
import { useParams } from "next/navigation";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useEffect, useState } from "react";

interface TeamMember {
  id: string;
  userId: string;
  email: string;
  name: string;
  image: string | null;
  role: string;
  organizationId: string;
}

interface Team {
  id: string;
  name: string;
  organization_id: string;
  members: TeamMember[];
}

export default function TeamPage() {
  const { teamId } = useParams();
  const { supabase } = useSupabase();
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!teamId || !supabase) {
      setIsLoading(false);
      return;
    }

    const fetchTeam = async () => {
      try {
        // Fetch team
        const { data: teamData, error: teamError } = await supabase
          .from("teams")
          .select("id, name, organization_id")
          .eq("id", teamId as string)
          .single();

        if (teamError) throw teamError;
        if (!teamData) {
          setIsLoading(false);
          return;
        }

        // Fetch team members via team_staff
        const { data: teamStaffData, error: staffError } = await supabase
          .from("team_staff")
          .select(`
            user_id,
            users:user_id (
              id,
              email,
              name,
              image_url,
              role,
              active_organization_id
            )
          `)
          .eq("team_id", teamId as string);

        if (staffError) throw staffError;

        // Transform to match expected format
        const members: TeamMember[] = (teamStaffData || [])
          .map((item: any) => {
            const user = item.users;
            if (!user) return null;
            return {
              id: user.id,
              userId: user.id,
              email: user.email || "",
              name: user.name || user.email?.split("@")[0] || "",
              image: user.image_url || null,
              role: user.role || "",
              organizationId: user.active_organization_id || teamData.organization_id,
            };
          })
          .filter((m): m is TeamMember => m !== null);

        setTeam({
          id: teamData.id,
          name: teamData.name,
          organization_id: teamData.organization_id,
          members,
        });
      } catch (error) {
        console.error("Error fetching team:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeam();
  }, [teamId, supabase]);

  if (isLoading) {
    return (
      <div className="flex flex-col justify-start items-start gap-8">
        <p className="font-semibold text-xl">Loading...</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex flex-col justify-start items-start gap-8">
        <p className="font-semibold text-xl">Team not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-start items-start gap-8">
      <p className="font-semibold text-xl">{team.name}</p>
      <div className="flex flex-col justify-start items-start gap-2 w-full">
        <UpdateTeamForm teamId={teamId as string} teamName={team.name} />
      </div>
      <Separator />
      <div className="flex flex-col justify-start items-start gap-2 w-full">
        <p className="font-medium">Members</p>
        <div className="flex flex-col justify-start items-start gap-2 w-full">
          <DataTable columns={columns} data={team.members} />
        </div>
      </div>
      <Separator />
      <div className="flex flex-col justify-start items-start gap-2 w-full">
        <p className="font-medium">Delete team</p>
        <div className="w-full flex flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Delete{" "}
            <span className="font-semibold text-primary">{team.name}</span>{" "}
            permanently for all members.
          </p>
          <DeleteTeamModal teamId={teamId as string} />
        </div>
      </div>
    </div>
  );
}
