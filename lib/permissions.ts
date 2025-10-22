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

const member = ac.newRole({
  project: ["create"],
  ...memberAc.statements // Include default member permissions
});

const admin = ac.newRole({
  project: ["create", "update", "share"],
  ...adminAc.statements // Include default admin permissions
});

const owner = ac.newRole({
  project: ["create", "update", "delete"],
  ...ownerAc.statements // Include default owner permissions
});

export { member, admin, owner, ac, statement };

/**
 * Healthcare-specific field-level permissions and access control
 * Implements role-based access control (RBAC) for sensitive resident information
 */

export type UserRole = "owner" | "admin" | "nurse" | "carer" | "member" | "viewer";

export interface PermissionConfig {
  canView: boolean;
  canEdit: boolean;
  requiresConsent?: boolean;
}

/**
 * Define which fields require elevated permissions
 */
export const SENSITIVE_FIELDS = {
  nhsHealthNumber: ["owner", "admin", "nurse"],
  medicalConditions: ["owner", "admin", "nurse"],
  medications: ["owner", "admin", "nurse"],
  allergies: ["owner", "admin", "nurse", "carer"],
  risks: ["owner", "admin", "nurse", "carer"],
  emergencyContacts: ["owner", "admin", "nurse", "carer"],
  gpDetails: ["owner", "admin", "nurse"],
  careManagerDetails: ["owner", "admin", "nurse", "carer"],
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
  return ["owner", "admin", "nurse"].includes(userRole);
}

/**
 * Check if user can discharge a resident
 */
export function canDischargeResident(userRole: UserRole): boolean {
  return ["owner", "admin"].includes(userRole);
}

/**
 * Check if user can view audit logs
 */
export function canViewAuditLogs(userRole: UserRole): boolean {
  return ["owner", "admin"].includes(userRole);
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
    canViewSensitiveData: ["owner", "admin", "nurse"].includes(userRole),
    canEditResidents: canEditResident(userRole),
    canDischarge: canDischargeResident(userRole),
    canViewAuditLogs: canViewAuditLogs(userRole),
    canDeleteData: canDeleteData(userRole),
    accessLevel:
      userRole === "owner" ? "full" :
      userRole === "admin" ? "high" :
      userRole === "nurse" ? "medical" :
      userRole === "carer" ? "care" :
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
