"use client";

import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import InviteActions from "@/components/settings/InviteActions";
import SendInvitationModal from "@/components/settings/SendInvitationModal";
import MemberActions from "@/components/settings/members/MemberActions";
import { formatRoleName } from "@/lib/utils";
import { canInviteMembers, type UserRole } from "@/lib/permissions";
import { useEffect, useState } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";
import { toast } from "sonner";

export default function MembersPage() {
  const { profile } = useProfile();
  const { supabase } = useSupabase();
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const activeOrganizationId = profile?.active_organization_id;
  const userRole = profile?.role as UserRole | undefined;

  useEffect(() => {
    async function fetchData() {
      if (!supabase || !activeOrganizationId) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch members
        const { data: membersData, error: membersError } = await supabase
          .from('users')
          .select('*')
          .eq('active_organization_id', activeOrganizationId);

        if (membersError) throw membersError;

        setMembers(membersData || []);

        // Fetch invitations
        const { data: invitationsData, error: invitationsError } = await supabase
          .from('invitations')
          .select('*')
          .eq('organization_id', activeOrganizationId)
          .eq('status', 'pending');

        if (invitationsError) throw invitationsError;

        setInvitations(invitationsData || []);

      } catch (error) {
        console.error("Error fetching members data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [supabase, activeOrganizationId]);

  const handleRemoveMember = async (memberId: string) => {
    if (!supabase) return;

    try {
      // First delete from team_staff to remove them from all teams
      const { error: teamStaffError } = await supabase
        .from('team_staff')
        .delete()
        .eq('user_id', memberId);

      if (teamStaffError) throw teamStaffError;

      // Then remove from organization by clearing all active context fields
      const { error } = await supabase
        .from('users')
        .update({
          active_organization_id: null,
          active_care_home_id: null,
          active_team_id: null
        })
        .eq('id', memberId);

      if (error) throw error;

      toast.success("Member removed from organization");
      setMembers(members.filter(m => m.id !== memberId));
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    }
  };

  const isCurrentUser = (email: string) => {
    return email === profile?.email;
  };

  function showRemoveButton() {
    return userRole === "owner" || userRole === "manager";
  }

  const isOwner = userRole === "owner";

  if (isLoading) {
    return (
      <div className="flex flex-col justify-start items-start gap-8">
        <p className="font-semibold text-xl">Members</p>
        <div className="flex flex-col justify-center items-center w-full py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground mt-4">Loading members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-start items-start gap-8">
      <p className="font-semibold text-xl">Members</p>
      <div className="flex flex-col justify-start items-start gap-4 w-full">
        <p className="font-medium">Current members</p>
        {members && members.length > 0 ? (
          members.map((member) => (
            <div
              key={member.id}
              className="flex flex-row justify-between items-center w-full"
            >
              <div className="flex flex-row justify-start items-center gap-4 w-full">
                <Avatar>
                  <AvatarImage src={member.image_url} />
                  <AvatarFallback>{member.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col justify-start items-start">
                  <div className="flex flex-row justify-start items-center gap-4">
                    <p className="font-medium text-sm">{member.name}</p>
                    {isCurrentUser(member.email) && (
                      <p className="text-xs text-primary bg-accent px-1.5 rounded-lg">
                        You
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {member.email}
                  </p>
                </div>
              </div>
              <div className="flex flex-row justify-end items-center gap-4">
                <p className="text-xs text-muted-foreground mr-2">
                  {formatRoleName(member.role || 'member')}
                </p>
                {showRemoveButton() && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        member.role === "owner" ||
                        isCurrentUser(member.email)
                      }
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      Remove
                    </Button>
                    <MemberActions
                      memberId={member.id}
                      memberName={member.name || member.email}
                      userId={member.id}
                      email={member.email}
                      isOwner={isOwner}
                    />
                  </>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">No members found</p>
        )}
      </div>
      <Separator />
      {/* Show invite section for owners and managers */}
      {(userRole === "owner" || userRole === "manager") && (
        <div className="flex flex-col justify-start items-start gap-4 w-full">
          <div className="flex flex-row justify-between items-center w-full">
            <p className="font-medium">Pending invitations</p>
            <SendInvitationModal />
          </div>
          {invitations && invitations.length > 0 ? (
            invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex flex-row justify-between items-center w-full"
              >
                <p className="font-medium text-sm text-muted-foreground">
                  {invitation.email}
                </p>
                <div className="flex flex-row justify-end items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    {formatRoleName(invitation.role)}
                  </p>
                  <InviteActions invitationId={invitation.id} />
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No invitations sent</p>
          )}
        </div>
      )}
    </div>
  );
}
