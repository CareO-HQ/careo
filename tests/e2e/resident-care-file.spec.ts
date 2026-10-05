import { expect, test, type Page } from "@playwright/test";
import { anonClient, PASSWORD } from "../db/fixtures";
import { login, world } from "./helpers";
import { createResident, db, expectToast, openResidentPage, pickOption, trackPageErrors, waitForRows } from "./resident-helpers";

/**
 * Resident profile -> Care File (v2, plus a v1 smoke check): filling an assessment form,
 * adding and versioning a care plan, uploading/deleting PDF documents, and permissions.
 */

const V2_FOLDERS = [
  "Pre-Admission",
  "Admission",
  "Maintaining a Safe Environment",
  "Dependency",
  "This Is My Life",
  "Medication",
  "Mobility",
  "Nutrition and Hydration",
];

// Smallest valid PDF the upload dialog accepts.
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");

async function openFolder(page: Page, residentId: string, folderKey: string): Promise<void> {
  await page.goto(`/dashboard/residents/${residentId}/care-file-v2/${folderKey}`);
  await expect(page.getByText("Select an item")).toBeVisible({ timeout: 30_000 });
}

async function openSidebarForm(page: Page, name: string): Promise<void> {
  const button = page.locator("aside button").filter({ hasText: name });
  await expect(button).toBeEnabled({ timeout: 20_000 }); // disabled while form states load
  await button.click();
  await expect(page.locator("main h2:not(.sr-only)").filter({ hasText: name })).toBeVisible();
}

