/**
 * UK Timezone Utility Functions for Convex Server-Side Operations
 * 
 * All functions in this module use Europe/London timezone (GMT/BST)
 * to ensure consistent date/time handling regardless of server location.
 * 
 * These functions should be used for all date string generation and
 * time calculations in Convex mutations and queries.
 */

import { formatInTimeZone } from 'date-fns-tz';

/**
 * UK timezone identifier
 */
export const UK_TIMEZONE = 'Europe/London';

/**
 * Get today's date in UK timezone as YYYY-MM-DD string
 * Use this for all date-based queries and new record creation
 * 
 * @returns Date string in YYYY-MM-DD format (UK timezone)
 */
export function getUKTodayDateString(): string {
  const now = Date.now();
  return formatInTimeZone(now, UK_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Convert UTC timestamp to UK timezone date string (YYYY-MM-DD)
 * 
 * @param timestamp - UTC timestamp in milliseconds
 * @returns Date string in YYYY-MM-DD format (UK timezone)
 */
export function getUKDateString(timestamp: number): string {
  return formatInTimeZone(timestamp, UK_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Convert UTC timestamp to UK timezone time string (HH:mm)
 * 
 * @param timestamp - UTC timestamp in milliseconds
 * @returns Time string in HH:mm format (UK timezone)
 */
export function getUKTimeString(timestamp: number): string {
  return formatInTimeZone(timestamp, UK_TIMEZONE, 'HH:mm');
}

/**
 * Convert UTC timestamp to UK timezone date-time string
 * 
 * @param timestamp - UTC timestamp in milliseconds
 * @param format - Optional format string (default: 'yyyy-MM-dd HH:mm')
 * @returns Date-time string in UK timezone
 */
export function getUKDateTimeString(timestamp: number, format: string = 'yyyy-MM-dd HH:mm'): string {
  return formatInTimeZone(timestamp, UK_TIMEZONE, format);
}

/**
 * Create UTC timestamp from UK timezone components
 * 
 * @param year - Year (e.g., 2025)
 * @param month - Month (1-12)
 * @param day - Day of month (1-31)
 * @param hour - Hour (0-23)
 * @param minute - Minute (0-59)
 * @returns UTC timestamp in milliseconds
 */
export function createUKTimestamp(
  year: number,
  month: number,
  day: number,
  hour: number = 0,
  minute: number = 0
): number {
  // Create a date string representing the UK time
  // We'll use a binary search approach: try different UTC timestamps
  // until we find one that formats to the desired UK time
  
  // Start with a guess: assume GMT (UTC+0) first
  let guess = Date.UTC(year, month - 1, day, hour, minute);
  
  // Check what UK time this UTC timestamp represents
  let ukFormatted = formatInTimeZone(guess, UK_TIMEZONE, 'yyyy-MM-dd HH:mm');
  const [ukDatePart, ukTimePart] = ukFormatted.split(' ');
  const [ukYear, ukMonth, ukDay] = ukDatePart.split('-').map(Number);
  const [ukHour, ukMinute] = ukTimePart.split(':').map(Number);
  
  // If it matches, we're done (unlikely on first try due to DST)
  if (ukYear === year && ukMonth === month && ukDay === day && ukHour === hour && ukMinute === minute) {
    return guess;
  }
  
  // Adjust: if UK time is ahead, we need to go back in UTC
  // If UK time is behind, we need to go forward in UTC
  const ukTimeMinutes = ukHour * 60 + ukMinute;
  const targetMinutes = hour * 60 + minute;
  const diffMinutes = targetMinutes - ukTimeMinutes;
  
  // Adjust by the difference (accounting for day boundaries)
  const adjusted = guess + diffMinutes * 60 * 1000;
  
  // Verify the adjusted time
  const verifyFormatted = formatInTimeZone(adjusted, UK_TIMEZONE, 'yyyy-MM-dd HH:mm');
  const [verifyDatePart, verifyTimePart] = verifyFormatted.split(' ');
  const [verifyYear, verifyMonth, verifyDay] = verifyDatePart.split('-').map(Number);
  const [verifyHour, verifyMinute] = verifyTimePart.split(':').map(Number);
  
  if (verifyYear === year && verifyMonth === month && verifyDay === day && verifyHour === hour && verifyMinute === minute) {
    return adjusted;
  }
  
  // If still not matching, use iterative approach
  // This handles DST transitions more accurately
  let current = guess;
  const maxIterations = 10;
  for (let i = 0; i < maxIterations; i++) {
    const currentFormatted = formatInTimeZone(current, UK_TIMEZONE, 'yyyy-MM-dd HH:mm');
    const [currDatePart, currTimePart] = currentFormatted.split(' ');
    const [currYear, currMonth, currDay] = currDatePart.split('-').map(Number);
    const [currHour, currMinute] = currTimePart.split(':').map(Number);
    
    if (currYear === year && currMonth === month && currDay === day && currHour === hour && currMinute === minute) {
      return current;
    }
    
    // Calculate adjustment needed
    const currTotalMinutes = currYear * 525600 + currMonth * 43200 + currDay * 1440 + currHour * 60 + currMinute;
    const targetTotalMinutes = year * 525600 + month * 43200 + day * 1440 + hour * 60 + minute;
    const adjustmentMinutes = targetTotalMinutes - currTotalMinutes;
    
    current = current + adjustmentMinutes * 60 * 1000;
  }
  
  // Fallback: return the best guess
  return current;
}

/**
 * Get start of day (00:00:00) in UK timezone for a given date string
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns UTC timestamp for start of day in UK timezone
 */
export function getUKStartOfDay(dateString: string): number {
  const [year, month, day] = dateString.split('-').map(Number);
  return createUKTimestamp(year, month, day, 0, 0);
}

/**
 * Get end of day (23:59:59.999) in UK timezone for a given date string
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns UTC timestamp for end of day in UK timezone
 */
export function getUKEndOfDay(dateString: string): number {
  const [year, month, day] = dateString.split('-').map(Number);
  return createUKTimestamp(year, month, day, 23, 59) + 59999; // Add 59.999 seconds
}

/**
 * Get current time in UK timezone as timestamp
 * 
 * @returns Current UTC timestamp (server time is already UTC)
 */
export function getUKNowTimestamp(): number {
  return Date.now();
}

/**
 * Parse a time string (HH:mm) and create timestamp for a given UK date
 * 
 * @param dateString - Date string in YYYY-MM-DD format (UK timezone)
 * @param timeString - Time string in HH:mm format (UK timezone)
 * @returns UTC timestamp
 */
export function parseUKDateTime(dateString: string, timeString: string): number {
  const [year, month, day] = dateString.split('-').map(Number);
  const [hour, minute] = timeString.split(':').map(Number);
  return createUKTimestamp(year, month, day, hour, minute);
}
