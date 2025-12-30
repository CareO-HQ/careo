export type UserRole = "owner" | "manager" | "nurse" | "care_assistant";

// Simple role definitions for better-auth
// The organization plugin expects minimal role configuration
export const owner = {};

export const manager = {};

export const nurse = {};

export const careAssistant = {};

export function canEditIncident(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "admin" || role === "nurse";
}

export function canCreateIncident(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "admin" || role === "nurse";
}

export function canViewAlert(alertType: string, role?: string): boolean {
  if (!role) return false;

  if (alertType === "food_fluid") {
    return role === "care_assistant";
  }

  if (alertType === "medication") {
    return role === "nurse";
  }

  if (role === "owner" || role === "manager" || role === "admin") {
    return alertType !== "food_fluid" && alertType !== "medication";
  }

  return true;
}

export function canViewAuditLogs(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "admin";
}

export function canViewStaffList(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "admin";
}

export function canManageDiet(role?: string): boolean {
  if (!role) return false;
  return role === "owner" || role === "manager" || role === "nurse";
}

export function canViewResidentSection(section: string, role?: string): boolean {
  if (!role) return false;
  if (role === 'owner' || role === 'manager' || role === 'nurse' || role === 'admin') {
    return true;
  }
  if (role === 'care_assistant') {
    const allowed = ['food-fluid', 'daily-care', 'night-check'];
    return allowed.includes(section);
  }
  return false;
}

export function canInviteMembers(role: UserRole): boolean {
  return role === "owner" || role === "manager";
}

export function getAllowedRolesToInvite(role: UserRole): UserRole[] {
  if (role === "owner") {
    return ["manager"];
  }
  if (role === "manager") {
    return ["nurse", "care_assistant"];
  }
  return [];
}
