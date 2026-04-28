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
  updated_at?: string;
  photo_updated_at?: string;
  photoUpdatedAt?: string; // Alias
  updatedAt?: string; // Alias
  first_name: string;
  last_name: string;
  firstName?: string; // Alias for frontend consistency
  lastName?: string;  // Alias for frontend consistency
  room_number?: string;
  roomNumber?: string; // Alias
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
  phoneNumber?: string; // Alias
  date_of_birth: string;
  dateOfBirth?: string; // Alias
  admission_date?: string;
  admissionDate?: string; // Alias
  image_url?: string;
  imageUrl?: string; // Alias
  nhs_health_number?: string;
  nhsHealthNumber?: string; // Alias
  // GP Details
  gp_name?: string;
  gpName?: string; // Alias
  gp_address?: string;
  gpAddress?: string; // Alias
  gp_phone?: string;
  gpPhone?: string; // Alias
  // Care Manager Details
  care_manager_name?: string;
  careManagerName?: string; // Alias
  care_manager_address?: string;
  careManagerAddress?: string; // Alias
  care_manager_phone?: string;
  careManagerPhone?: string; // Alias
  emergency_contacts?: {
    name: string;
    phone_number: string;
    relationship: string;
    is_primary: boolean;
  }[];
  team_id?: string;
  teamId?: string; // Alias
  care_home_id?: string;
  careHomeId?: string; // Alias
  organization_id?: string;
  organizationId?: string; // Alias
  status?: string;
  fluid_target?: number;
};
