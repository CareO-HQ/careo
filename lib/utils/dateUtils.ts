/**
 * Utility functions for formatting dates and relative time
 */

export interface RelativeTimeUnits {
  years: number;
  months: number;
  weeks: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * Calculate the difference between two dates and return time units
 */
export function getTimeDifference(
  fromDate: Date,
  toDate: Date
): RelativeTimeUnits {
  const diffMs = Math.abs(toDate.getTime() - fromDate.getTime());

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30.44); // Average days per month
  const years = Math.floor(days / 365.25); // Account for leap years

  return {
    years: years,
    months: months % 12,
    weeks: weeks % 4,
    days: days % 7,
    hours: hours % 24,
    minutes: minutes % 60,
    seconds: seconds % 60
  };
}

/**
 * Format a date as relative time (e.g., "3 days and 2 hours ago")
 */
export function formatRelativeTime(
  date: Date | number,
  now: Date = new Date()
): string {
  const targetDate = typeof date === "number" ? new Date(date) : date;
  const isPast = targetDate < now;
  const suffix = isPast ? "ago" : "from now";

  const diff = getTimeDifference(targetDate, now);

  // Special cases for very recent times
  if (
    diff.years === 0 &&
    diff.months === 0 &&
    diff.weeks === 0 &&
    diff.days === 0
  ) {
    if (diff.hours === 0 && diff.minutes === 0) {
      if (diff.seconds < 10) {
        return "just now";
      }
      return `${diff.seconds} second${diff.seconds !== 1 ? "s" : ""} ${suffix}`;
    }

    if (diff.hours === 0) {
      return `${diff.minutes} minute${diff.minutes !== 1 ? "s" : ""} ${suffix}`;
    }

    if (diff.minutes === 0) {
      return `${diff.hours} hour${diff.hours !== 1 ? "s" : ""} ${suffix}`;
    }

    return `${diff.hours} hour${diff.hours !== 1 ? "s" : ""} and ${diff.minutes} minute${diff.minutes !== 1 ? "s" : ""} ${suffix}`;
  }

  // For longer periods, show the two most significant units
  const parts: string[] = [];

  if (diff.years > 0) {
    parts.push(`${diff.years} year${diff.years !== 1 ? "s" : ""}`);
    if (diff.months > 0) {
      parts.push(`${diff.months} month${diff.months !== 1 ? "s" : ""}`);
    }
  } else if (diff.months > 0) {
    parts.push(`${diff.months} month${diff.months !== 1 ? "s" : ""}`);
    if (diff.weeks > 0) {
      parts.push(`${diff.weeks} week${diff.weeks !== 1 ? "s" : ""}`);
    } else if (diff.days > 0) {
      parts.push(`${diff.days} day${diff.days !== 1 ? "s" : ""}`);
    }
  } else if (diff.weeks > 0) {
    parts.push(`${diff.weeks} week${diff.weeks !== 1 ? "s" : ""}`);
    if (diff.days > 0) {
      parts.push(`${diff.days} day${diff.days !== 1 ? "s" : ""}`);
    }
  } else if (diff.days > 0) {
    parts.push(`${diff.days} day${diff.days !== 1 ? "s" : ""}`);
    if (diff.hours > 0) {
      parts.push(`${diff.hours} hour${diff.hours !== 1 ? "s" : ""}`);
    }
  }

  if (parts.length === 0) {
    return "just now";
  }

  return parts.length === 1
    ? `${parts[0]} ${suffix}`
    : `${parts[0]} and ${parts[1]} ${suffix}`;
}

/**
 * Format a date as a simple relative time (single unit)
 */
export function formatSimpleRelativeTime(
  date: Date | number,
  now: Date = new Date()
): string {
  const targetDate = typeof date === "number" ? new Date(date) : date;
  const isPast = targetDate < now;
  const suffix = isPast ? "ago" : "from now";

  const diffMs = Math.abs(targetDate.getTime() - now.getTime());
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30.44);
  const years = Math.floor(days / 365.25);

  if (years > 0) {
    return `${years} year${years !== 1 ? "s" : ""} ${suffix}`;
  } else if (months > 0) {
    return `${months} month${months !== 1 ? "s" : ""} ${suffix}`;
  } else if (weeks > 0) {
    return `${weeks} week${weeks !== 1 ? "s" : ""} ${suffix}`;
  } else if (days > 0) {
    return `${days} day${days !== 1 ? "s" : ""} ${suffix}`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? "s" : ""} ${suffix}`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ${suffix}`;
  } else if (seconds > 10) {
    return `${seconds} second${seconds !== 1 ? "s" : ""} ${suffix}`;
  } else {
    return "just now";
  }
}

/**
 * Get a compact relative time format (e.g., "3d", "2h", "5m")
 */
export function formatCompactRelativeTime(
  date: Date | number,
  now: Date = new Date()
): string {
  const targetDate = typeof date === "number" ? new Date(date) : date;

  const diffMs = Math.abs(targetDate.getTime() - now.getTime());
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30.44);
  const years = Math.floor(days / 365.25);

  if (years > 0) {
    return `${years}y`;
  } else if (months > 0) {
    return `${months}mo`;
  } else if (weeks > 0) {
    return `${weeks}w`;
  } else if (days > 0) {
    return `${days}d`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return "now";
  }
}

/**
 * Format time difference as hours (if < 24h) or days (if >= 24h)
 */
export function formatHoursOnly(
  date: Date | number,
  now: Date = new Date()
): string {
  const targetDate = typeof date === "number" ? new Date(date) : date;
  const isPast = targetDate < now;
  const suffix = isPast ? "ago" : "from now";

  const diffMs = Math.abs(targetDate.getTime() - now.getTime());
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const totalDays = Math.floor(totalHours / 24);

  if (totalHours === 0) {
    return "less than an hour " + suffix;
  }

  // If less than 24 hours, show hours
  if (totalHours < 24) {
    return `${totalHours} hour${totalHours !== 1 ? "s" : ""} ${suffix}`;
  }

  // If 24 hours or more, show days
  return `${totalDays} day${totalDays !== 1 ? "s" : ""} ${suffix}`;
}
