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

  // Only show invitation button if user has permission
  if (!member?.role || !canInviteMembers(member.role as UserRole)) {
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
