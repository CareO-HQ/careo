"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RqiaLoginHistoryView } from "./RqiaLoginHistoryView";

interface RqiaLoginHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffUserId: string;
  staffName: string;
}

export function RqiaLoginHistoryModal({
  isOpen,
  onClose,
  staffUserId,
  staffName,
}: RqiaLoginHistoryModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-white p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            RQIA Inspector Access History
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Log of inspection entries registered by {staffName}
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2">
          {staffUserId && (
            <RqiaLoginHistoryView userId={staffUserId} staffName={staffName} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
