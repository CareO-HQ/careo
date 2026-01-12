"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { MoreHorizontalIcon } from "lucide-react";
import { toast } from "sonner";
import { canInviteMembers, type UserRole } from "@/lib/permissions";

export default function InviteActions({
  invitationId
}: {
  invitationId: string;
}) {
  const { data: member } = authClient.useActiveMember();
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: user } = authClient.useSession();
  const router = useRouter();
  const revokeInvitation = useMutation(api.customInvite.revokeInvitationForManager);

  // Fallback: Get role from organization members if activeMember is not available
  const orgMemberRole = activeOrganization?.members?.find(
    (m) => m.user?.email === user?.user?.email || m.userId === user?.user?.id
  )?.role;

  // Use activeMember role first, fallback to org member role
  const userRole = (member?.role || orgMemberRole) as UserRole | undefined;

  // Only owners and managers can manage invitations
  const canManageInvitations = userRole ? canInviteMembers(userRole) : false;

  const handleRevoke = async () => {
    if (!canManageInvitations) {
      toast.error("You don't have permission to revoke invitations");
      return;
    }

    try {
      const result = await revokeInvitation({ invitationId });
      if (result.success) {
        toast.success("Invitation revoked");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to revoke invitation");
      }
    } catch (error) {
      console.error("Error revoking invitation:", error);
      toast.error("Failed to revoke invitation");
    }
  };

  const handleResend = async () => {
    if (!canManageInvitations) {
      toast.error("You don't have permission to resend invitations");
      return;
    }
    toast.success("Invitation resent");
  };

  // Don't show actions if user doesn't have permission
  if (!canManageInvitations) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex flex-row justify-center items-center p-1 rounded-sm hover:bg-accent-foreground/10 group cursor-pointer">
          <MoreHorizontalIcon className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleResend} disabled>Resend</DropdownMenuItem>
        <DropdownMenuItem className="text-destructive" onClick={handleRevoke}>
          Revoke
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
