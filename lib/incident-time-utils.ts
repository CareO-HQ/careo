export type AmPmPeriod = "AM" | "PM";

export interface IncidentTimeParts {
  hour: string;
  minute: string;
  period: AmPmPeriod;
}

export const INCIDENT_TIME_HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) =>
  String(i + 1)
);

export const INCIDENT_TIME_MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) =>
  i.toString().padStart(2, "0")
);

export const INCIDENT_TIME_PERIOD_OPTIONS: AmPmPeriod[] = ["AM", "PM"];

/** Current time as 24h `HH:mm` for storage. */
export function getDefaultIncidentTimeValue(date: Date = new Date()): string {
  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

export function incidentTimePartsFrom24h(
  value: string | undefined,
  fallback: Date = new Date()
): IncidentTimeParts {
  const trimmed = value?.trim() ?? "";
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return incidentTimePartsFrom24h(getDefaultIncidentTimeValue(fallback), fallback);
  }

  const hours24 = Math.min(23, Math.max(0, parseInt(match[1], 10)));
  const minute = match[2].padStart(2, "0");
  const period: AmPmPeriod = hours24 >= 12 ? "PM" : "AM";
  let hour12 = hours24 % 12;
  if (hour12 === 0) {
    hour12 = 12;
  }

  return {
    hour: String(hour12),
    minute,
    period,
  };
}

export function incidentTime24hFromParts(parts: IncidentTimeParts): string {
  let hours24 = parseInt(parts.hour, 10);
  if (Number.isNaN(hours24) || hours24 < 1 || hours24 > 12) {
    hours24 = 12;
  }

  const minute = parts.minute.padStart(2, "0");

  if (parts.period === "AM") {
    if (hours24 === 12) {
      hours24 = 0;
    }
  } else if (hours24 !== 12) {
    hours24 += 12;
  }

  return `${hours24.toString().padStart(2, "0")}:${minute}`;
}

export function formatIncidentTimeDisplay(value: string | undefined): string {
  if (!value?.trim()) {
    return "";
  }
  const { hour, minute, period } = incidentTimePartsFrom24h(value);
  return `${hour}:${minute} ${period}`;
}
