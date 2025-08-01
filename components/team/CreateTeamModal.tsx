"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import CreateTeamForm from "./CreateTeamForm";
import { useState } from "react";

export default function CreateTeamModal({
  children,
  onTeamCreated
}: {
  children: React.ReactNode;
  onTeamCreated?: () => void;
}) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
    onTeamCreated?.(); // Call the callback to refresh the team list
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new team</DialogTitle>
          <DialogDescription>
            A new team will be added to your current organization.
          </DialogDescription>
        </DialogHeader>
        <CreateTeamForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
