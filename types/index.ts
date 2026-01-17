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

export type Resident = {
  _id: string;
  firstName: string;
  lastName: string;
  roomNumber?: string;
  healthConditions?: string[] | { condition: string }[];
  risks?: string[] | { risk: string; level?: "low" | "medium" | "high" }[];
  dependencies?:
    | string[]
    | {
        mobility: string;
        eating: string;
        dressing: string;
        toileting: string;
      };
  phoneNumber?: string;
  dateOfBirth: string;
  admissionDate: string;
  imageUrl: string;
  nhsHealthNumber?: string;
  // GP Details
  gpName?: string;
  gpAddress?: string;
  gpPhone?: string;
  // Care Manager Details
  careManagerName?: string;
  careManagerAddress?: string;
  careManagerPhone?: string;
  emergencyContacts: {
    name: string;
    phoneNumber: string;
    relationship: string;
    isPrimary: boolean;
  }[];
};
