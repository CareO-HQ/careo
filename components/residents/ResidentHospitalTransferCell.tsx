"use client";

import { Resident } from "@/types";
import { HandoverHospitalTransferToggle } from "@/components/handover/HandoverHospitalTransferToggle";
import { HandoverTransferState } from "@/lib/handover-hospital-transfer";

interface ResidentHospitalTransferCellProps {
  resident: Resident;
  selectedDate: Date;
  selectedShift: "day" | "night";
  organizationId?: string;
  currentUserId?: string;
  transferState?: HandoverTransferState;
  onChanged: () => void | Promise<void>;
}

export function ResidentHospitalTransferCell({
  resident,
  selectedDate,
  selectedShift,
  organizationId,
  currentUserId,
  transferState,
  onChanged,
}: ResidentHospitalTransferCellProps) {
  return (
    <div
      className="flex items-center gap-2"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <HandoverHospitalTransferToggle
        resident={resident}
        selectedDate={selectedDate}
        selectedShift={selectedShift}
        organizationId={organizationId}
        currentUserId={currentUserId}
        transferState={transferState}
        onChanged={onChanged}
      />
    </div>
  );
}
