/**
 * Date utility functions for consistent timezone handling
 */

/**
 * Format a date to YYYY-MM-DD string in local timezone
 */
export function formatDateToLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a timestamp to local Date object
 */
export function parseTimestampToLocal(timestamp: number | string): Date {
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  return new Date(timestamp);
}

/**
 * Get the hour from a timestamp in local timezone (0-23)
 */
export function getLocalHour(timestamp: number | string): number {
  const date = parseTimestampToLocal(timestamp);
  return date.getHours();
}

/**
 * Check if a timestamp falls within day shift (8am-8pm)
 */
export function isDayShift(timestamp: number | string): boolean {
  const hour = getLocalHour(timestamp);
  return hour >= 8 && hour < 20;
}

/**
 * Check if a timestamp falls within night shift (8pm-8am)
 */
export function isNightShift(timestamp: number | string): boolean {
  const hour = getLocalHour(timestamp);
  return hour >= 20 || hour < 8;
}

/**
 * Format time to 12-hour format with AM/PM
 */
export function formatTimeTo12Hour(timestamp: number | string): string {
  const date = parseTimestampToLocal(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Get yesterday's date in YYYY-MM-DD format
 */
export function getYesterdayDate(date: string): string {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDateToLocal(yesterday);
}

/**
 * Format date for display with weekday
 */
export function formatDateForDisplay(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}