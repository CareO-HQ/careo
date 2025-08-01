"use client";

import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import InviteActions from "@/components/settings/InviteActions";
import SendInvitationModal from "@/components/settings/SendInvitationModal";
import MemberActions from "@/components/settings/members/MemberActions";

export default function MembersPage() {
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: user } = authClient.useSession();
  const { data: member } = authClient.useActiveMember();

  const invitations = activeOrganization?.invitations.filter(
    (invitation) => invitation.status === "pending"
  );

  const isCurrentUser = (email: string) => {
    return email === user?.user.email;
  };

  function showRemoveButton() {
    return member?.role === "owner" || member?.role === "admin";
  }

  return (
    <div className="flex flex-col justify-start items-start gap-8">
      <p className="font-semibold text-xl">Members</p>
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
