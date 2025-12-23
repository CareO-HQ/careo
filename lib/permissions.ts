import { createAccessControl } from "better-auth/plugins/access";
import {
  defaultStatements,
  ownerAc,
  adminAc,
  memberAc
} from "better-auth/plugins/organization/access";

const statement = {
  ...defaultStatements, // Include default organization permissions
  project: ["create", "share", "update", "delete"]
} as const;

const ac = createAccessControl(statement);

// Map better-auth roles to our custom roles
// Owner role - full access
const owner = ac.newRole({
  project: ["create", "update", "delete"],
  ...ownerAc.statements // Include default owner permissions
});

// Manager role - replaces admin, high-level access
const manager = ac.newRole({
  project: ["create", "update", "share"],
  ...adminAc.statements // Include default admin permissions
});

// Nurse role - medical access
const nurse = ac.newRole({
  project: ["create", "update"],
  ...memberAc.statements // Include default member permissions
});

// Care Assistant role - basic care access
const careAssistant = ac.newRole({
  project: ["create"],
  ...memberAc.statements // Include default member permissions
});

// Export for backward compatibility and better-auth integration
export { owner, manager, nurse, careAssistant, ac, statement };
// Legacy exports mapped to new roles
export const admin = manager;
export const member = careAssistant;

/**
 * Healthcare-specific field-level permissions and access control
 * Implements role-based access control (RBAC) for sensitive resident information
 */

export type UserRole = "owner" | "manager" | "nurse" | "care_assistant";

export interface PermissionConfig {
  canView: boolean;
  canEdit: boolean;
  requiresConsent?: boolean;
}

/**
 * Define which fields require elevated permissions
 */
export const SENSITIVE_FIELDS = {
  nhsHealthNumber: ["owner", "manager", "nurse"],
  medicalConditions: ["owner", "manager", "nurse"],
  medications: ["owner", "manager", "nurse"],
  allergies: ["owner", "manager", "nurse", "care_assistant"],
  risks: ["owner", "manager", "nurse", "care_assistant"],
  emergencyContacts: ["owner", "manager", "nurse", "care_assistant"],
  gpDetails: ["owner", "manager", "nurse"],
  careManagerDetails: ["owner", "manager", "nurse", "care_assistant"],
} as const;

/**
 * Check if user has permission to view a specific field
 */
export function canViewField(field: keyof typeof SENSITIVE_FIELDS, userRole: UserRole): boolean {
  const allowedRoles = SENSITIVE_FIELDS[field];
  return allowedRoles.includes(userRole);
}

/**
 * Check if user can edit resident data
 */
export function canEditResident(userRole: UserRole): boolean {
  return ["owner", "manager", "nurse"].includes(userRole);
}

/**
 * Check if user can discharge a resident
 */
export function canDischargeResident(userRole: UserRole): boolean {
  return ["owner", "manager"].includes(userRole);
}

/**
 * Check if user can view audit logs
 */
export function canViewAuditLogs(userRole: UserRole): boolean {
  return ["owner", "manager"].includes(userRole);
}

/**
 * Check if user can delete data
 */
export function canDeleteData(userRole: UserRole): boolean {
  return ["owner"].includes(userRole);
}

/**
 * Filter resident object to only include fields user has permission to see
 */
export function filterResidentData<T extends Record<string, any>>(
  resident: T,
  userRole: UserRole
): Partial<T> {
  const filtered = { ...resident };

  // Hide NHS number if user doesn't have permission
  if (!canViewField("nhsHealthNumber", userRole)) {
    delete filtered.nhsHealthNumber;
  }

  // Hide medical conditions for lower-level staff
  if (!canViewField("medicalConditions", userRole)) {
    delete filtered.medicalConditions;
    delete filtered.medications;
  }

  // Hide GP details for carers
  if (!canViewField("gpDetails", userRole)) {
    delete filtered.gpName;
    delete filtered.gpAddress;
    delete filtered.gpPhone;
  }

  return filtered;
}

/**
 * Get permission summary for a user role
 */
export function getPermissionSummary(userRole: UserRole) {
  return {
    role: userRole,
    canViewSensitiveData: ["owner", "manager", "nurse"].includes(userRole),
    canEditResidents: canEditResident(userRole),
    canDischarge: canDischargeResident(userRole),
    canViewAuditLogs: canViewAuditLogs(userRole),
    canDeleteData: canDeleteData(userRole),
    accessLevel:
      userRole === "owner" ? "full" :
      userRole === "manager" ? "high" :
      userRole === "nurse" ? "medical" :
      userRole === "care_assistant" ? "care" :
      "read-only",
  };
}

/**
 * Log access to sensitive data for GDPR compliance
 */
export function logDataAccess(params: {
  userId: string;
  residentId: string;
  field: string;
  action: "view" | "edit" | "export";
  timestamp: number;
}) {
  // This would typically send to your audit logging system
  console.info("Data access logged:", params);
  return params;
}
