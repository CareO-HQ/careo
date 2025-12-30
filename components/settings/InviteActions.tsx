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
  const router = useRouter();
  const revokeInvitation = useMutation(api.customInvite.revokeInvitationForManager);

  // Only owners and managers can manage invitations
  const canManageInvitations = member?.role ? canInviteMembers(member.role as UserRole) : false;

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
