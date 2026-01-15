"use client";

import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import InviteActions from "@/components/settings/InviteActions";
import SendInvitationModal from "@/components/settings/SendInvitationModal";
import MemberActions from "@/components/settings/members/MemberActions";
import { formatRoleName } from "@/lib/utils";
import { canInviteMembers, type UserRole } from "@/lib/permissions";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useRef } from "react";

export default function MembersPage() {
  const { data: activeOrganization, isPending: orgPending } = authClient.useActiveOrganization();
  const { data: user } = authClient.useSession();
  const { data: member, isPending: memberPending } = authClient.useActiveMember();
  
  // Fallback: Use Convex query to get user role and organization if Better Auth hooks fail
  const currentUser = useQuery(api.auth.getCurrentUser);
  
  // Mutation to ensure active organization is set in session
  const ensureAndSetActiveOrganization = useMutation(api.auth.ensureAndSetActiveOrganization);
  const hasEnsuredOrg = useRef(false);
  
  // Get organization ID from Better Auth hook or Convex query fallback
  const organizationId = activeOrganization?.id || currentUser?.activeOrganizationId;
  
  // Ensure active organization is set in session to prevent Better Auth 500 errors
  useEffect(() => {
    // Only run once and only if we have an organizationId from fallback but not from Better Auth hook
    if (
      !hasEnsuredOrg.current &&
      !activeOrganization?.id &&
      currentUser?.activeOrganizationId &&
      !orgPending &&
      currentUser !== undefined
    ) {
      hasEnsuredOrg.current = true;
      ensureAndSetActiveOrganization().catch((error) => {
        console.error("[MembersPage] Error ensuring active organization:", error);
        // Don't fail - fallback queries will handle it
      });
    }
  }, [activeOrganization?.id, currentUser?.activeOrganizationId, orgPending, currentUser, ensureAndSetActiveOrganization]);
  
  // Fetch organization data (members and invitations) using Convex query as fallback
  const orgData = useQuery(
    api.teams.getOrganizationData,
    organizationId ? { organizationId } : "skip"
  );
  
  // Direct query to get current user's role from member record
  const directUserRole = useQuery(
    api.teams.getCurrentUserRole,
    organizationId ? { organizationId } : "skip"
  );

  // Get all possible identifiers for the current user
  const currentUserEmail = user?.user?.email || currentUser?.email;
  const currentUserId = user?.user?.id || member?.userId || currentUser?.id;
  
  // Fallback: Get role from organization members if activeMember is not available
  const orgMemberRole = activeOrganization?.members?.find(
    (m) => (currentUserEmail && m.user?.email === currentUserEmail) || 
           (currentUserId && m.userId === currentUserId)
  )?.role;
  
  // Also check orgData members if Better Auth hook failed
  // Try multiple matching strategies
  const orgDataMemberRole = orgData?.members?.find(
    (m) => {
      // Match by email
      if (currentUserEmail && m.email === currentUserEmail) return true;
      // Match by userId
      if (currentUserId && m.userId === currentUserId) return true;
      // Match by currentUser.id if it's a string
      if (currentUser?.id && typeof currentUser.id === 'string' && m.userId === currentUser.id) return true;
      return false;
    }
  )?.role;

  // Use activeMember role first, fallback to org member role, then fallback to Convex queries
  // Priority: activeMember > orgMemberRole > orgDataMemberRole > directUserRole > currentUser.role
  const userRole = (member?.role || orgMemberRole || orgDataMemberRole || directUserRole || currentUser?.role) as UserRole | undefined;
  const activeMember = member;
  
  // Use activeOrganization from Better Auth hook, or fallback to orgData
  const effectiveActiveOrganization = activeOrganization || (orgData ? {
    id: organizationId || "",
    name: currentUser?.activeOrganization?.name || "",
    members: orgData.members.map(m => ({
      id: m.id,
      userId: m.userId,
      user: {
        email: m.email,
        name: m.name,
        image: m.image
      },
      role: m.role
    })),
    invitations: orgData.invitations.map(inv => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      inviterId: inv.inviterId
    }))
  } : null);

  // If we still don't have a role but have organizationId, try to infer role from orgData
  // First, try to find the current user in orgData.members using all possible identifiers
  let inferredRole: UserRole | undefined = undefined;
  if (!userRole && organizationId && orgData?.members && orgData.members.length > 0) {
    // Try to find current user in members list
    const currentUserMember = orgData.members.find(
      (m) => {
        if (currentUserEmail && m.email === currentUserEmail) return true;
        if (currentUserId && m.userId === currentUserId) return true;
        if (currentUser?.id && typeof currentUser.id === 'string' && m.userId === currentUser.id) return true;
        return false;
      }
    );
    
    if (currentUserMember?.role) {
      inferredRole = currentUserMember.role as UserRole;
    } else if (orgData.members.length === 1) {
      // If there's only one member, they're likely the owner
      inferredRole = orgData.members[0]?.role === "owner" ? "owner" : undefined;
    } else {
      // If we can't find the user but there are members, check if any member is an owner
      // This is a last resort - ideally we should always find the user
      const ownerMember = orgData.members.find(m => m.role === "owner");
      if (ownerMember && currentUserEmail && ownerMember.email === currentUserEmail) {
        inferredRole = "owner";
      }
    }
  }
  
  // Final role: use detected role or inferred role
  const finalUserRole = userRole || inferredRole;

  // Debug: Log role detection
  if (typeof window !== 'undefined') {
    console.log('[MembersPage] Role detection:', {
      memberRole: member?.role,
      orgMemberRole,
      orgDataMemberRole,
      directUserRole,
      currentUserRole: currentUser?.role,
      inferredRole,
      finalUserRole,
      userRole,
      hasMember: !!member,
      hasActiveOrg: !!activeOrganization,
      hasOrgData: !!orgData,
      hasCurrentUser: !!currentUser,
      organizationId,
      activeOrgId: activeOrganization?.id || currentUser?.activeOrganizationId,
      effectiveOrgMembers: effectiveActiveOrganization?.members?.length || 0,
      effectiveOrgInvitations: effectiveActiveOrganization?.invitations?.length || 0,
      currentUserEmail,
      currentUserId,
      orgDataMembers: orgData?.members?.map(m => ({ email: m.email, userId: m.userId, role: m.role })) || []
    });
  }

  // Filter invitations:
  // - Owners can see all pending invitations
  // - Managers can only see invitations they sent themselves
  const invitations = effectiveActiveOrganization?.invitations?.filter(
    (invitation) => {
      if (invitation.status !== "pending") {
        return false;
      }
      
      // Owners can see all invitations
      if (finalUserRole === "owner") {
        return true;
      }
      
      // Managers can only see invitations they sent
      if (finalUserRole === "manager") {
        // Check if the invitation was sent by the current user
        // inviterId might be available on the invitation object (from better-auth)
        const invitationInviterId = (invitation as any).inviterId;
        
        // If inviterId is available, check if it matches the current user
        if (invitationInviterId && currentUserId) {
          return String(invitationInviterId) === String(currentUserId);
        }
        
        // If inviterId is not available, don't show the invitation to managers
        // (This is a security measure - if we can't verify who sent it, managers shouldn't see it)
        return false;
      }
      
      // Other roles shouldn't see any invitations
      return false;
    }
  );

  const isCurrentUser = (email: string) => {
    return email === user?.user.email;
  };

  function showRemoveButton() {
    return finalUserRole === "owner" || finalUserRole === "manager";
  }

  const isOwner = finalUserRole === "owner";
  const isManager = finalUserRole === "manager";
  
  // Show loading state only if we have no data at all and hooks are still loading
  // If we have fallback data (orgData or currentUser), show the page even if hooks are loading
  const isLoading = (orgPending || memberPending) && !orgData && !currentUser && !organizationId;

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
        {effectiveActiveOrganization?.members && effectiveActiveOrganization.members.length > 0 ? (
          effectiveActiveOrganization.members.map((member) => (
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
                {formatRoleName(member.role)}
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
      {/* Use finalUserRole which includes inferred role for owners */}
      {(finalUserRole === "owner" || finalUserRole === "manager") && (
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
