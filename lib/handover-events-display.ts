import { format } from "date-fns";
import { HandoverAppointment, ResidentHandoverData } from "@/lib/handover-data";

export interface HandoverEventRow {
  label: string;
  value: string;
  tone: "default" | "muted" | "success" | "warning" | "danger" | "info";
  tooltip?: string;
}

export function formatHandoverEvents(data?: ResidentHandoverData | null): HandoverEventRow[] {
  if (!data) {
    return getEmptyEventRows();
  }

  // 1. Food & Fluid
  const targetFluid = data.targetFluid || 1800;
  const foodFluidValue = `Ate ${data.foodIntakePercentage}% of meals. Fluids ${data.totalFluid.toLocaleString()}ml / ${targetFluid.toLocaleString()}ml target.`;
  const foodFluidTone =
    data.foodIntakePercentage === 0 && data.totalFluid === 0
      ? "muted"
      : data.foodIntakePercentage >= 75 && data.totalFluid >= 1500
      ? "success"
      : data.foodIntakePercentage >= 50 && data.totalFluid >= 1000
      ? "warning"
      : "danger";

  // 2. Bowel
  const bowelValue = data.bowelDetail?.timestamp
    ? data.bowelDetail.timestamp
    : data.continenceCount > 0
    ? `${data.continenceCount} entry logged today`
    : "No bowel movement logged";
  const bowelTone = data.bowelDetail?.timestamp || data.continenceCount > 0 ? "info" : "muted";

  // 3. Medication
  let scheduledText = "";
  if (data.medicationDetail?.actionedSlots && data.medicationDetail.actionedSlots.length > 0) {
    const parts = data.medicationDetail.actionedSlots.map((slot) => {
      const label =
        slot.status === "completed" ? "completely taken" :
        slot.status === "partial"   ? "partially taken"  : "not taken";
      return `${slot.time} ${label}`;
    });
    scheduledText = parts.join(". ") + ".";
  } else if (data.medicationTotal > 0) {
    scheduledText =
      data.medicationPercentage === 100
        ? "Scheduled medications completed."
        : `Medications scheduled (${data.medicationPercentage}% given).`;
  }

  let prnText = "";
  if (data.medicationDetail?.prnGivenList && data.medicationDetail.prnGivenList.length > 0) {
    const prnParts = data.medicationDetail.prnGivenList.map(
      (prn) => `${prn.amount || "1"} PRN ${prn.name} given at ${prn.time}`
    );
    prnText = prnParts.join(", ") + ".";
  }

  const medicationValue = [scheduledText, prnText].filter(Boolean).join(" ") || "No medications scheduled.";
  const overallStatus = data.medicationDetail?.overallStatus;
  const medicationTone =
    !overallStatus || overallStatus === "none"
      ? "muted"
      : overallStatus === "completed"
      ? "success"
      : overallStatus === "partial"
      ? "warning"
      : "danger"; // not_taken

  // 4. Appointments
  const appointmentValue = data.nextAppointment
    ? `${data.nextAppointment.title} ${data.nextAppointment.relativeDay} at ${data.nextAppointment.time}.`
    : data.appointmentCount > 0
    ? `${data.appointmentCount} appointment(s) scheduled today.`
    : "No appointments scheduled.";
  const appointmentTone = data.nextAppointment || data.appointmentCount > 0 ? "info" : "muted";

  // 5. Incidents
  const incidentValue = data.latestIncident
    ? `${data.latestIncident.type} ${data.latestIncident.relativeDay} at ${data.latestIncident.time}. ${data.latestIncident.outcome}.`
    : data.incidentCount > 0 || data.fallCount > 0
    ? `${data.incidentCount} incident(s), ${data.fallCount} fall(s) reported.`
    : "No incidents.";
  const incidentTone = data.latestIncident || data.incidentCount > 0 || data.fallCount > 0 ? "danger" : "muted";

  // 6. Wounds
  const woundValue = data.woundDetail
    ? `${data.woundDetail.activeCount} active wound${data.woundDetail.activeCount > 1 ? "s" : ""}.${
        data.woundDetail.nextReviewTime ? ` Next review: ${data.woundDetail.nextReviewTime}.` : ""
      }`
    : data.woundCount > 0
    ? `${data.woundCount} active wound(s).`
    : "No active wounds.";
  const woundTone = data.woundCount > 0 ? "warning" : "muted";

  // 7. Hospital Transfer
  const transferValue = data.latestTransfer
    ? data.latestTransfer.type === "transferred"
      ? `Transferred to hospital ${data.latestTransfer.relativeDay}${data.latestTransfer.time ? ` at ${data.latestTransfer.time}` : ""}.`
      : `Returned from hospital ${data.latestTransfer.relativeDay}${data.latestTransfer.hasDischargeSummary ? " with discharge summary" : ""}.`
    : data.hospitalTransferCount > 0
    ? `${data.hospitalTransferCount} hospital transfer log(s).`
    : "No hospital transfers.";
  const transferTone =
    data.latestTransfer?.type === "transferred"
      ? "danger"
      : data.latestTransfer?.type === "returned"
      ? "info"
      : data.hospitalTransferCount > 0
      ? "warning"
      : "muted";

  return [
    { label: "Food & Fluid", value: foodFluidValue, tone: foodFluidTone },
    { label: "Bowel", value: bowelValue, tone: bowelTone },
    { label: "Medication", value: medicationValue, tone: medicationTone },
    { label: "Appointments", value: appointmentValue, tone: appointmentTone },
    { label: "Incidents", value: incidentValue, tone: incidentTone },
    { label: "Wounds", value: woundValue, tone: woundTone },
    { label: "Hospital Transfer", value: transferValue, tone: transferTone },
  ];
}

