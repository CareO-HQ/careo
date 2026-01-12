"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "../ui/button";
import { PlusIcon } from "lucide-react";
import SendInvitationForm from "./SendInvitationForm";
import { authClient } from "@/lib/auth-client";
import { canInviteMembers, type UserRole } from "@/lib/permissions";

export default function SendInvitationModal() {
  const { data: member } = authClient.useActiveMember();
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: user } = authClient.useSession();

  // Fallback: Get role from organization members if activeMember is not available
  const orgMemberRole = activeOrganization?.members?.find(
    (m) => m.user?.email === user?.user?.email || m.userId === user?.user?.id
  )?.role;

  // Use activeMember role first, fallback to org member role
  const userRole = (member?.role || orgMemberRole) as UserRole | undefined;

  // Only show invitation button if user has permission
  if (!userRole || !canInviteMembers(userRole)) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <PlusIcon className="w-4 h-4" />
          Send invitation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
          <DialogDescription>
            Enter the email address and role of the person you want to invite.
          </DialogDescription>
        </DialogHeader>
        <SendInvitationForm />
      </DialogContent>
    </Dialog>
  );
}
