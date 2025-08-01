"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { MoreHorizontalIcon } from "lucide-react";
import { toast } from "sonner";

export default function InviteActions({
  invitationId
}: {
  invitationId: string;
}) {
  const handleRevoke = async () => {
    await authClient.organization.cancelInvitation({
      invitationId
    });
    toast.success("Invitation revoked");
  };

  const handleResend = async () => {
    toast.success("Invitation resent");
  };

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