test.describe("care file v2 (nurse)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "A1.nurse");
  });

  test("index shows the care file folders and opens a folder", async ({ page }) => {
    const r = await createResident("Cf");
    const errors = trackPageErrors(page);
    await openResidentPage(page, r.id, "care-file-v2");
    await expect(page.getByText("/ Care File")).toBeVisible();
    for (const folder of V2_FOLDERS) await expect(page.getByText(folder, { exact: true }).first()).toBeVisible();
    await page.getByText("Dependency", { exact: true }).first().click();
    await expect(page).toHaveURL(new RegExp(`/care-file-v2/v2-dependency$`));
    await expect(page.locator("aside").getByText("Dependency Assessment")).toBeVisible();
    await expect(page.locator("aside").getByText("No care plans yet")).toBeVisible();
    await expect(page.locator("aside").getByText("No uploads found")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("profile card navigates to the care file", async ({ page }) => {
    const r = await createResident("CfNav");
    await openResidentPage(page, r.id);
    await page.getByRole("heading", { name: "Care File", exact: true }).first().click();
    await expect(page).toHaveURL(new RegExp(`/residents/${r.id}/care-file`));
  });

  test("dependency assessment: live score, required review date, submit and history", async ({ page }) => {
    const r = await createResident("CfDep");
    const nurse = world().users["A1.nurse"];
    await openFolder(page, r.id, "v2-dependency");
    await openSidebarForm(page, "Dependency Assessment");

    await expect(page.getByText("0 pts", { exact: true })).toBeVisible();
    await page.getByLabel("Requires assistance of 2 people (3 pts)").click();
    await page.getByLabel("Needs feeding (3 pts)").click();
    await page.getByLabel("Very confused (6 pts)").click();
    await expect(page.getByText("12 pts", { exact: true })).toBeVisible();
    await expect(page.getByText("Low Dependency", { exact: true })).toBeVisible();
    await page.getByLabel("Signature").fill("NurseSig");

    // Next review date is mandatory.
    await page.getByRole("button", { name: "Submit Form" }).click();
    await expectToast(page, "Please fill in all required fields correctly.");
    expect((await db().from("dependency_assessments").select("id").eq("resident_id", r.id)).data).toEqual([]);

    await pickOption(page, page.getByRole("combobox").filter({ hasText: "N/A" }).first(), "After one month");
    await page.getByRole("button", { name: "Submit Form" }).click();
    await expectToast(page, "Dependency Assessment submitted");

    const [row] = await waitForRows<Record<string, unknown>>(() =>
      db().from("dependency_assessments").select("*").eq("resident_id", r.id)
    );
    expect(row).toMatchObject({
      total_score: 12,
      dependency_level: "Low Dependency",
      signature: "NurseSig",
      completed_by: nurse.email,
      organization_id: nurse.home.orgId,
      created_by: nurse.id,
    });
    expect((row.assessment_details as Record<string, unknown>)).toMatchObject({ mobility: 3, feeding: 3, behaviour: 6 });
    expect((row.assessment_details as Record<string, string>).nextReviewDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // The past-assessments table and sidebar status update.
    await openFolder(page, r.id, "v2-dependency");
    await openSidebarForm(page, "Dependency Assessment");
    await expect(page.locator("aside button").filter({ hasText: "Dependency Assessment" })).toContainText("Completed");
    await expect(page.getByRole("row").filter({ hasText: "12 pts" })).toContainText(world().users["A1.nurse"].email);
  });

  test("dependency level escalates with the score", async ({ page }) => {
    const r = await createResident("CfDepHi");
    await openFolder(page, r.id, "v2-dependency");
    await openSidebarForm(page, "Dependency Assessment");
    for (const label of [
      "Bedfast / chairbound (4 pts)",
      "Needs help of more than 1 person (4 pts)",
      "Choke risk (4 pts)",
      "Completely unsighted (4 pts)",
      "Completely deaf (4 pts)",
      "Very High Risk (Under 9) (4 pts)",
      "Physically aggressive (10 pts)",
    ]) {
      await page.getByLabel(label).first().click();
    }
    // 4*2 (dressing + hygiene share the label) + 4*5 + 10 = 38 at least -> Medium
    await expect(page.getByText(/Medium Dependency|High Dependency/).first()).toBeVisible();
  });

  test("adds a general care plan to a folder and shows it in the sidebar", async ({ page }) => {
    const r = await createResident("CfPlan");
    const nurse = world().users["A1.nurse"];
    await openFolder(page, r.id, "v2-safe-environment");
    await page.locator("aside").getByText("Care Plans").locator("..").getByRole("button").click();
    await page.getByRole("dialog", { name: "Select Care Plan Type" }).getByText("General Care Plan").click();

    const name = page.getByPlaceholder("e.g. Personal Care, Nutrition, etc.");
    await expect(name).toBeVisible();
    await name.fill("Falls prevention");
    await page.getByPlaceholder("What does the resident need support with?").fill("Unsteady when walking at night");
    await page.getByPlaceholder("What are we trying to achieve?").fill("No falls; uses call bell before getting up");
    await page.getByPlaceholder("Specific steps, assistance needed, or routines...").fill("Sensor mat at bedside; check every 2 hours");
    await page.getByRole("button", { name: "Submit Form" }).click();
    await expectToast(page, "Care plan assessment submitted successfully");

    const [row] = await waitForRows<Record<string, unknown>>(() =>
      db().from("care_plan_assessments").select("*").eq("resident_id", r.id)
    );
    expect(row).toMatchObject({
      care_plan_type: "Falls prevention",
      need_identified: "Unsteady when walking at night",
      status: "active",
      version_number: 1,
      created_by: nurse.id,
      organization_id: nurse.home.orgId,
    });
    expect(row.goals).toMatchObject({ aims: "No falls; uses call bell before getting up", folderKey: "v2-safe-environment" });
    expect(row.interventions).toEqual([expect.objectContaining({ details: "Sensor mat at bedside; check every 2 hours", signature: nurse.email })]);

    await expect(page.locator("aside").getByText("Falls prevention")).toBeVisible();
    await expect(page.locator("aside").getByText("No care plans yet")).toHaveCount(0);
  });

  test("care plan requires identified needs and aims", async ({ page }) => {
    const r = await createResident("CfPlanReq");
    await openFolder(page, r.id, "v2-safe-environment");
    await page.locator("aside").getByText("Care Plans").locator("..").getByRole("button").click();
    await page.getByRole("dialog", { name: "Select Care Plan Type" }).getByText("General Care Plan").click();
    await page.getByRole("button", { name: "Submit Form" }).click();
    await expect(page.getByText("Identified needs are required")).toBeVisible();
    await expect(page.getByText("Aims are required")).toBeVisible();
    await expect(page.getByText("Details are required")).toBeVisible();
    expect((await db().from("care_plan_assessments").select("id").eq("resident_id", r.id)).data).toEqual([]);
  });

  test("editing a care plan archives the old version and creates version 2", async ({ page }) => {
    const r = await createResident("CfPlanEdit");
    const nurse = world().users["A1.nurse"];
    const { data: seeded, error } = await db()
      .from("care_plan_assessments")
      .insert({
        resident_id: r.id,
        organization_id: nurse.home.orgId,
        created_by: nurse.id,
        care_plan_type: "Skin care",
        need_identified: "Dry skin on heels",
        interventions: [{ date: Date.now(), time: "", details: "Moisturise twice daily", signature: nurse.email }],
        goals: { aims: "Intact skin", folderKey: "v2-safe-environment" },
        status: "active",
        version_number: 1,
      })
      .select("id")
      .single();
    expect(error).toBeNull();

    await openFolder(page, r.id, "v2-safe-environment");
    await page.locator("aside button").filter({ hasText: "Skin care" }).click();
    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByPlaceholder("What are we trying to achieve?").fill("Intact skin, no redness");
    await page.getByRole("button", { name: "Submit Form" }).click();
    await expectToast(page, "Care plan assessment updated successfully.");

    const rows = await waitForRows<Record<string, unknown>>(
      () => db().from("care_plan_assessments").select("*").eq("resident_id", r.id).order("version_number"),
      2
    );
    expect(rows.map((x) => [x.version_number, x.status])).toEqual([
      [1, "archived"],
      [2, "active"],
    ]);
    expect(rows[1]).toMatchObject({ previous_version_id: seeded!.id, care_plan_type: "Skin care" });
    expect(rows[1].goals).toMatchObject({ aims: "Intact skin, no redness" });
  });

  test("uploads a PDF to a folder, lists it, and deletes it", async ({ page }) => {
    const r = await createResident("CfUp");
    await openFolder(page, r.id, "v2-dependency");
    await page.locator("aside").getByTitle("Upload PDF").click();
    const dialog = page.getByRole("dialog", { name: "Upload PDF" });
    await dialog.locator('input[type="file"]').setInputFiles({ name: "gp-letter.pdf", mimeType: "application/pdf", buffer: PDF });
    await expect(dialog.getByText("gp-letter.pdf", { exact: true })).toBeVisible();
    await expect(dialog.getByLabel(/File Name/)).toHaveValue("gp-letter");
    await dialog.getByLabel(/File Name/).fill("GP letter October");
    await dialog.getByRole("button", { name: "Upload PDF" }).click();
    await expectToast(page, "PDF uploaded successfully");

    const docs = page.locator("aside").getByText("GP letter October");
    await expect(docs).toBeVisible();
    const [file] = await waitForRows<{ id: string; storage_path: string; folder_name: string }>(() =>
      db().from("files").select("id, storage_path, folder_name").eq("resident_id", r.id)
    );
    expect(file.folder_name).toBe("Dependency");
    expect(file.storage_path.startsWith(`${r.id}/Dependency/`)).toBe(true);
    const stored = await db().storage.from("resident-files").download(file.storage_path);
    expect(stored.error).toBeNull();

    // Opening it shows the viewer; deleting asks for confirmation.
    await docs.click();
    await expect(page.getByText("Select an item")).toHaveCount(0);
    const item = page.locator("aside div.group").filter({ hasText: "GP letter October" });
    await item.hover();
    page.once("dialog", (d) => d.accept());
    await item.locator("button").last().click();
    await expect(docs).toHaveCount(0);
    await expect(page.locator("aside").getByText("No uploads found")).toBeVisible();
    expect((await db().from("files").select("id").eq("id", file.id)).data).toEqual([]);
    expect((await db().storage.from("resident-files").download(file.storage_path)).error).not.toBeNull();
  });

  test("dismissing the delete confirmation keeps the document", async ({ page }) => {
    const r = await createResident("CfKeep");
    await openFolder(page, r.id, "v2-dependency");
    await page.locator("aside").getByTitle("Upload PDF").click();
    const dialog = page.getByRole("dialog", { name: "Upload PDF" });
    await dialog.locator('input[type="file"]').setInputFiles({ name: "keep.pdf", mimeType: "application/pdf", buffer: PDF });
    await dialog.getByRole("button", { name: "Upload PDF" }).click();
    await expectToast(page, "PDF uploaded successfully");
    const item = page.locator("aside div.group").filter({ hasText: "keep" });
    await item.hover();
    page.once("dialog", (d) => d.dismiss());
    await item.locator("button").last().click();
    await page.waitForTimeout(1_000);
    await expect(item).toBeVisible();
    expect((await db().from("files").select("id").eq("resident_id", r.id)).data).toHaveLength(1);
  });

  test("upload rejects non-PDF files and requires a file name", async ({ page }) => {
    const r = await createResident("CfUpBad");
    await openFolder(page, r.id, "v2-dependency");
    await page.locator("aside").getByTitle("Upload PDF").click();
    const dialog = page.getByRole("dialog", { name: "Upload PDF" });
    await dialog.locator('input[type="file"]').setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
    await expectToast(page, "Only PDF files are allowed");
    await expect(dialog.getByRole("button", { name: "Upload PDF" })).toBeDisabled();

    await dialog.locator('input[type="file"]').setInputFiles({ name: "scan.pdf", mimeType: "application/pdf", buffer: PDF });
    await dialog.getByLabel(/File Name/).fill("   ");
    await expect(dialog.getByRole("button", { name: "Upload PDF" })).toBeDisabled();
    expect((await db().from("files").select("id").eq("resident_id", r.id)).data).toEqual([]);
  });

  test("BUG: nutrition folder upload presets (GP / SALT / Dietitian) are overwritten by the file's name", async ({ page }) => {
    // The preset sets the default name, but handleFileSelect replaces it with the
    // chosen file's basename, so documents are never labelled with the preset.
    const r = await createResident("CfNut");
    await openFolder(page, r.id, "v2-nutrition-hydration");
    await page.locator("aside").getByTitle("Upload PDF").click();
    for (const item of ["GP input", "SALT", "Dietitian"]) await expect(page.getByRole("menuitem", { name: item })).toBeVisible();
    await page.getByRole("menuitem", { name: "SALT" }).click();
    const dialog = page.getByRole("dialog", { name: "Upload PDF" });
    await dialog.locator('input[type="file"]').setInputFiles({ name: "x.pdf", mimeType: "application/pdf", buffer: PDF });
    await expect(dialog.getByLabel(/File Name/)).toHaveValue("SALT");
  });

  test("View All Past Records opens the folder history", async ({ page }) => {
    const r = await createResident("CfPast");
    await openFolder(page, r.id, "v2-dependency");
    await page.getByRole("button", { name: "View All Past Records" }).click();
    await expect(page).toHaveURL(new RegExp(`/care-file-v2/v2-dependency/past-records`));
  });
});

test.describe("care file permissions & isolation", () => {
  test("care assistant can browse folders but cannot open forms", async ({ page }) => {
    const r = await createResident("CfCa");
    await login(page, "A1.care_assistant");
    await openFolder(page, r.id, "v2-dependency");
    await expect(page.locator("aside button").filter({ hasText: "Dependency Assessment" })).toBeDisabled();
  });

  test("another organization cannot read a resident's care-file PDF from storage", async () => {
    const r = await createResident("CfIso");
    const path = `${r.id}/Dependency/${Date.now()}_secret.pdf`;
    expect((await db().storage.from("resident-files").upload(path, PDF, { contentType: "application/pdf" })).error).toBeNull();

    const outsider = anonClient();
    await outsider.auth.signInWithPassword({ email: world().users["B1.nurse"].email, password: PASSWORD });
    const { error } = await outsider.storage.from("resident-files").download(path);
    expect(error).not.toBeNull();

    const insider = anonClient();
    await insider.auth.signInWithPassword({ email: world().users["A1.nurse"].email, password: PASSWORD });
    expect((await insider.storage.from("resident-files").download(path)).error).toBeNull();
  });
});

test.describe("care file v1", () => {
  test("index lists folders and opens one", async ({ page }) => {
    const r = await createResident("CfV1");
    const errors = trackPageErrors(page);
    await login(page, "A1.nurse");
    await openResidentPage(page, r.id, "care-file");
    await expect(page.getByText("1. Pre-Admission")).toBeVisible();
    await page.getByText("2. Admission").click();
    await expect(page).toHaveURL(new RegExp(`/care-file/admission$`));
    expect(errors).toEqual([]);
  });

  test("BUG: v1 dependency folder name is misspelled ('Depenency')", async ({ page }) => {
    const r = await createResident("CfV1Typo");
    await login(page, "A1.nurse");
    await openResidentPage(page, r.id, "care-file");
    await expect(page.getByText(/^\d+\. Pre-Admission/)).toBeVisible();
    await expect(page.getByText("Depenency")).toHaveCount(0);
  });
});
