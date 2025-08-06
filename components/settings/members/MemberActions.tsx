"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { EllipsisVerticalIcon, UsersIcon } from "lucide-react";

import { useMutation } from "convex/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface MemberActionsProps {
  memberId: string;
  memberName: string;
  isOwner: boolean;
}

export default function MemberActions({
  memberId,
  memberName,
  isOwner
}: MemberActionsProps) {
  const teams = useQuery(api.auth.getTeamsWithMembers, {});
  const memberTeams = useQuery(
    api.auth.getMemberTeams,
    memberId ? { memberId } : "skip"
  );
  const addMemberToTeam = useMutation(api.auth.addMemberToTeam);
  const removeMemberFromTeam = useMutation(api.auth.removeMemberFromTeam);
  const router = useRouter();

  const handleTeamSelect = async (teamId: string, teamName: string) => {
    if (!memberId) {
      toast.error("No member selected");
      return;
    }

    try {
      console.log("Adding member to team", memberId, teamId);
      await addMemberToTeam({
        memberId: memberId,
        teamId: teamId
      });

      toast.success(
        `Successfully added ${memberName || "member"} to ${teamName}`
      );
    } catch (error) {
      toast.error(`Failed to add ${memberName || "member"} to ${teamName}`);
      console.error("Error adding team member:", error);
    }
  };

  const handleRemoveFromTeam = async (teamId: string, teamName: string) => {
    if (!memberId) {
      toast.error("No member selected");
      return;
    }

    try {
      await removeMemberFromTeam({
        memberId: memberId,
        teamId: teamId
      });

      toast.success(
        `Successfully removed ${memberName || "member"} from ${teamName}`
      );
    } catch (error) {
      toast.error(
        `Failed to remove ${memberName || "member"} from ${teamName}`
      );
      console.error("Error removing team member:", error);
    }
  };

  const isInTeam = (teamId: string) => {
    return memberTeams?.some((memberTeam) => memberTeam.id === teamId);
  };

  const handleManageSessions = () => {
    router.push(`/settings/members/session?memberId=${memberId}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="p-0 w-fit">
        <EllipsisVerticalIcon className="w-4 h-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {isOwner && (
          <>
            <DropdownMenuItem onClick={handleManageSessions}>
              <p>Manage sessions</p>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <UsersIcon className="w-4 h-4 mr-2" />
            Manage Teams
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {teams && teams.length > 0 ? (
              teams.map((team) => {
                const isMember = isInTeam(team.id);
                return (
                  <DropdownMenuItem
                    key={team.id}
                    onClick={() =>
                      isMember
                        ? handleRemoveFromTeam(team.id, team.name)
                        : handleTeamSelect(team.id, team.name)
                    }
                    className="cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span className={isMember ? "text-green-600" : ""}>
                          {team.name}
                        </span>
                        {isMember && (
                          <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                            Member
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {team.members} members
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {isMember ? "Remove" : "Add"}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuItem>
                );
              })
            ) : (
              <DropdownMenuItem disabled>
                <span className="text-muted-foreground">
                  No teams available
                </span>
              </DropdownMenuItem>
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