function getEmptyEventRows(): HandoverEventRow[] {
  return [
    "Food & Fluid",
    "Bowel",
    "Medication",
    "Appointments",
    "Incidents",
    "Wounds",
    "Hospital Transfer",
  ].map((label) => ({ label, value: "—", tone: "muted" as const }));
}

export function formatHandoverEventsForPdf(data?: ResidentHandoverData | null): string {
  return formatHandoverEvents(data)
    .map((row) => `${row.label}: ${row.value}`)
    .join("\n");
}

/** Normalize archived snapshot fields (snake_case or camelCase) into display rows */
export function formatArchivedHandoverEvents(resident: Record<string, unknown>): HandoverEventRow[] {
  const data: ResidentHandoverData = {
    residentId: String(resident.residentId || resident.resident_id || ""),
    foodIntakeCount: Number(resident.foodIntakeCount ?? resident.food_intake_count ?? 0),
    foodIntakePercentage: Number(
      resident.foodIntakePercentage ??
        (resident.foodIntakeCount
          ? Math.min(Math.round((Number(resident.foodIntakeCount) / 3) * 100), 100)
          : 0)
    ),
    totalFluid: Number(resident.totalFluid ?? resident.total_fluid ?? 0),
    targetFluid: Number(resident.targetFluid ?? resident.target_fluid ?? 1800),
    continenceCount: Number(resident.continenceCount ?? resident.continence_count ?? 0),
    medicationPercentage: Number(resident.medicationPercentage ?? resident.medication_percentage ?? 0),
    medicationTotal: Number(resident.medicationTotal ?? resident.medication_total ?? 0),
    medicationTaken: Number(resident.medicationTaken ?? resident.medication_taken ?? 0),
    incidentCount: Number(resident.incidentCount ?? resident.incident_count ?? 0),
    fallCount: Number(resident.fallCount ?? resident.fall_count ?? 0),
    woundCount: Number(resident.woundCount ?? resident.wound_count ?? 0),
    hospitalTransferCount: Number(
      resident.hospitalTransferCount ?? resident.hospital_transfer_count ?? 0
    ),
    appointmentCount: Number(resident.appointmentCount ?? resident.appointment_count ?? 0),
    appointments: (resident.appointments as HandoverAppointment[]) || [],
  };

  return formatHandoverEvents(data);
}

