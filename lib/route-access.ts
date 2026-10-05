import {
  canAccessStaffPage,
  canBrowseCareFile,
  canViewTopicalMedication,
  canViewWeightMonitoring,
  canViewClinical,
  canViewMedication,
  canViewResidentSection,
  canViewSidebarActionPlans,
  canViewSidebarAgency,
  canViewSidebarAppointment,
  canViewSidebarAudit,
  canViewSidebarHandover,
  canViewSidebarIncidents,
  canViewSidebarNotification,
  canViewSidebarRota,
  canViewStaffList,
  type UserRole,
} from "@/lib/permissions";

/**
 * Server-side page access per role, enforced in middleware.ts so a page that is hidden
 * from a role's menu cannot be opened by typing its URL. The rules reuse lib/permissions.ts,
 * so the menu and the route check cannot drift apart. Data access is still enforced by RLS.
 */

const KNOWN_ROLES: readonly UserRole[] = [
  "saas_admin",
  "owner",
  "manager",
  "nurse",
  "care_assistant",
  "agency_nurse",
  "agency_care_assistant",
  "mdt",
  "rqia",
  "kitchen_staff",
];

/** Roles that only use their own portal and have no account settings pages. */
const PORTAL_ONLY_ROLES = new Set<string>(["kitchen_staff", "rqia", "mdt"]);

export function canAccessCareOAudit(role?: string): boolean {
  return role === "owner" || role === "manager" || role === "nurse" || role === "saas_admin";
}

/** Where a role lands when it is sent away from a page it may not open. */
export function getRoleHomePath(role?: string): string {
  switch (role) {
    case "kitchen_staff":
      return "/dashboard/kitchen-portal";
    case "rqia":
      return "/dashboard/rqia-portal";
    case "mdt":
      return "/dashboard/mdt-session";
    case "saas_admin":
      return "/admin";
    default:
      return "/dashboard";
  }
}

/** Resident profile URL segment -> who may open it (mirrors the profile cards and in-app links). */
const section = (name: string) => (role: string) => canViewResidentSection(name, role);
const RESIDENT_SECTIONS: Record<string, (role: string) => boolean> = {
  overview: section("overview"),
  "care-file": canBrowseCareFile,
  "care-file-v2": canBrowseCareFile,
  medication: section("medication"),
  "topical-medication": canViewTopicalMedication,
  "food-fluid": section("food-fluid"),
  "daily-care": section("daily-care"),
  "progress-notes": section("progress-notes"),
  documents: section("documents"),
  checks: section("checks"),
  appointments: section("appointments"),
  incidents: section("incidents"),
  "health-monitoring": section("health-monitoring"),
  "weight-monitoring": canViewWeightMonitoring,
  clinical: section("clinical"),
  wounds: section("wounds"),
  continence: section("continence"),
  "lifestyle-social": section("lifestyle-social"),
  "hospital-transfer": section("hospital-transfer"),
  "multidisciplinary-note": section("multidisciplinary-note"),
};

/** Top-level dashboard pages: path prefix -> who may open it. */
const DASHBOARD_PAGES: [prefix: string, allowed: (role: string) => boolean][] = [
  ["/dashboard/careo-audit", canAccessCareOAudit],
  ["/dashboard/manager-audit", canViewSidebarAudit],
  ["/dashboard/medications", canViewMedication],
  ["/dashboard/incidents", canViewSidebarIncidents],
  ["/dashboard/appointment", canViewSidebarAppointment],
  ["/dashboard/agency", canViewSidebarAgency],
  ["/dashboard/rota", canViewSidebarRota],
  ["/dashboard/wounds", canViewClinical],
  ["/dashboard/handover", canViewSidebarHandover],
  ["/dashboard/action-plans", canViewSidebarActionPlans],
  ["/dashboard/notification", canViewSidebarNotification],
];

const startsWithSegment = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/**
 * Returns the path to redirect to when `role` may not open `pathname`, or null when allowed.
 * Unknown or missing roles are left to the other checks (no redirect here).
 */
export function getRouteAccessRedirect(pathname: string, role?: string | null): string | null {
  if (!role || !KNOWN_ROLES.includes(role as UserRole)) return null;
  const home = getRoleHomePath(role);

  if (startsWithSegment(pathname, "/settings")) {
    return PORTAL_ONLY_ROLES.has(role) ? home : null;
  }

  if (!startsWithSegment(pathname, "/dashboard")) return null;

  // Kitchen staff only use the kitchen portal.
  if (role === "kitchen_staff") {
    return startsWithSegment(pathname, "/dashboard/kitchen-portal") ? null : home;
  }

  if (startsWithSegment(pathname, "/dashboard/staff")) {
    const allowed = pathname === "/dashboard/staff" || pathname === "/dashboard/staff/"
      ? canAccessStaffPage(role)
      : canViewStaffList(role);
    return allowed ? null : home;
  }

  for (const [prefix, allowed] of DASHBOARD_PAGES) {
    if (startsWithSegment(pathname, prefix)) return allowed(role) ? null : home;
  }

  // /dashboard/residents/<id>/<section>/...
  const resident = pathname.match(/^\/dashboard\/residents\/([^/]+)\/([^/]+)/);
  if (resident) {
    const allowed = RESIDENT_SECTIONS[resident[2]];
    if (allowed && !allowed(role)) {
      return `/dashboard/residents/${resident[1]}`;
    }
  }

  return null;
}
