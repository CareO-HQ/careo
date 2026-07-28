"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MdtLoginHistoryView } from "./MdtLoginHistoryView";

interface MdtLoginHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffUserId: string;
  staffName: string;
}

export function MdtLoginHistoryModal({
  isOpen,
  onClose,
  staffUserId,
  staffName,
}: MdtLoginHistoryModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            MDT Professional Access History
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Log of visit sessions registered by {staffName}
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2">
          {staffUserId && (
            <MdtLoginHistoryView userId={staffUserId} staffName={staffName} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
