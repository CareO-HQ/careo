export type UserRole = "saas_admin" | "owner" | "manager" | "nurse" | "care_assistant" | "agency_nurse" | "agency_care_assistant";

// Simple role definitions for better-auth
// The organization plugin expects minimal role configuration
export const owner = {};

export const manager = {};

export const nurse = {};

export const careAssistant = {};

// Agency role definitions
export const agencyNurse = {};
export const agencyCareAssistant = {};

// Sidebar navigation permissions
export function canViewSidebarHome(role?: string): boolean {
  return (
    role === "owner" ||
    role === "manager" ||
    role === "nurse" ||
    role === "care_assistant" ||
    role === "saas_admin" ||
    role === "agency_nurse" ||
    role === "agency_care_assistant"
  );
}

/**
 * Define which fields require elevated permissions
 */
export const SENSITIVE_FIELDS = {
  nhsHealthNumber: ["owner", "saas_admin", "nurse", "agency_nurse"],
  medicalConditions: ["owner", "saas_admin", "nurse", "agency_nurse"],
  medications: ["owner", "saas_admin", "nurse", "agency_nurse"],
  allergies: ["owner", "saas_admin", "nurse", "care_assistant", "agency_nurse", "agency_care_assistant"],
  risks: ["owner", "saas_admin", "nurse", "care_assistant", "agency_nurse", "agency_care_assistant"],
  emergencyContacts: ["owner", "saas_admin", "nurse", "care_assistant", "agency_nurse", "agency_care_assistant"],
  gpDetails: ["owner", "saas_admin", "nurse", "agency_nurse"],
  careManagerDetails: ["owner", "saas_admin", "nurse", "care_assistant", "agency_nurse", "agency_care_assistant"],
} as const;

/**
 * Check if user has permission to view a specific field
 */
export function canViewField(field: keyof typeof SENSITIVE_FIELDS, userRole: UserRole): boolean {
  const allowedRoles = SENSITIVE_FIELDS[field];
  return allowedRoles.includes(userRole as any);
}

export function canViewSidebarResidents(role?: string): boolean {
  return (
    role === "owner" ||
    role === "manager" ||
    role === "nurse" ||
    role === "care_assistant" ||
    role === "saas_admin" ||
    role === "agency_nurse" ||
    role === "agency_care_assistant"
  );
}

export function canCreateResident(role?: string): boolean {
  return (
    role === "owner" ||
    role === "manager" ||
    role === "nurse" ||
    role === "saas_admin"
  );
}

export function canViewSidebarStaff(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "saas_admin";
}

export function canViewSidebarAgency(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "nurse" || role === "saas_admin";
}

export function canSwitchTeam(role?: string): boolean {
  return role !== "agency_nurse" && role !== "agency_care_assistant";
}

export function canViewSidebarHandover(role?: string): boolean {
  return (
    role === "owner" ||
    role === "manager" ||
    role === "nurse" ||
    role === "saas_admin" ||
    role === "care_assistant" ||
    role === "agency_nurse" ||
    role === "agency_care_assistant"
  );
}

export function canViewSidebarAppointment(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "nurse" || role === "saas_admin" || role === "agency_nurse";
}

export function canViewSidebarIncidents(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "nurse" || role === "saas_admin" || role === "agency_nurse";
}

export function canViewSidebarActionPlans(role?: string): boolean {
  return (
    role === "owner" ||
    role === "manager" ||
    role === "nurse" ||
    role === "care_assistant" ||
    role === "saas_admin" ||
    role === "agency_nurse" ||
    role === "agency_care_assistant"
  );
}

export function canViewSidebarNotification(role?: string): boolean {
  return (
    role === "owner" ||
    role === "manager" ||
    role === "nurse" ||
    role === "care_assistant" ||
    role === "saas_admin" ||
    role === "agency_nurse" ||
    role === "agency_care_assistant"
  );
}

export function canViewSidebarAudit(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "saas_admin";
}


// Resident Overview
export function canViewOverview(role?: string): boolean {
  return (
    role === "owner" ||
    role === "manager" ||
    role === "nurse" ||
    role === "care_assistant" ||
    role === "saas_admin" ||
    role === "agency_nurse" ||
    role === "agency_care_assistant"
  );
}

export function canEditOverview(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "nurse" || role === "saas_admin" || role === "agency_nurse";
}

// Care File
export function canViewCareFile(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "nurse" || role === "saas_admin" || role === "agency_nurse";
}

export function canFillCareFileForms(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "nurse" || role === "saas_admin" || role === "agency_nurse";
}

// Medication
export function canViewMedication(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "nurse" || role === "saas_admin" || role === "agency_nurse";
}

// Food & Fluid
export function canAddDietMenu(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "nurse" || role === "saas_admin" || role === "agency_nurse";
}

export function canManageMenu(role?: string): boolean {
  return role === "manager" || role === "nurse" || role === "agency_nurse";
}

export function canLogFoodFluidEntry(role?: string): boolean {
  return (
    role === "owner" ||
    role === "manager" ||
    role === "nurse" ||
    role === "care_assistant" ||
    role === "saas_admin" ||
    role === "agency_nurse" ||
    role === "agency_care_assistant"
  );
}

// Daily Care
export function canCreateQuickCareNotes(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "nurse" || role === "saas_admin" || role === "agency_nurse";
}

export function canLogDailyCare(role?: string): boolean {
  return (
    role === "owner" ||
    role === "manager" ||
    role === "nurse" ||
    role === "care_assistant" ||
    role === "saas_admin" ||
    role === "agency_nurse" ||
    role === "agency_care_assistant"
  );
}

