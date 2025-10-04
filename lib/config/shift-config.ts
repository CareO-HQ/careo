/**
 * Shift Configuration for Care Home Handovers
 *
 * This module provides configurable shift times and utilities for determining
 * the current shift based on UK timezone.
 *
 * Future enhancement: Move this to team-level settings in database to allow
 * different care homes to configure their own shift times.
 */

export const SHIFT_CONFIG = {
  /** Start hour for day shift (24-hour format, UK timezone) */
  dayStart: 8,

  /** End hour for day shift (24-hour format, UK timezone) */
  dayEnd: 20,

  /** Timezone for shift calculations */
  timezone: "Europe/London",

  /** Grace period in hours after shift ends to still allow archiving */
  gracePeriodHours: 1,

  /** Auto-archive hour for day shift (24-hour format, UK timezone) */
  autoArchiveDayShiftHour: 21, // 9 PM
} as const;

export type ShiftType = "day" | "night";

/**
 * Get the current shift based on UK time
 *
 * @returns "day" if current UK time is between dayStart and dayEnd, otherwise "night"
 *
 * @example
 * // At 10:00 AM UK time
 * getCurrentShift() // returns "day"
 *
 * // At 9:00 PM UK time
 * getCurrentShift() // returns "night"
 */
export function getCurrentShift(): ShiftType {
  // Get current time in UK timezone
  const ukTimeString = new Date().toLocaleString("en-GB", {
    timeZone: SHIFT_CONFIG.timezone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  // Extract hour from format "HH:MM"
  const hour = parseInt(ukTimeString.split(":")[0], 10);

  // Determine shift based on configuration
  return hour >= SHIFT_CONFIG.dayStart && hour < SHIFT_CONFIG.dayEnd
    ? "day"
    : "night";
}

/**
 * Get shift time range as human-readable string
 *
 * @param shift - The shift type
 * @returns Human-readable time range
 *
 * @example
 * getShiftTimeRange("day") // returns "8AM - 8PM"
 * getShiftTimeRange("night") // returns "8PM - 8AM"
 */
export function getShiftTimeRange(shift: ShiftType): string {
  if (shift === "day") {
    const startHour = SHIFT_CONFIG.dayStart;
    const endHour = SHIFT_CONFIG.dayEnd;
    return `${formatHour(startHour)} - ${formatHour(endHour)}`;
  } else {
    const startHour = SHIFT_CONFIG.dayEnd;
    const endHour = SHIFT_CONFIG.dayStart;
    return `${formatHour(startHour)} - ${formatHour(endHour)}`;
  }
}

/**
 * Format hour as 12-hour time
 *
 * @param hour - Hour in 24-hour format (0-23)
 * @returns Formatted time string
 *
 * @example
 * formatHour(8) // returns "8AM"
 * formatHour(20) // returns "8PM"
 * formatHour(0) // returns "12AM"
 */
function formatHour(hour: number): string {
  if (hour === 0) return "12AM";
  if (hour === 12) return "12PM";
  if (hour < 12) return `${hour}AM`;
  return `${hour - 12}PM`;
}

/**
 * Get the shift for a specific date/time
 *
 * @param date - The date to check
 * @returns "day" or "night" based on the time
 */
export function getShiftForDate(date: Date): ShiftType {
  const ukTimeString = date.toLocaleString("en-GB", {
    timeZone: SHIFT_CONFIG.timezone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  const hour = parseInt(ukTimeString.split(":")[0], 10);

  return hour >= SHIFT_CONFIG.dayStart && hour < SHIFT_CONFIG.dayEnd
    ? "day"
    : "night";
}

/**
 * Check if there are unarchived comments from the previous shift
 *
 * This helps detect when staff forgot to archive the previous shift's handover
 *
 * @param currentDate - Current date string (YYYY-MM-DD)
 * @param currentShift - Current shift
 * @returns Object with warning info if previous shift has unarchived data
 *
 * @example
 * // At 9:00 PM on Oct 4 (night shift started)
 * // Day shift has unarchived comments
 * checkForUnarchivedShift("2025-10-04", "night")
 * // Returns: { hasUnarchived: true, previousShift: "day", message: "..." }
 */
export function checkForUnarchivedShift(
  currentDate: string,
  currentShift: ShiftType
): {
  hasUnarchived: boolean;
  previousShift?: ShiftType;
  message?: string;
} {
  // Determine which shift should have been archived
  const previousShift: ShiftType = currentShift === "day" ? "night" : "day";

  return {
    hasUnarchived: false, // Will be set by UI when checking database
    previousShift,
    message: `The previous ${previousShift} shift has not been archived yet. Please archive it before starting new comments.`,
  };
}

/**
 * Check if we're in the grace period after a shift ended
 *
 * During grace period, staff can still archive the previous shift
 *
 * @returns Object with grace period info
 *
 * @example
 * // At 8:30 PM (30 minutes after day shift ended at 8:00 PM)
 * checkGracePeriod()
 * // Returns: { inGracePeriod: true, shiftToArchive: "day", minutesRemaining: 30 }
 */
export function checkGracePeriod(): {
  inGracePeriod: boolean;
  shiftToArchive?: ShiftType;
  minutesRemaining?: number;
} {
  const ukTimeString = new Date().toLocaleString("en-GB", {
    timeZone: SHIFT_CONFIG.timezone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  const [hourStr, minuteStr] = ukTimeString.split(":");
  const currentHour = parseInt(hourStr, 10);
  const currentMinute = parseInt(minuteStr, 10);
  const currentTotalMinutes = currentHour * 60 + currentMinute;

  // Check if within grace period after day shift ended
  const dayEndMinutes = SHIFT_CONFIG.dayEnd * 60;
  const dayGracePeriodEnd = dayEndMinutes + SHIFT_CONFIG.gracePeriodHours * 60;

  if (currentTotalMinutes >= dayEndMinutes && currentTotalMinutes < dayGracePeriodEnd) {
    const minutesRemaining = dayGracePeriodEnd - currentTotalMinutes;
    return {
      inGracePeriod: true,
      shiftToArchive: "day",
      minutesRemaining,
    };
  }

  // Check if within grace period after night shift ended
  const nightEndMinutes = SHIFT_CONFIG.dayStart * 60;
  const nightGracePeriodEnd = nightEndMinutes + SHIFT_CONFIG.gracePeriodHours * 60;

  if (currentTotalMinutes >= nightEndMinutes && currentTotalMinutes < nightGracePeriodEnd) {
    const minutesRemaining = nightGracePeriodEnd - currentTotalMinutes;
    return {
      inGracePeriod: true,
      shiftToArchive: "night",
      minutesRemaining,
    };
  }

  return {
    inGracePeriod: false,
  };
}

/**
 * Check if current time matches auto-archive time for day shift
 *
 * At 9:00 PM (autoArchiveDayShiftHour), unarchived day shift should be auto-archived
 *
 * @returns True if current UK time is the auto-archive hour
 *
 * @example
 * // At 9:00 PM UK time
 * shouldAutoArchiveDayShift() // Returns: true
 *
 * // At 8:30 PM UK time
 * shouldAutoArchiveDayShift() // Returns: false
 */
export function shouldAutoArchiveDayShift(): boolean {
  const ukTimeString = new Date().toLocaleString("en-GB", {
    timeZone: SHIFT_CONFIG.timezone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  const [hourStr] = ukTimeString.split(":");
  const currentHour = parseInt(hourStr, 10);

  return currentHour === SHIFT_CONFIG.autoArchiveDayShiftHour;
}
