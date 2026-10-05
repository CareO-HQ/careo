import { expect, test } from "@playwright/test";
import { login } from "./helpers";
import { createResident, openResidentPage, trackPageErrors } from "./resident-helpers";

/**
 * Resident profile hub: every card opens its sub-page, and each sub-page renders
 * without crashing or showing "Resident not found".
 */

const CARDS: { heading: string; path: string }[] = [
  { heading: "Overview", path: "overview" },
  { heading: "Care File", path: "care-file" },
  { heading: "Medication", path: "medication" },
  { heading: "Food & Fluid", path: "food-fluid" },
  { heading: "Daily Care", path: "daily-care" },
  { heading: "Continence", path: "continence" },
  { heading: "Documents", path: "documents" },
  { heading: "Checks", path: "checks" },
  { heading: "Appointments", path: "appointments" },
  { heading: "Incidents & Falls", path: "incidents" },
  { heading: "Health & Monitoring", path: "health-monitoring" },
  { heading: "Wounds", path: "wounds" },
  { heading: "Lifestyle & Social", path: "lifestyle-social" },
  { heading: "Hospital Passport", path: "hospital-transfer" },
  { heading: "Multi Disciplinary Note", path: "multidisciplinary-note" },
];

const SUB_PAGES = [
  ...CARDS.map((c) => c.path),
  "care-file-v2",
  "weight-monitoring",
  "progress-notes",
  "food-fluid/documents",
  "daily-care/documents",
  "continence/documents",
  "checks/documents",
  "health-monitoring/documents",
  "progress-notes/documents",
];

test.describe("resident profile hub (nurse)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "A1.nurse");
  });

  test("profile header shows the resident and every feature card", async ({ page }) => {
    const r = await createResident("Hub");
    const errors = trackPageErrors(page);
    await openResidentPage(page, r.id);
    await expect(page.getByText(r.fullName).first()).toBeVisible();
    for (const c of CARDS) await expect(page.getByRole("heading", { name: c.heading, exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });

  for (const c of CARDS) {
    test(`'${c.heading}' card opens /${c.path}`, async ({ page }) => {
      const r = await createResident("Card");
      await openResidentPage(page, r.id);
      await page.getByRole("heading", { name: c.heading, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/residents/${r.id}/${c.path}`));
    });
  }

  test("every resident sub-page renders without crashing", async ({ page }) => {
    test.setTimeout(600_000);
    const r = await createResident("Pages");
    const errors = trackPageErrors(page);
    const failures: string[] = [];
    for (const sub of SUB_PAGES) {
      errors.length = 0;
      const serverErrors: string[] = [];
      const onResponse = (res: import("@playwright/test").Response) => {
        if (res.status() >= 500) serverErrors.push(`${res.status()} ${res.url()}`);
      };
      page.on("response", onResponse);
      await openResidentPage(page, r.id, sub);
      await page.waitForTimeout(2_000);
      page.off("response", onResponse);
      if (await page.getByText("Resident not found").isVisible()) failures.push(`${sub}: Resident not found`);
      if (errors.length) failures.push(`${sub}: ${errors.join(" | ")}`);
      if (serverErrors.length) failures.push(`${sub}: ${serverErrors.join(" | ")}`);
    }
    expect(failures).toEqual([]);
  });

  test("nurse has no Topical Medication card (care-assistant only)", async ({ page }) => {
    const r = await createResident("TopicalN");
    await openResidentPage(page, r.id);
    await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Topical Medication", exact: true })).toHaveCount(0);
  });

  test("unknown resident id shows a not-found state", async ({ page }) => {
    await page.goto(`/dashboard/residents/00000000-0000-4000-8000-000000000000/food-fluid`);
    await expect(page.getByText("Resident not found")).toBeVisible({ timeout: 30_000 });
  });
});

test.describe("resident profile hub (care assistant)", () => {
  test("care assistant opens Topical Medication from its card", async ({ page }) => {
    const r = await createResident("TopicalCa");
    const errors = trackPageErrors(page);
    await login(page, "A1.care_assistant");
    await openResidentPage(page, r.id);
    await page.getByRole("heading", { name: "Topical Medication", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/residents/${r.id}/topical-medication`));
    await expect(page.getByText("Resident not found")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
