export const CHECKS_INTERVAL_OVERDUE_ALERT_TYPE = "night_check_interval_overdue";

export interface CheckIntervalAlertMetadata {
  check_config_id: string;
  check_type: string;
  frequency_minutes: number;
  last_recorded_at: string | null;
  generated_by: "checks-interval-alert-cron";
  overdue_by_minutes: number;
}

export function formatCheckTypeLabel(checkType: string): string {
  return checkType
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function buildChecksIntervalAlertTitle(checkType: string): string {
  return `${formatCheckTypeLabel(checkType)} check overdue`;
}

export function buildChecksIntervalAlertMessage(input: {
  residentName: string;
  checkType: string;
  frequencyMinutes: number;
  overdueByMinutes: number;
}): string {
  const overdueHours = Math.floor(input.overdueByMinutes / 60);
  const overdueMinutes = input.overdueByMinutes % 60;
  const overdueDuration =
    overdueHours > 0
      ? `${overdueHours}h${overdueMinutes > 0 ? ` ${overdueMinutes}m` : ""}`
      : `${overdueMinutes}m`;

  return `${formatCheckTypeLabel(input.checkType)} check for ${input.residentName} is overdue by ${overdueDuration}. Expected every ${input.frequencyMinutes} minutes.`;
}
