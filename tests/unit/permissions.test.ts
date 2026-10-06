import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import * as perms from "@/lib/permissions";
import type { UserRole } from "@/lib/permissions";

const ROLES: UserRole[] = [
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

type RoleCheck = (role?: string) => boolean;

// Every exported single-argument `canX(role?)` check.
const ROLE_CHECKS: Array<[string, RoleCheck]> = Object.entries(perms)
  .filter(
    (entry): entry is [string, RoleCheck] =>
      typeof entry[1] === "function" &&
      entry[0].startsWith("can") &&
      !["canViewField", "canViewAlert", "canViewResidentSection", "canInviteMembers"].includes(entry[0])
  );

const RESIDENT_SECTIONS = [
  "overview",
  "care-file",
  "medication",
  "food-fluid",
  "daily-care",
  "progress-notes",
  "documents",
  "checks",
  "appointments",
  "incidents",
  "health-monitoring",
  "clinical",
  "wounds",
  "continence",
  "lifestyle-social",
  "hospital-transfer",
  "multidisciplinary-note",
];

describe("permissions: role x capability matrix", () => {
  it("matches the recorded snapshot (review any diff as a permission change)", () => {
    const matrix: Record<string, string[]> = {};
    for (const [name, fn] of ROLE_CHECKS) {
      matrix[name] = ROLES.filter((r) => fn(r));
    }
    for (const section of RESIDENT_SECTIONS) {
      matrix[`section:${section}`] = ROLES.filter((r) => perms.canViewResidentSection(section, r));
    }
    expect(matrix).toMatchSnapshot();
  });
});

describe("permissions: deny by default", () => {
  const allowListChecks = ROLE_CHECKS;

  it.each(allowListChecks)("%s denies an undefined role", (_name, fn) => {
    expect(fn(undefined)).toBe(false);
  });

  it.each(allowListChecks)("%s denies an unknown role string", (_name, fn) => {
    expect(fn("hacker")).toBe(false);
    expect(fn("")).toBe(false);
    expect(fn("OWNER")).toBe(false);
  });



  it("canViewResidentSection denies unknown sections and missing role", () => {
    expect(perms.canViewResidentSection("does-not-exist", "owner")).toBe(false);
    expect(perms.canViewResidentSection("overview", undefined)).toBe(false);
  });

});

describe("permissions: external & kitchen roles see no clinical resident data", () => {
  // "checks" is covered by its own test below.
  const scoped = RESIDENT_SECTIONS.filter((s) => s !== "checks");
  const clinicalSections = scoped.filter((s) => s !== "food-fluid");

  it("resident 'checks' section is hidden from kitchen staff and MDT visitors (RQIA may inspect)", () => {
    for (const r of ["kitchen_staff", "mdt"]) {
      expect({ r, allowed: perms.canViewResidentSection("checks", r) }).toEqual({ r, allowed: false });
    }
    expect(perms.canViewResidentSection("checks", "rqia")).toBe(true);
    expect(perms.canViewResidentSection("checks", "care_assistant")).toBe(true);
  });

  it.each(clinicalSections)("kitchen_staff cannot view resident section %s", (section) => {
    expect(perms.canViewResidentSection(section, "kitchen_staff")).toBe(false);
  });

  it("mdt only sees multidisciplinary notes among resident sections", () => {
    const visible = scoped.filter((s) => perms.canViewResidentSection(s, "mdt"));
    expect(visible).toEqual(["multidisciplinary-note"]);
  });

  it("rqia only sees incidents/clinical/wounds among resident sections", () => {
    const visible = scoped.filter((s) => perms.canViewResidentSection(s, "rqia"));
    expect(visible).toEqual(["incidents", "clinical", "wounds"]);
  });

  it("external roles cannot create/edit incidents or residents", () => {
    for (const r of ["mdt", "rqia", "kitchen_staff"]) {
      expect(perms.canEditIncident(r)).toBe(false);
      expect(perms.canCreateResident(r)).toBe(false);
      expect(perms.canToggleExternalAccess(r)).toBe(false);
    }
  });
});

describe("permissions: internal consistency", () => {

  it("editors of incidents can also view incidents", () => {
    for (const r of ROLES) {
      if (perms.canEditIncident(r)) {
        expect(perms.canViewIncidents(r)).toBe(true);
      }
    }
  });

  it("anyone who can delete a night check can add one", () => {
    for (const r of ROLES) {
      if (perms.canDeleteNightCheck(r)) expect(perms.canAddNightCheck(r)).toBe(true);
    }
  });

  it("anyone who can add diet menus can also manage them (owner/saas_admin included)", () => {
    for (const r of ["owner", "saas_admin"]) {
      if (perms.canAddDietMenu(r)) expect(perms.canManageMenu(r)).toBe(true);
    }
  });


  it("canViewFullStaffList implies canAccessStaffPage", () => {
    for (const r of ROLES) {
      if (perms.canViewFullStaffList(r)) expect(perms.canAccessStaffPage(r)).toBe(true);
    }
  });
});

describe("permissions: invitations", () => {
  it("only saas_admin/owner/manager can invite", () => {
    expect(ROLES.filter((r) => perms.canInviteMembers(r))).toEqual(["saas_admin", "owner", "manager"]);
  });

  it("no role can invite a role at or above its own level", () => {
    const rank: Partial<Record<UserRole, number>> = { saas_admin: 3, owner: 2, manager: 1 };
    for (const r of ROLES) {
      for (const invited of perms.getAllowedRolesToInvite(r)) {
        expect(rank[invited] ?? 0).toBeLessThan(rank[r] ?? 0);
      }
    }
  });

  it("roles that cannot invite get an empty allowed list", () => {
    for (const r of ROLES.filter((role) => !perms.canInviteMembers(role))) {
      expect(perms.getAllowedRolesToInvite(r)).toEqual([]);
    }
  });
});

describe("permissions: rota", () => {
  it("nurses manage rota templates only when approved", () => {
    expect(perms.canManageRotaTemplatesAndRules("nurse", false)).toBe(false);
    expect(perms.canManageRotaTemplatesAndRules("nurse", true)).toBe(true);
  });

  it("approved flag does not elevate non-nurse roles", () => {
    for (const r of ["care_assistant", "agency_nurse", "kitchen_staff", "mdt", "rqia"]) {
      expect(perms.canManageRotaTemplatesAndRules(r, true)).toBe(false);
    }
  });
});

function isReferenced(name: string): boolean {
  try {
    execSync(`git grep -lw ${name} -- app components hooks lib middleware.ts ":!lib/permissions.ts"`, {
      stdio: ["ignore", "pipe", "ignore"],
    });
    return true;
  } catch {
    return false; // git grep exits 1 when there are no matches
  }
}

describe("permissions: helpers are actually enforced", () => {
  // Helpers reached only via canViewResidentSection count as used.
  const VIA_SECTION = new Set([
    "canViewOverview", "canViewCareFile", "canViewContinence", "canViewProgressNotes", "canViewDocuments",
    "canViewAppointments", "canViewIncidents", "canViewHealthMonitoring", "canViewLifestyleSocial",
    "canViewHospitalTransfer", "canViewMultidisciplinaryNotes",
  ]);

  it("every exported permission helper is used by the app (no dead, unenforced checks)", () => {
    const helpers = Object.keys(perms).filter((k) => k.startsWith("can") && !VIA_SECTION.has(k));
    const unused = helpers.filter((name) => !isReferenced(name));
    expect(unused).toEqual([]);
  });
});
