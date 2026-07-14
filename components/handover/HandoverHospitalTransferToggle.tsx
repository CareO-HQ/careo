"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Resident } from "@/types";
import {
  deactivateHandoverHospitalAdmission,
  HandoverTransferState,
  markHandoverHospitalAdmission,
} from "@/lib/handover-hospital-transfer";

interface HandoverHospitalTransferToggleProps {
  resident: Resident;
  selectedDate: Date;
  selectedShift: "day" | "night";
  organizationId?: string;
  currentUserId?: string;
  transferState?: HandoverTransferState;
  onChanged: () => void | Promise<void>;
  compact?: boolean;
}

export function HandoverHospitalTransferToggle({
  resident,
  selectedDate,
  organizationId,
  currentUserId,
  transferState,
  onChanged,
  compact = false,
}: HandoverHospitalTransferToggleProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const isChecked = transferState?.isActive ?? false;

  const handleToggle = async (checked: boolean) => {
    if (!organizationId || !currentUserId) {
      toast.error("Missing user or organization context");
      return;
    }

    setIsSaving(true);
    try {
      if (checked) {
        await markHandoverHospitalAdmission({
          residentId: resident.id,
          organizationId,
          createdBy: currentUserId,
          date: selectedDate,
        });
        toast.success(`${resident.first_name} marked for hospital transfer`);
        await onChanged();
        return;
      }

      if (!transferState?.logId) {
        toast.error("No active hospital transfer found for this resident");
        return;
      }

      await deactivateHandoverHospitalAdmission(transferState.logId);
      await onChanged();

      const params = new URLSearchParams({
        open: "transfer-log",
        logId: transferState.logId,
        edit: "1",
      });

      router.push(
        `/dashboard/residents/${resident.id}/hospital-transfer?${params.toString()}`
      );
    } catch (error) {
      console.error("Error updating hospital transfer toggle:", error);
      toast.error("Failed to update hospital transfer status");
    } finally {
      setIsSaving(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
        <Label
          htmlFor={`hospital-transfer-${resident.id}`}
          className="text-xs text-muted-foreground"
        >
          Transfer to hospital
        </Label>
        <Switch
          id={`hospital-transfer-${resident.id}`}
          checked={isChecked}
          disabled={isSaving}
          onCheckedChange={handleToggle}
          aria-label={`Transfer ${resident.first_name} ${resident.last_name} to hospital`}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <Switch
        id={`hospital-transfer-${resident.id}`}
        checked={isChecked}
        disabled={isSaving}
        onCheckedChange={handleToggle}
        aria-label={`Transfer ${resident.first_name} ${resident.last_name} to hospital`}
      />
      <span className="text-[10px] text-muted-foreground text-center leading-tight">
        {isSaving ? "Saving…" : "Hospital"}
      </span>
    </div>
  );
}
