export const URINE_ALERT_WINDOW_MS = 6 * 60 * 60 * 1000;

export const URINE_NOT_RECORDED_6H_ALERT_TYPE = "urine_not_recorded_6h" as const;

export type UrineNotRecorded6hAlertType = typeof URINE_NOT_RECORDED_6H_ALERT_TYPE;