// Continence (Bowel & Bladder Care)
export function canViewContinence(role?: string): boolean {
  return (
    role === "owner" ||
    role === "manager" ||
    role === "nurse" ||
    role === "care_assistant" ||
    role === "saas_admin" ||
    role === "agency_nurse" ||
    role === "agency_care_assistant"
  );
}

export function canLogContinence(role?: string): boolean {
  return (
    role === "owner" ||
    role === "manager" ||
    role === "nurse" ||
    role === "care_assistant" ||
    role === "saas_admin" ||
    role === "agency_nurse" ||
    role === "agency_care_assistant"
  );
}

// Night Check
export function canAddNightCheck(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "nurse" || role === "saas_admin" || role === "agency_nurse";
}

export function canDeleteNightCheck(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "nurse" || role === "saas_admin" || role === "agency_nurse";
}

// Progress Notes
export function canViewProgressNotes(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "nurse" || role === "saas_admin" || role === "agency_nurse";
}

// Documents
export function canViewDocuments(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "nurse" || role === "saas_admin" || role === "agency_nurse";
}

// Appointments
export function canViewAppointments(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "nurse" || role === "saas_admin" || role === "agency_nurse";
}

// Incidents & Falls
export function canViewIncidents(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "nurse" || role === "saas_admin" || role === "agency_nurse";
}

// Health & Monitoring
export function canViewHealthMonitoring(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "nurse" || role === "saas_admin" || role === "agency_nurse";
}

export function canViewHealthSafetyTitle(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "nurse" || role === "saas_admin" || role === "agency_nurse";
}

// Clinical
export function canViewClinical(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "nurse" || role === "saas_admin" || role === "agency_nurse";
}

// Lifestyle & Social
export function canViewLifestyleSocial(role?: string): boolean {
  return (
    role === "owner" ||
    role === "manager" ||
    role === "nurse" ||
    role === "care_assistant" ||
    role === "saas_admin" ||
    role === "agency_nurse" ||
    role === "agency_care_assistant"
  );
}

export function canAddLifestyleActivity(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "nurse" || role === "saas_admin" || role === "care_assistant" || role === "agency_nurse" || role === "agency_care_assistant";
}

// Hospital Transfer
export function canViewHospitalTransfer(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "nurse" || role === "saas_admin" || role === "agency_nurse";
}

// Multidisciplinary Notes
export function canViewMultidisciplinaryNotes(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "nurse" || role === "saas_admin" || role === "agency_nurse";
}

export function canEditIncident(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "saas_admin" || role === "nurse" || role === "agency_nurse";
}

export function canCreateIncident(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "saas_admin" || role === "nurse" || role === "agency_nurse";
}

export function canForwardIncident(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "saas_admin" || role === "nurse" || role === "agency_nurse";
}

export function canViewAlert(alertType: string, role?: string): boolean {
  if (!role) return false;

  if (alertType === "food_fluid") {
    return role === "care_assistant" || role === "agency_care_assistant";
  }

  if (alertType === "medication") {
    return role === "nurse" || role === "agency_nurse";
  }

  if (role === "owner" || role === "manager" || role === "saas_admin") {
    return alertType !== "food_fluid" && alertType !== "medication";
  }

  return true;
}

export function canViewAuditLogs(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "saas_admin";
}

export function canViewStaffList(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "saas_admin";
}

export function canManageDiet(role?: string): boolean {
  if (!role) return false;
  return role === "owner" || role === "manager" || role === "nurse" || role === "agency_nurse";
}

export function canViewResidentSection(section: string, role?: string): boolean {
  if (!role) return false;

  switch (section) {
    case "overview":
      return canViewOverview(role);
    case "care-file":
      return canViewCareFile(role);
    case "medication":
      return canViewMedication(role);
    case "food-fluid":
      // All users can view; care assistant included explicitly
      return canLogFoodFluidEntry(role);
    case "daily-care":
      // All users can view; care assistant included explicitly
      return canLogDailyCare(role);
    case "progress-notes":
      return canViewProgressNotes(role);
    case "documents":
      return canViewDocuments(role);
    case "checks":
      // Page is visible to all users
      return true;
    case "appointments":
      return canViewAppointments(role);
    case "incidents":
      return canViewIncidents(role);
    case "health-monitoring":
      return canViewHealthMonitoring(role);
    case "clinical":
      return canViewClinical(role);
    case "wounds":
      return canViewClinical(role);
    case "continence":
      return canViewContinence(role);
    case "lifestyle-social":
      return canViewLifestyleSocial(role);
    case "hospital-transfer":
      return canViewHospitalTransfer(role);
    case "multidisciplinary-note":
      return canViewMultidisciplinaryNotes(role);
    default:
      return false;
  }
}

export function canInviteMembers(role: UserRole): boolean {
  return role === "saas_admin" || role === "owner" || role === "manager";
}

export function getAllowedRolesToInvite(role: UserRole): UserRole[] {
  if (role === "saas_admin") {
    return ["owner", "manager"];
  }
  if (role === "owner") {
    return ["manager"];
  }
  if (role === "manager") {
    return ["nurse", "care_assistant"];
  }
  return [];
}

export function canViewSidebarRota(role?: string): boolean {
  return (
    role === "owner" ||
    role === "manager" ||
    role === "nurse" ||
    role === "care_assistant" ||
    role === "saas_admin"
  );
}

export function canManageRotaTemplatesAndRules(role?: string, isApprovedNurse?: boolean): boolean {
  if (role === "saas_admin" || role === "owner" || role === "manager") return true;
  if (role === "nurse" && isApprovedNurse) return true;
  return false;
}

export function canToggleApprovedNurseRole(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "saas_admin";
}

export function canManageContractedHours(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "saas_admin";
}

