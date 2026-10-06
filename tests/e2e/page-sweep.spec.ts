import { expect, test } from "@playwright/test";
import { login } from "./helpers";

/**
 * Opens every top-level dashboard and settings page as each staff role and checks it
 * renders without a crash, an error screen, or a failing Supabase request.
 * Deeper behaviour is covered by the feature specs; this catches pages nobody opens.
 */

test.use({ timezoneId: "Europe/London" });

const DASHBOARD_PAGES = [
  "/dashboard",
  "/dashboard/residents",
  "/dashboard/staff",
  "/dashboard/agency",
  "/dashboard/rota",
  "/dashboard/handover",
  "/dashboard/handover/documents",
  "/dashboard/appointment",
  "/dashboard/incidents",
  "/dashboard/action-plans",
  "/dashboard/notification",
  "/dashboard/wounds",
  "/dashboard/medications",
  "/dashboard/qwik-info/bowel-check",
  "/dashboard/qwik-info/fluid-check",
  "/dashboard/qwik-info/weight-check",
  "/dashboard/manager-audit",
  "/dashboard/careo-audit",
  "/dashboard/careo-audit/archived",
  "/dashboard/mdt-summary",
  "/dashboard/help",
];

const SETTINGS_PAGES = [
  "/settings/profile",
  "/settings/security",
  "/settings/organization",
  "/settings/company",
  "/settings/care-home",
  "/settings/members",
  "/settings/teams",
  "/settings/labels",
  "/settings/billing",
];

const ROLES = ["A1.owner", "A1.manager", "A1.nurse", "A1.care_assistant"];

for (const role of ROLES) {
  test(`${role}: every page renders without errors`, async ({ page }) => {
    test.setTimeout(15 * 60_000);
    await login(page, role);
    let current = "";
    const problems: string[] = [];
    page.on("pageerror", (e) => problems.push(`${current} pageerror: ${e.message.split("\n")[0]}`));
    page.on("response", (r) => {
      // 406 is PostgREST's "no row" answer to .single(); the pages handle it.
      if (r.status() >= 400 && r.status() !== 406 && r.url().includes(":54321/rest/")) {
        problems.push(`${current} ${r.status()} ${decodeURIComponent(r.url()).split("/rest/v1/")[1]?.slice(0, 140)}`);
      }
    });
    for (const path of [...DASHBOARD_PAGES, ...SETTINGS_PAGES]) {
      current = path;
      await test.step(path, async () => {
        const res = await page.goto(path);
        expect.soft(res?.status() ?? 0, `${path} HTTP status`).toBeLessThan(500);
        await page.waitForLoadState("networkidle");
        const errorScreen = await page.getByText(/Application error|Unhandled Runtime Error|Something went wrong/i).count();
        if (errorScreen > 0) problems.push(`${path} shows an error screen`);
      });
    }
    expect(problems).toEqual([]);
  });
}
