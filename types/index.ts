/**
 * Central export file for all TypeScript types and interfaces
 * Import types from here for better organization and cleaner imports
 */

// Auth-related types
export * from "./auth";

// Re-export utility functions for convenience
export {
  formatRelativeTime,
  formatSimpleRelativeTime,
  formatCompactRelativeTime,
  formatHoursOnly
} from "../lib/utils/dateUtils";
