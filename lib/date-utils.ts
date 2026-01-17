/**
 * Date utility functions for consistent timezone handling
 *
 * ✅ UK TIMEZONE: All care home operations use Europe/London timezone
 * This ensures consistent date handling across daylight saving time changes
 * (GMT in winter, BST in summer)
 */

import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

/**
 * UK timezone identifier
 */
export const UK_TIMEZONE = 'Europe/London';

/**
 * Get current date in UK timezone as YYYY-MM-DD string
 * Use this for all date-based queries and new record creation
 */
export function getUKTodayDate(): string {
  const now = new Date();
  return formatInTimeZone(now, UK_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Get current time in UK timezone
 */
export function getUKNow(): Date {
  return toZonedTime(new Date(), UK_TIMEZONE);
}

/**
 * Convert a date string to UK timezone
 * @param dateStr - Date string in YYYY-MM-DD format
 */
export function parseUKDate(dateStr: string): Date {
  return toZonedTime(new Date(dateStr + 'T00:00:00'), UK_TIMEZONE);
}

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
 * Parse a timestamp to Date object (UTC timestamp)
 */
export function parseTimestampToLocal(timestamp: number | string): Date {
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  return new Date(timestamp);
}

/**
 * Format UTC timestamp to UK timezone time string (HH:mm)
 * 
 * @param timestamp - UTC timestamp in milliseconds
 * @returns Time string in HH:mm format (UK timezone)
 */
export function formatTimestampToUKTime(timestamp: number | string): string {
  const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
  return formatInTimeZone(ts, UK_TIMEZONE, 'HH:mm');
}

/**
 * Format UTC timestamp to UK timezone date-time string
 * 
 * @param timestamp - UTC timestamp in milliseconds
 * @param format - Optional format string (default: 'yyyy-MM-dd HH:mm')
 * @returns Date-time string in UK timezone
 */
export function formatTimestampToUKDateTime(timestamp: number | string, format: string = 'yyyy-MM-dd HH:mm'): string {
  const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
  return formatInTimeZone(ts, UK_TIMEZONE, format);
}

/**
 * Format UTC timestamp to UK timezone date string (YYYY-MM-DD)
 * 
 * @param timestamp - UTC timestamp in milliseconds
 * @returns Date string in YYYY-MM-DD format (UK timezone)
 */
export function formatTimestampToUKDate(timestamp: number | string): string {
  const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
  return formatInTimeZone(ts, UK_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Get the hour from a timestamp in UK timezone (0-23)
 */
export function getLocalHour(timestamp: number | string): number {
  const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
  const ukDate = toZonedTime(ts, UK_TIMEZONE);
  return ukDate.getHours();
}

/**
 * Check if a timestamp falls within day shift (8am-8pm UK time)
 */
export function isDayShift(timestamp: number | string): boolean {
  const hour = getLocalHour(timestamp);
  return hour >= 8 && hour < 20;
}

/**
 * Check if a timestamp falls within night shift (8pm-8am UK time)
 */
export function isNightShift(timestamp: number | string): boolean {
  const hour = getLocalHour(timestamp);
  return hour >= 20 || hour < 8;
}

/**
 * Format time to 12-hour format with AM/PM in UK timezone
 */
export function formatTimeTo12Hour(timestamp: number | string): string {
  const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
  const ukDate = toZonedTime(ts, UK_TIMEZONE);
  return formatInTimeZone(ts, UK_TIMEZONE, 'h:mm a');
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
 * Format date for display with weekday in UK timezone
 */
export function formatDateForDisplay(date: string): string {
  // Parse date string as UK timezone date
  const ukDate = toZonedTime(new Date(date + 'T00:00:00'), UK_TIMEZONE);
  return formatInTimeZone(ukDate, UK_TIMEZONE, 'EEEE, MMMM d, yyyy');
}