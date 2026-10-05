import { describe, expect, it } from "vitest";
import { getRouteAccessRedirect } from "@/lib/route-access";

const R = "/dashboard/residents/11111111-1111-4111-8111-111111111111";

describe("route access: pages hidden from a role's menu cannot be opened by URL", () => {
  it.each([
    ["care_assistant", "/dashboard/medications"],
    ["care_assistant", "/dashboard/incidents"],
    ["care_assistant", "/dashboard/appointment"],
    ["care_assistant", "/dashboard/agency"],
    ["care_assistant", "/dashboard/staff"],
    ["care_assistant", "/dashboard/careo-audit"],
    ["care_assistant", "/dashboard/manager-audit"],
    ["care_assistant", "/dashboard/wounds"],
    ["agency_care_assistant", "/dashboard/medications"],
    ["agency_care_assistant", "/dashboard/incidents"],
    ["agency_care_assistant", "/dashboard/appointment"],
    ["agency_care_assistant", "/dashboard/agency"],
    ["agency_care_assistant", "/dashboard/rota"],
    ["agency_nurse", "/dashboard/agency"],
    ["agency_nurse", "/dashboard/rota"],
    ["agency_nurse", "/dashboard/staff"],
    ["agency_nurse", "/dashboard/careo-audit"],
    ["nurse", "/dashboard/manager-audit"],
    ["nurse", "/dashboard/staff/some-user-id/trainings"],
  ])("%s is sent home from %s", (role, path) => {
    expect(getRouteAccessRedirect(path, role)).toBe("/dashboard");
  });

  it.each([
    ["owner", "/dashboard/careo-audit"],
    ["owner", "/dashboard/careo-audit/governance/abc"],
    ["manager", "/dashboard/careo-audit"],
    ["nurse", "/dashboard/careo-audit"],
    ["saas_admin", "/dashboard/careo-audit"],
    ["owner", "/dashboard/manager-audit/0"],
    ["nurse", "/dashboard/medications"],
    ["agency_nurse", "/dashboard/medications"],
    ["agency_nurse", "/dashboard/incidents"],
    ["agency_nurse", "/dashboard/appointment"],
    ["nurse", "/dashboard/agency"],
    ["nurse", "/dashboard/staff"],
    ["manager", "/dashboard/staff/some-user-id/trainings"],
    ["care_assistant", "/dashboard/rota"],
    ["care_assistant", "/dashboard/handover"],
    ["care_assistant", "/dashboard/action-plans"],
    ["care_assistant", "/dashboard"],
    ["care_assistant", "/dashboard/residents"],
  ])("%s may open %s", (role, path) => {
    expect(getRouteAccessRedirect(path, role)).toBeNull();
  });
});

describe("route access: resident profile sections", () => {
  it.each(["medication", "health-monitoring", "progress-notes", "documents", "incidents", "hospital-transfer", "multidisciplinary-note"])(
    "a care assistant is sent back to the resident from /%s",
    (section) => {
      expect(getRouteAccessRedirect(`${R}/${section}`, "care_assistant")).toBe(R);
    }
  );

  it.each(["food-fluid", "daily-care", "continence", "lifestyle-social", "checks", "overview", "topical-medication", "weight-monitoring", "care-file", "care-file-v2/v2-dependency"])(
    "a care assistant may open /%s",
    (section) => {
      expect(getRouteAccessRedirect(`${R}/${section}`, "care_assistant")).toBeNull();
    }
  );

  it("RQIA keeps the sections their portal links to", () => {
    expect(getRouteAccessRedirect(`${R}/incidents/folder-1`, "rqia")).toBeNull();
    expect(getRouteAccessRedirect(`${R}/wounds/folder-1`, "rqia")).toBeNull();
    expect(getRouteAccessRedirect(`${R}/medication`, "rqia")).toBe(R);
    expect(getRouteAccessRedirect(`${R}/care-file-v2`, "rqia")).toBe(R);
  });

  it("MDT keeps the multidisciplinary notes", () => {
    expect(getRouteAccessRedirect(`${R}/multidisciplinary-note`, "mdt")).toBeNull();
    expect(getRouteAccessRedirect(`${R}/medication`, "mdt")).toBe(R);
  });

  it("the resident profile itself and unknown sections are not restricted here", () => {
    expect(getRouteAccessRedirect(R, "care_assistant")).toBeNull();
    expect(getRouteAccessRedirect(`${R}/additional`, "care_assistant")).toBeNull();
  });
});

describe("route access: settings and portal-only roles", () => {
  it.each([
    ["kitchen_staff", "/dashboard/kitchen-portal"],
    ["rqia", "/dashboard/rqia-portal"],
    ["mdt", "/dashboard/mdt-session"],
  ])("%s is sent to %s from /settings", (role, home) => {
    expect(getRouteAccessRedirect("/settings/profile", role)).toBe(home);
    expect(getRouteAccessRedirect("/settings/members", role)).toBe(home);
  });

  it.each(["owner", "manager", "nurse", "care_assistant", "agency_nurse", "agency_care_assistant"])(
    "%s may open /settings",
    (role) => {
      expect(getRouteAccessRedirect("/settings/profile", role)).toBeNull();
    }
  );

  it("kitchen staff stay on the kitchen portal", () => {
    expect(getRouteAccessRedirect("/dashboard/residents", "kitchen_staff")).toBe("/dashboard/kitchen-portal");
    expect(getRouteAccessRedirect("/dashboard/kitchen-portal", "kitchen_staff")).toBeNull();
  });

  it("does nothing for a missing or unknown role", () => {
    expect(getRouteAccessRedirect("/dashboard/medications", undefined)).toBeNull();
    expect(getRouteAccessRedirect("/dashboard/medications", "member")).toBeNull();
  });
});
