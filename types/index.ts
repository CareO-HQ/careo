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
  id: string;
  first_name: string;
  last_name: string;
  room_number?: string;
  health_conditions?: string[] | { condition: string }[];
  risks?: string[] | { risk: string; level?: "low" | "medium" | "high" }[];
  dependencies?:
  | string[]
  | {
    mobility: string;
    eating: string;
    dressing: string;
    toileting: string;
  };
  phone_number?: string;
  date_of_birth: string;
  admission_date?: string;
  image_url?: string;
  nhs_health_number?: string;
  // GP Details
  gp_name?: string;
  gp_address?: string;
  gp_phone?: string;
  // Care Manager Details
  care_manager_name?: string;
  care_manager_address?: string;
  care_manager_phone?: string;
  emergency_contacts?: {
    name: string;
    phone_number: string;
    relationship: string;
    is_primary: boolean;
  }[];
  team_id?: string;
  care_home_id?: string;
  organization_id?: string;
};
