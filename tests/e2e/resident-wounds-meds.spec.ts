import { expect, test, type Page } from "@playwright/test";
import { login, world } from "./helpers";
import { createResident, db, expectToast, openResidentPage, trackPageErrors, waitForRows } from "./resident-helpers";

/**
 * Resident profile -> wounds, medication, incidents and hospital passport.
 * These forms are long, so the specs cover creation where the flow is short
 * (wounds) and entry points / validation / role gating elsewhere.
 */

test.use({ timezoneId: "Europe/London" });

test.describe("wounds", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "A1.nurse");
  });

  async function startWound(page: Page, residentId: string, type: string) {
    await openResidentPage(page, residentId, "wounds");
    await page.getByRole("button", { name: "Add Wound" }).click();
    const step1 = page.getByRole("dialog", { name: "Step 1: Select Wound Type" });
    await step1.getByText(type, { exact: true }).click();
    const step2 = page.getByRole("dialog", { name: "Step 2: Select Wound Location" });
    await expect(step2).toBeVisible();
    return step2;
  }

  test("creates a pressure ulcer via type -> body map -> date", async ({ page }) => {
    const r = await createResident("Wnd");
    const nurse = world().users["A1.nurse"];
    const step2 = await startWound(page, r.id, "Pressure Ulcer");
    await step2.locator("div.absolute.border-2.cursor-pointer").first().click();
    await step2.getByRole("button", { name: /Next/ }).click();

    const step3 = page.getByRole("dialog", { name: "Step 3: Date Identified" });
    await expect(step3.locator('input[type="date"]')).toBeVisible();
    await step3.getByRole("button", { name: /Create/ }).click();
    await expectToast(page, "Wound created successfully");

    const [folder] = await waitForRows<{ id: string; wound_type: string; organization_id: string }>(() =>
      db().from("wound_folders").select("*").eq("resident_id", r.id)
    );
    expect(folder).toMatchObject({ wound_type: "Pressure Ulcer", organization_id: nurse.home.orgId });
    const [wound] = await waitForRows<{ wound_folder_id: string; wound_type: string }>(() =>
      db().from("wounds").select("*").eq("resident_id", r.id)
    );
    expect(wound).toMatchObject({ wound_folder_id: folder.id, wound_type: "Pressure Ulcer" });

    await openResidentPage(page, r.id, "wounds");
    await expect(page.getByText("Pressure Ulcer").first()).toBeVisible();
  });

  test("a body map location is required", async ({ page }) => {
    const r = await createResident("WndLoc");
    const step2 = await startWound(page, r.id, "Skin Tear");
    await step2.getByRole("button", { name: /Next/ }).click();
    await expectToast(page, "Please select a location on the body map");
    expect((await db().from("wound_folders").select("id").eq("resident_id", r.id)).data).toEqual([]);
  });

  test("Back returns from the body map to the wound type step", async ({ page }) => {
    const r = await createResident("WndBack");
    const step2 = await startWound(page, r.id, "Burn");
    await step2.getByRole("button", { name: /Back/ }).click();
    await expect(page.getByRole("dialog", { name: "Step 1: Select Wound Type" })).toBeVisible();
  });
});

test.describe("medication", () => {
  test("nurse sees medication tabs and can start adding a medication", async ({ page }) => {
    const r = await createResident("Med");
    const errors = trackPageErrors(page);
    await login(page, "A1.nurse");
    await openResidentPage(page, r.id, "medication");
    for (const tab of ["Today's Medications", "Active Medications", "eMAR", "Discontinued", "Kardex", "History"]) {
      await expect(page.getByRole("tab", { name: tab })).toBeVisible();
    }
    await page.getByRole("button", { name: "Add Medication" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Select Medication Type")).toBeVisible();
    for (const type of ["Scheduled", "PRN", "Topical", "Supplement"]) await expect(dialog.getByText(type, { exact: true }).first()).toBeVisible();
    await dialog.getByText("Scheduled", { exact: true }).first().click();
    await expect(dialog.getByRole("heading", { name: "Create Medication" })).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Name*" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("medication step 1 rejects a blank name", async ({ page }) => {
    const r = await createResident("MedReq");
    await login(page, "A1.nurse");
    await openResidentPage(page, r.id, "medication");
    await page.getByRole("button", { name: "Add Medication" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByText("Scheduled", { exact: true }).first().click();
    await dialog.getByRole("button", { name: /Next|Continue/ }).last().click();
    await expect(dialog.getByText(/required|fill in all required/i).first().or(page.locator("[data-sonner-toast]").first())).toBeVisible();
    expect((await db().from("medications").select("id").eq("resident_id", r.id)).data ?? []).toEqual([]);
  });

  test("care assistant cannot open a resident's medication page", async ({ page }) => {
    const r = await createResident("MedCa");
    await login(page, "A1.care_assistant");
    await openResidentPage(page, r.id);
    await expect(page.getByRole("heading", { name: "Medication", exact: true })).toHaveCount(0);
    await openResidentPage(page, r.id, "medication");
    await expect(page.getByRole("button", { name: "Add Medication" })).toHaveCount(0);
  });
});

test.describe("incidents & hospital passport", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "A1.nurse");
  });

  test("Create Incident opens the incident form", async ({ page }) => {
    const r = await createResident("Inc");
    const errors = trackPageErrors(page);
    await openResidentPage(page, r.id, "incidents");
    await page.getByRole("button", { name: "Create Incident" }).click();
    await expect(page.getByRole("dialog").or(page.locator("form")).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("hospital passport shows the record-missing state and opens the create form", async ({ page }) => {
    const r = await createResident("Hosp");
    const errors = trackPageErrors(page);
    await openResidentPage(page, r.id, "hospital-transfer");
    await expect(page.getByText("Hospital transfer records")).toBeVisible();
    await expect(page.getByText("Record missing")).toBeVisible();
    await page.getByRole("button", { name: /Create Passport/ }).click();
    await expect(page.getByRole("dialog").or(page.locator("form")).first()).toBeVisible();
    expect(errors).toEqual([]);
  });
});
