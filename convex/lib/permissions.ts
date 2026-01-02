export type UserRole = "owner" | "manager" | "nurse" | "care_assistant";

// Simple role definitions for better-auth
// The organization plugin expects minimal role configuration
export const owner = {};

export const manager = {};

export const nurse = {};

export const careAssistant = {};

// Sidebar navigation permissions
export function canViewSidebarHome(role?: string): boolean {
    return (
        role === "owner" ||
        role === "manager" ||
        role === "nurse" ||
        role === "care_assistant" ||
        role === "admin"
    );
}

export function canViewSidebarResidents(role?: string): boolean {
    return (
        role === "owner" ||
        role === "manager" ||
        role === "nurse" ||
        role === "care_assistant" ||
        role === "admin"
    );
}

export function canViewSidebarStaff(role?: string): boolean {
    return role === "owner" || role === "manager" || role === "admin";
}

export function canViewSidebarHandover(role?: string): boolean {
    return role === "owner" || role === "manager" || role === "nurse" || role === "admin";
}

export function canViewSidebarAppointment(role?: string): boolean {
    return role === "owner" || role === "manager" || role === "nurse" || role === "admin";
}

export function canViewSidebarIncidents(role?: string): boolean {
    return role === "owner" || role === "manager" || role === "nurse" || role === "admin";
}

export function canViewSidebarActionPlans(role?: string): boolean {
    return role === "owner" || role === "manager" || role === "nurse" || role === "admin";
}

export function canViewSidebarNotification(role?: string): boolean {
    return (
        role === "owner" ||
        role === "manager" ||
        role === "nurse" ||
        role === "care_assistant" ||
        role === "admin"
    );
}

export function canViewSidebarAudit(role?: string): boolean {
    return role === "owner" || role === "manager" || role === "admin";
}

export function getAuditLabel(role?: string): "Audit" | "CareO Audit" | null {
    if (role === "owner" || role === "admin") {
        return "Audit";
    }
    if (role === "manager") {
        return "CareO Audit";
    }
    return null;
}

// Resident Overview
export function canViewOverview(role?: string): boolean {
    return (
        role === "owner" ||
        role === "manager" ||
        role === "nurse" ||
        role === "care_assistant" ||
        role === "admin"
    );
}

export function canEditOverview(role?: string): boolean {
    return role === "owner" || role === "manager" || role === "admin";
}

// Care File
export function canViewCareFile(role?: string): boolean {
    return role === "owner" || role === "manager" || role === "nurse" || role === "admin";
}

export function canFillCareFileForms(role?: string): boolean {
    return role === "owner" || role === "manager" || role === "nurse" || role === "admin";
}

// Medication
export function canViewMedication(role?: string): boolean {
    return role === "owner" || role === "manager" || role === "nurse" || role === "admin";
}

// Food & Fluid
export function canAddDietMenu(role?: string): boolean {
    return role === "owner" || role === "manager" || role === "nurse" || role === "admin";
}

export function canLogFoodFluidEntry(role?: string): boolean {
    return (
        role === "owner" ||
        role === "manager" ||
        role === "nurse" ||
        role === "care_assistant" ||
        role === "admin"
    );
}

// Daily Care
export function canCreateQuickCareNotes(role?: string): boolean {
    return role === "owner" || role === "manager" || role === "nurse" || role === "admin";
}

export function canLogDailyCare(role?: string): boolean {
    return (
        role === "owner" ||
        role === "manager" ||
        role === "nurse" ||
        role === "care_assistant" ||
        role === "admin"
    );
}

// Night Check
export function canAddNightCheck(role?: string): boolean {
    return role === "owner" || role === "manager" || role === "nurse" || role === "admin";
}

// Progress Notes
export function canViewProgressNotes(role?: string): boolean {
    return role === "owner" || role === "manager" || role === "nurse" || role === "admin";
}

// Documents
export function canViewDocuments(role?: string): boolean {
    return role === "owner" || role === "manager" || role === "nurse" || role === "admin";
}

// Appointments
export function canViewAppointments(role?: string): boolean {
    return role === "owner" || role === "manager" || role === "nurse" || role === "admin";
}

// Incidents & Falls
export function canViewIncidents(role?: string): boolean {
    return role === "owner" || role === "manager" || role === "nurse" || role === "admin";
}

// Health & Monitoring
export function canViewHealthMonitoring(role?: string): boolean {
    return role === "owner" || role === "manager" || role === "nurse" || role === "admin";
}

// Clinical
export function canViewClinical(role?: string): boolean {
    return role === "owner" || role === "manager" || role === "nurse" || role === "admin";
}

// Lifestyle & Social
export function canViewLifestyleSocial(role?: string): boolean {
    return (
        role === "owner" ||
        role === "manager" ||
        role === "nurse" ||
        role === "care_assistant" ||
        role === "admin"
    );
}

// Hospital Transfer
export function canViewHospitalTransfer(role?: string): boolean {
    return role === "owner" || role === "manager" || role === "nurse" || role === "admin";
}

// Multidisciplinary Notes
export function canViewMultidisciplinaryNotes(role?: string): boolean {
    return role === "owner" || role === "manager" || role === "nurse" || role === "admin";
}

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
        case "night-check":
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
