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

  const foodFluidValue =
    data.foodIntakePercentage > 0 || data.totalFluid > 0
      ? `${data.foodIntakePercentage}% · ${data.totalFluid}ml`
      : "—";
  const foodFluidTone =
    data.foodIntakePercentage === 0 && data.totalFluid === 0
      ? "muted"
      : data.foodIntakePercentage >= 75 && data.totalFluid >= 1500
        ? "success"
        : data.foodIntakePercentage >= 50 && data.totalFluid >= 1000
          ? "warning"
          : "danger";

  const continenceValue = data.continenceCount > 0 ? String(data.continenceCount) : "—";
  const medicationValue =
    data.medicationTotal > 0 ? `${data.medicationPercentage}%` : "—";
  const medicationTone =
    data.medicationTotal === 0
      ? "muted"
      : data.medicationPercentage >= 100
        ? "success"
        : data.medicationPercentage >= 75
          ? "warning"
          : "danger";

  const earliestAppointment = [...data.appointments].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  )[0];
  const appointmentValue =
    data.appointmentCount > 0 && earliestAppointment
      ? `${format(new Date(earliestAppointment.start_time), "HH:mm")}${data.appointmentCount > 1 ? ` (+${data.appointmentCount - 1})` : ""}`
      : "—";
  const appointmentTooltip =
    data.appointments.length > 0
      ? data.appointments
          .map((apt) => {
            const time = format(new Date(apt.start_time), "HH:mm");
            return `${time} ${apt.title}${apt.location ? ` @ ${apt.location}` : ""}`;
          })
          .join("\n")
      : undefined;

  const incidentParts: string[] = [];
  if (data.incidentCount > 0) incidentParts.push(`${data.incidentCount} inc`);
  if (data.fallCount > 0) incidentParts.push(`${data.fallCount} fall${data.fallCount > 1 ? "s" : ""}`);
  const incidentsValue = incidentParts.length > 0 ? incidentParts.join(" · ") : "—";
  const incidentsTone =
    data.incidentCount > 0 || data.fallCount > 0 ? "danger" : "muted";

  const woundsValue = data.woundCount > 0 ? String(data.woundCount) : "—";
  const transferValue =
    data.hospitalTransferCount > 0 ? String(data.hospitalTransferCount) : "—";

  return [
    { label: "Food/Fluid", value: foodFluidValue, tone: foodFluidTone },
    { label: "Incontinence", value: continenceValue, tone: data.continenceCount > 0 ? "info" : "muted" },
    {
      label: "Medication",
      value: medicationValue,
      tone: medicationTone,
      tooltip:
        data.medicationTotal > 0
          ? `${data.medicationTaken}/${data.medicationTotal} taken`
          : undefined,
    },
    {
      label: "Appointment",
      value: appointmentValue,
      tone: data.appointmentCount > 0 ? "info" : "muted",
      tooltip: appointmentTooltip,
    },
    { label: "Incidents", value: incidentsValue, tone: incidentsTone },
    { label: "Wounds", value: woundsValue, tone: data.woundCount > 0 ? "warning" : "muted" },
    {
      label: "Transfer",
      value: transferValue,
      tone: data.hospitalTransferCount > 0 ? "danger" : "muted",
    },
  ];
}

function getEmptyEventRows(): HandoverEventRow[] {
  return [
    "Food/Fluid",
    "Incontinence",
    "Medication",
    "Appointment",
    "Incidents",
    "Wounds",
    "Transfer",
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
