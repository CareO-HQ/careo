"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { MoreHorizontalIcon } from "lucide-react";
import { toast } from "sonner";
import { canInviteMembers, type UserRole } from "@/lib/permissions";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";
import { sendInvitationEmail } from "@/app/actions/invitations";

export default function InviteActions({
  invitationId
}: {
  invitationId: string;
}) {
  const { profile } = useProfile();
  const { supabase } = useSupabase();

  const userRole = profile?.role as UserRole | undefined;

  // Only owners and managers can manage invitations
  const canManageInvitations = userRole ? canInviteMembers(userRole) : false;

  const handleRevoke = async () => {
    if (!canManageInvitations || !supabase) {
      toast.error("You don't have permission to revoke invitations");
      return;
    }

    try {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'revoked' })
        .eq('id', invitationId);

      if (error) {
        throw error;
      }

      toast.success("Invitation revoked");
      window.location.reload();
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

    try {
      if (!supabase) return;

      // 1. Fetch invitation details
      const { data: invite, error: inviteError } = await supabase
        .from('invitations')
        .select(`
          email,
          role,
          token,
          organizations (
            id,
            name
          )
        `)
        .eq('id', invitationId)
        .single();

      if (inviteError || !invite) {
        throw new Error("Invitation not found");
      }

      const organizationName = (invite.organizations as any)?.name || "your organization";
      const organizationId = (invite.organizations as any)?.id || "";

      // 2. Call the email action
      const result = await sendInvitationEmail({
        email: invite.email,
        organizationId: organizationId,
        organizationName: organizationName,
        inviterName: profile?.name || "A team member",
        token: invite.token,
        role: invite.role as string
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success("Invitation email resent successfully");
    } catch (error: any) {
      console.error("Error resending invitation:", error);
      toast.error(error.message || "Failed to resend invitation");
    }
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
        <DropdownMenuItem onClick={handleResend}>Resend</DropdownMenuItem>
        <DropdownMenuItem className="text-destructive" onClick={handleRevoke}>
          Revoke
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
