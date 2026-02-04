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
        // Fetch ALL users in the organization to check for existing users
        const { data: allUsersData, error: allUsersError } = await supabase
          .from('users')
          .select('email, is_onboarding_complete')
          .eq('active_organization_id', activeOrganizationId);

        if (allUsersError) throw allUsersError;

        // Fetch fully onboarded members
        const { data: membersData, error: membersError } = await supabase
          .from('users')
          .select('*')
          .eq('active_organization_id', activeOrganizationId)
          .eq('is_onboarding_complete', true);

        if (membersError) throw membersError;

        setMembers(membersData || []);

        // 1. Fetch current members (onboarding complete)
        const { data: currentMembers, error: currentMembersError } = await supabase
          .from("users")
          .select("*")
          .eq("active_organization_id", activeOrganizationId)
          .eq("is_onboarding_complete", true);

        if (currentMembersError) throw currentMembersError;
        setMembers(currentMembers || []);

        // 2. Fetch pending users (accepted invitation but onboarding incomplete)
        const { data: pendingUsersData, error: pendingUsersError } = await supabase
          .from("users")
          .select("*")
          .eq("active_organization_id", activeOrganizationId)
          .eq("is_onboarding_complete", false);

        if (pendingUsersError) throw pendingUsersError;

        // 3. Fetch invitations that haven't been accepted yet
        const { data: invitationsData, error: invitationsError } = await supabase
          .from("invitations")
          .select("*")
          .eq("organization_id", activeOrganizationId)
          .eq("status", "pending");

        if (invitationsError) throw invitationsError;

        // Get emails of ALL existing users in the organization (regardless of onboarding status)
        // This ensures we filter out invitations for any user that exists in the users table
        const existingUserEmails = new Set(
          (allUsersData || [])
            .map((u: any) => u.email?.toLowerCase().trim())
            .filter((email: string | undefined) => email) // Remove undefined/null emails
        );

        const currentUserEmail = profile?.email?.toLowerCase().trim();

        // Filter out invitations for any existing user and current user
        const filteredInvitations = (invitationsData || []).filter((invitation: any) => {
          const invitationEmail = invitation.email?.toLowerCase().trim();

          // Exclude if email matches any existing user in the organization
          if (invitationEmail && existingUserEmails.has(invitationEmail)) {
            return false;
          }

          // Exclude if email matches current user
          if (currentUserEmail && invitationEmail === currentUserEmail) {
            return false;
          }

          return true;
        });

        // Filter out current user from pending users awaiting onboarding
        const filteredPendingUsers = (pendingUsersData || []).filter((u: any) => {
          const userEmail = u.email?.toLowerCase().trim();
          // Exclude current user
          if (currentUserEmail && userEmail === currentUserEmail) {
            return false;
          }
          return true;
        });

        // Combine invitations and users awaiting onboarding
        // For users, we'll format them to match invitation structure for consistent rendering
        const normalizedPendingUsers = filteredPendingUsers.map(u => ({
          ...u,
          isUser: true,
          email: u.email,
          role: u.role,
        }));

        setInvitations([
          ...normalizedPendingUsers,
          ...filteredInvitations
        ]);

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
          active_team_id: null,
          is_onboarding_complete: false
        })
        .eq('id', memberId);

      if (error) throw error;

      toast.success("Member removed from organization");
      setMembers(members.filter(m => m.id !== memberId));
      // Also remove from invitations list if they were pending
      setInvitations(invitations.filter(i => (i.id !== memberId && !i.isUser) || (i.id !== memberId && i.isUser)));
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
                <div className="flex flex-col">
                  <p className="font-medium text-sm text-muted-foreground">
                    {invitation.email}
                  </p>
                  {invitation.isUser && (
                    <p className="text-[10px] text-primary/70 font-medium">Joined - Onboarding pending</p>
                  )}
                </div>
                <div className="flex flex-row justify-end items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    {formatRoleName(invitation.role)}
                  </p>
                  {invitation.isUser ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveMember(invitation.id)}
                    >
                      Remove
                    </Button>
                  ) : (
                    <InviteActions invitationId={invitation.id} />
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No pending invitations</p>
          )}
        </div>
      )}
    </div>
  );
}
