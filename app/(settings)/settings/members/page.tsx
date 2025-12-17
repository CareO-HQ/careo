"use client";

import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import InviteActions from "@/components/settings/InviteActions";
import SendInvitationModal from "@/components/settings/SendInvitationModal";
import MemberActions from "@/components/settings/members/MemberActions";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function MembersPage() {
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: user } = authClient.useSession();
  const { data: member } = authClient.useActiveMember();
  const { activeTeamId, activeTeam, isLoading } = useActiveTeam();
  const allTeams = useQuery(api.auth.getTeamsWithMembers, {});
  const updateActiveTeam = useMutation(api.auth.updateActiveTeam);

  // Filter teams to only show those belonging to the active organization
  // and exclude default teams (teams with the same name as the organization)
  const teams = allTeams?.filter((team) => {
    // Only show teams that belong to the active organization
    const belongsToOrg = team.organizationId === activeOrganization?.id;
    // Exclude default teams (teams with the same name as the organization)
    const isNotDefaultTeam = team.name !== activeOrganization?.name;
    return belongsToOrg && isNotDefaultTeam;
  }) || [];

  // Check if the active team belongs to the current organization
  const isValidActiveTeam = activeTeam && 
    activeTeam.organizationId === activeOrganization?.id &&
    activeTeam.name !== activeOrganization?.name;

  // Check if the active team ID exists in the filtered teams list
  const activeTeamInList = activeTeamId && teams.some(team => team.id === activeTeamId);
  
  // Determine the value to show in the Select component
  const selectValue = activeTeamInList ? activeTeamId : "";

  const handleTeamChange = async (teamId: string) => {
    try {
      await updateActiveTeam({ teamId });
      toast.success("Team selected successfully");
    } catch (error) {
      console.error("Error selecting team:", error);
      toast.error("Failed to select team");
    }
  };

  const invitations = activeOrganization?.invitations.filter(
    (invitation) => invitation.status === "pending"
  );

  const isCurrentUser = (email: string) => {
    return email === user?.user.email;
  };

  function showRemoveButton() {
    return member?.role === "owner" || member?.role === "admin";
  }

  const isOwner = member?.role === "owner";
  const isAdmin = member?.role === "admin";

  return (
    <div className="flex flex-col justify-start items-start gap-8">
      <div className="flex items-center justify-between w-full">
        <h1 className="font-semibold text-xl">
          {activeTeamId && isValidActiveTeam && !isLoading
            ? `${activeTeam.name} - Members`
            : "Members"}
        </h1>
        {teams && teams.length > 0 && (
          <Select
            value={selectValue}
            onValueChange={handleTeamChange}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a team" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="flex flex-col justify-start items-start gap-4 w-full">
        <p className="font-medium">Current members</p>
        {activeOrganization?.members.map((member) => (
          <div
            key={member.id}
            className="flex flex-row justify-between items-center w-full"
          >
            <div className="flex flex-row justify-start items-center gap-4 w-full">
              <Avatar>
                <AvatarImage src={member.user.image} />
                <AvatarFallback>{member.user.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col justify-start items-start">
                <div className="flex flex-row justify-start items-center gap-4">
                  <p className="font-medium text-sm">{member.user.name}</p>
                  {isCurrentUser(member.user.email) && (
                    <p className="text-xs text-primary bg-accent px-1.5 rounded-lg">
                      You
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {member.user.email}
                </p>
              </div>
            </div>
            <div className="flex flex-row justify-end items-center gap-2">
              <p className="text-xs text-muted-foreground mr-2">
                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
              </p>
              {showRemoveButton() && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      member.role === "owner" ||
                      isCurrentUser(member.user.email)
                    }
                  >
                    Remove
                  </Button>
                  <MemberActions
                    memberId={member.id}
                    memberName={member.user.name || member.user.email}
                    userId={member.userId}
                    email={member.user.email}
                    isOwner={isOwner || isAdmin}
                  />
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <Separator />
      <div className="flex flex-col justify-start items-start gap-4 w-full">
        <div className="flex flex-row justify-between items-center w-full">
          <p className="font-medium">Pending invitations</p>
          <SendInvitationModal />
        </div>
        {invitations?.length ? (
          invitations?.map((invitation) => (
            <div
              key={invitation.id}
              className="flex flex-row justify-between items-center w-full"
            >
              <p className="font-medium text-sm text-muted-foreground">
                {invitation.email}
              </p>
              <div className="flex flex-row justify-end items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  {invitation.role.charAt(0).toUpperCase() +
                    invitation.role.slice(1)}
                </p>
                <InviteActions invitationId={invitation.id} />
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">No invitations sent</p>
        )}
      </div>
    </div>
  );
}
