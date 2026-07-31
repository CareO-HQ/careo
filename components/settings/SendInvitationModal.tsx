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
import { useProfile } from "@/hooks/use-profile";
import { canInviteMembers, type UserRole } from "@/lib/permissions";

type TriggerVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
type TriggerSize = "default" | "sm" | "lg" | "icon";

interface SendInvitationModalProps {
  triggerVariant?: TriggerVariant;
  triggerSize?: TriggerSize;
  triggerLabel?: string;
  triggerClassName?: string;
}

export default function SendInvitationModal({
  triggerVariant = "ghost",
  triggerSize = "sm",
  triggerLabel = "Send invitation",
  triggerClassName
}: SendInvitationModalProps = {}) {
  const { profile } = useProfile();

  const userRole = profile?.role as UserRole | undefined;

  // Only show invitation button if user has permission
  if (!userRole || !canInviteMembers(userRole)) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize} className={triggerClassName}>
          <PlusIcon className="w-4 h-4" />
          {triggerLabel}
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
