"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import CreateOrgForm from "./CreateOrgForm";
import { useState } from "react";

export default function CreateOrgModal({
  children
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="mt-1 px-1.5" asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new organization</DialogTitle>
          <DialogDescription>
            A new organization will be added to your account.
          </DialogDescription>
        </DialogHeader>
        <CreateOrgForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
