"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import CreateCareHomeForm from "./CreateCareHomeForm";
import { useState, cloneElement, isValidElement, ReactElement } from "react";

export default function CreateCareHomeModal({
  children,
  onSuccess
}: {
  children: React.ReactNode;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
    onSuccess?.();
  };

  // Clone the child element and add onSelect handler for DropdownMenuItem
  const trigger = isValidElement(children)
    ? cloneElement(children as ReactElement<any>, {
      onSelect: (e: Event) => {
        e.preventDefault();
        setOpen(true);
      }
    } as any)
    : children;

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new Care home</DialogTitle>
            <DialogDescription>
              A new Care home will be added to your account.
            </DialogDescription>
          </DialogHeader>
          <CreateCareHomeForm onSuccess={handleSuccess} />
        </DialogContent>
      </Dialog>
    </>
  );
}
