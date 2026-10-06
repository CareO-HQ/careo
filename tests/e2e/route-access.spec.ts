import { expect, test, type Page } from "@playwright/test";
import { login, world } from "./helpers";

/**
 * Pages hidden from a role's menu cannot be opened by typing the URL (middleware.ts +
 * lib/route-access.ts). Each case was reachable before the fix.
 */

test.use({ timezoneId: "Europe/London" });

async function expectRedirect(page: Page, from: string, to: RegExp) {
  await page.goto(from);
  await expect(page).toHaveURL(to);
}

test("BUG: care assistant cannot open Medications, Incidents, Appointment or Agency by URL", async ({ page }) => {
  await login(page, "A1.care_assistant");
  for (const path of ["/dashboard/medications", "/dashboard/incidents", "/dashboard/appointment", "/dashboard/agency"]) {
    await expectRedirect(page, path, /\/dashboard$/);
  }
});

test("BUG: care assistant cannot open a resident's medication section by URL", async ({ page }) => {
  const residentId = world().homes.A1.residentId;
  await login(page, "A1.care_assistant");
  await expectRedirect(page, `/dashboard/residents/${residentId}/medication`, new RegExp(`/dashboard/residents/${residentId}$`));
  // Sections a care assistant uses still open.
  await page.goto(`/dashboard/residents/${residentId}/daily-care`);
  await expect(page).toHaveURL(new RegExp(`/residents/${residentId}/daily-care`));
});

test("BUG: agency nurse cannot open Agency or Rota by URL", async ({ page }) => {
  await login(page, "A1.agency_nurse");
  for (const path of ["/dashboard/agency", "/dashboard/rota"]) {
    await expectRedirect(page, path, /\/dashboard$/);
  }
  // Pages in their menu still open.
  await page.goto("/dashboard/medications");
  await expect(page).toHaveURL(/\/dashboard\/medications$/);
});

test("BUG: the owner can open CareO Audit", async ({ page }) => {
  await login(page, "A1.owner");
  await page.goto("/dashboard/careo-audit");
  await expect(page.getByRole("button", { name: "New Audit" })).toBeVisible({ timeout: 30_000 });
  await expect(page).toHaveURL(/\/dashboard\/careo-audit$/);
});

test("BUG: kitchen staff cannot open settings", async ({ page }) => {
  await login(page, "A1.kitchen_staff");
  await expectRedirect(page, "/settings/profile", /\/dashboard\/kitchen-portal$/);
});

for (const key of ["A1.rqia", "A1.mdt"]) {
  test(`BUG: ${key} cannot open settings`, async ({ page }) => {
    const u = world().users[key];
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(u.email);
    await page.locator('input[name="password"], input[type="password"]').first().fill("Test-Password-123!");
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    for (const path of ["/settings/profile", "/settings/members", "/settings/organization"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/dashboard\/(rqia|mdt)-/);
    }
  });
}
