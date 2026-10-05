import { expect, test, type Page } from "@playwright/test";
import { anonClient, PASSWORD } from "../db/fixtures";
import { login, world } from "./helpers";
import { createResident, db, expectToast, openResidentPage, pickOption, waitForRows } from "./resident-helpers";

/**
 * Resident profile -> clinical records: progress notes, vital signs,
 * weight monitoring and continence (bowel / urine).
 */

async function rowsFor<T>(table: string, residentId: string): Promise<T[]> {
  const { data, error } = await db().from(table).select("*").eq("resident_id", residentId);
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data ?? []) as T[];
}

test.describe("progress notes", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "A1.nurse");
  });

  async function openAddNote(page: Page, residentId: string) {
    await openResidentPage(page, residentId, "progress-notes");
    await page.getByRole("button", { name: "Add Note" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    return dialog;
  }

  test("adds a medical note that appears in the list with the author", async ({ page }) => {
    const r = await createResident("Pn");
    const nurse = world().users["A1.nurse"];
    const dialog = await openAddNote(page, r.id);
    await pickOption(page, dialog.getByRole("combobox").first(), "Medical");
    await dialog.getByPlaceholder("Enter detailed progress note...").fill("GP reviewed chest; antibiotics started, obs 4-hourly.");
    await dialog.getByRole("button", { name: /Add Note|Save|Create/ }).last().click();
    await expectToast(page, "Progress note added successfully");

    await expect(page.getByText("Medical Note").first()).toBeVisible();
    await expect(page.getByText(nurse.email).first()).toBeVisible();
    const [row] = await waitForRows<Record<string, unknown>>(() => db().from("progress_notes").select("*").eq("resident_id", r.id));
    expect(row).toMatchObject({ type: "medical", author_id: nurse.id, organization_id: nurse.home.orgId });
    expect(row.note).toContain("antibiotics started");
  });

  test("note shorter than 10 characters is rejected", async ({ page }) => {
    const r = await createResident("PnShort");
    const dialog = await openAddNote(page, r.id);
    await dialog.getByPlaceholder("Enter detailed progress note...").fill("ok");
    await dialog.getByRole("button", { name: /Add Note|Save|Create/ }).last().click();
    await expect(dialog.getByText("Note must be at least 10 characters")).toBeVisible();
    expect(await rowsFor("progress_notes", r.id)).toHaveLength(0);
  });

  async function seedNote(residentId: string): Promise<void> {
    const nurse = world().users["A1.nurse"];
    const { error } = await db().from("progress_notes").insert({
      resident_id: residentId,
      organization_id: nurse.home.orgId,
      type: "daily",
      date: new Date().toISOString().slice(0, 10),
      time: "09:00",
      note: "Settled night, ate breakfast well.",
      author_id: nurse.id,
      author_name: nurse.email,
    });
    if (error) throw new Error(error.message);
  }

  async function openNoteMenu(page: Page, residentId: string): Promise<void> {
    await openResidentPage(page, residentId, "progress-notes");
    await expect(page.getByText("Daily Note").first()).toBeVisible();
    await page.locator('button:has(svg[class*="vertical"])').first().click();
  }

  test("BUG: editing a progress note fails (PATCH /api/progress-notes/:id returns 500)", async ({ page }) => {
    // The route returns NextResponse.json(..., { headers: response.headers }) where
    // `response` is NextResponse.next(); Next.js rejects that in route handlers.
    const r = await createResident("PnEdit");
    await seedNote(r.id);
    await openNoteMenu(page, r.id);
    await page.getByRole("button", { name: "Edit Note" }).click();
    const dialog = page.getByRole("dialog", { name: "Edit Progress Note" });
    await dialog.getByRole("textbox", { name: "Progress Note" }).fill("Settled night, ate breakfast well. Family visited.");
    const patch = page.waitForResponse((res) => res.url().includes("/api/progress-notes/") && res.request().method() === "PATCH");
    await dialog.getByRole("button", { name: "Update Note" }).click();
    expect((await patch).status()).toBe(200);
    await expectToast(page, "Progress note updated successfully");
    await expect.poll(async () => (await rowsFor<{ note: string }>("progress_notes", r.id))[0]?.note).toContain("Family visited");
  });

  test("BUG: deleting a progress note fails (DELETE /api/progress-notes/:id returns 500)", async ({ page }) => {
    const r = await createResident("PnDel");
    await seedNote(r.id);
    await openNoteMenu(page, r.id);
    await page.getByRole("button", { name: "Delete Note" }).click();
    const del = page.waitForResponse((res) => res.url().includes("/api/progress-notes/") && res.request().method() === "DELETE");
    await page.getByRole("dialog").getByRole("button", { name: /delete/i }).last().click();
    expect((await del).status()).toBe(200);
    await expectToast(page, "Progress note deleted successfully");
    await expect.poll(async () => (await rowsFor("progress_notes", r.id)).length).toBe(0);
  });

  test("View Details shows the full note", async ({ page }) => {
    const r = await createResident("PnView");
    await seedNote(r.id);
    await openNoteMenu(page, r.id);
    await page.getByRole("button", { name: "View Details" }).click();
    await expect(page.getByRole("dialog")).toContainText("Settled night, ate breakfast well.");
  });

  test("BUG: a progress note cannot be posted under another staff member's name", async ({ page }) => {
    // /api/progress-notes stores authorId/authorName from the request body without
    // checking them against the session, so clinical notes can be misattributed.
    const r = await createResident("PnForge");
    const manager = world().users["A1.manager"];
    const nurse = world().users["A1.nurse"];
    await openResidentPage(page, r.id, "progress-notes");
    const res = await page.request.post("/api/progress-notes", {
      data: {
        residentId: r.id,
        type: "medical",
        date: new Date().toISOString().slice(0, 10),
        time: "10:00",
        note: "Written by the nurse but signed as the manager.",
        authorId: manager.id,
        authorName: "Home Manager",
      },
    });
    const rows = await rowsFor<{ author_id: string }>("progress_notes", r.id);
    if (res.ok()) expect(rows.map((x) => x.author_id)).toEqual([nurse.id]);
    else expect(rows).toHaveLength(0);
  });
});

test.describe("progress notes (database guard)", () => {
  test("a direct insert by a nurse is re-attributed to the nurse, and edits keep the author", async () => {
    const r = await createResident("PnDb");
    const nurse = world().users["A1.nurse"];
    const manager = world().users["A1.manager"];
    const client = anonClient();
    await client.auth.signInWithPassword({ email: nurse.email, password: PASSWORD });
    const { data, error } = await client
      .from("progress_notes")
      .insert({
        resident_id: r.id,
        organization_id: nurse.home.orgId,
        type: "daily",
        date: "2026-01-01",
        time: "08:00",
        note: "Direct insert claiming to be the manager.",
        author_id: manager.id,
        author_name: "Home Manager",
      })
      .select("id, author_id, author_name")
      .single();
    expect(error).toBeNull();
    expect(data).toMatchObject({ author_id: nurse.id, author_name: nurse.email });

    await client.from("progress_notes").update({ author_id: manager.id, note: "Edited note text here." }).eq("id", data!.id);
    const after = await db().from("progress_notes").select("author_id, note").eq("id", data!.id).single();
    expect(after.data).toEqual({ author_id: nurse.id, note: "Edited note text here." });
  });
});

test.describe("progress notes (care assistant)", () => {
  test("care assistant cannot add progress notes", async ({ page }) => {
    const r = await createResident("PnCa");
    await login(page, "A1.care_assistant");
    await openResidentPage(page, r.id, "progress-notes");
    const res = await page.request.post("/api/progress-notes", {
      data: { residentId: r.id, type: "daily", date: "2026-01-01", time: "10:00", note: "care assistant note attempt", authorId: "x", authorName: "x" },
    });
    expect(res.ok()).toBe(false);
    expect(await rowsFor("progress_notes", r.id)).toHaveLength(0);
  });
});

test.describe("vital signs", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "A1.nurse");
  });

  async function openVitalDialog(page: Page, residentId: string) {
    await openResidentPage(page, residentId, "health-monitoring");
    await page.getByRole("button", { name: "Record Vital" }).click();
    const dialog = page.getByRole("dialog", { name: /Record Vital for/ });
    await expect(dialog).toBeVisible();
    return dialog;
  }

  test("records temperature and blood pressure; latest values are summarised", async ({ page }) => {
    const r = await createResident("Vit");
    const nurse = world().users["A1.nurse"];
    let dialog = await openVitalDialog(page, r.id);
    await dialog.getByPlaceholder("36.5").fill("37.8");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expectToast(page, "Temperature recorded successfully");

    if (!(await dialog.isVisible())) dialog = await openVitalDialog(page, r.id);
    await pickOption(page, dialog.getByRole("combobox").filter({ hasText: "Temperature" }), "Blood Pressure");
    await dialog.getByPlaceholder("120").fill("142");
    await dialog.getByPlaceholder("80").fill("88");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expectToast(page, "Blood Pressure recorded successfully");
    if (await dialog.isVisible()) await dialog.getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByText("37.8").first()).toBeVisible();
    await expect(page.getByText(/142\s*\/\s*88/).first()).toBeVisible();

    const rows = await waitForRows<{ vital_type: string; value: string; value2: string | null; recorded_by: string }>(
      () => db().from("vitals").select("*").eq("resident_id", r.id),
      2
    );
    expect(rows.map((v) => [v.vital_type, v.value, v.value2 || null]).sort()).toEqual([
      ["bloodPressure", "142", "88"],
      ["temperature", "37.8", null],
    ]);
    expect(new Set(rows.map((v) => v.recorded_by))).toEqual(new Set([nurse.id]));
  });

  test("value is required", async ({ page }) => {
    const r = await createResident("VitReq");
    const dialog = await openVitalDialog(page, r.id);
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog.getByText("Value is required")).toBeVisible();
    expect(await rowsFor("vitals", r.id)).toHaveLength(0);
  });

  test("BUG: non-numeric or impossible vital values are accepted", async ({ page }) => {
    // The schema only checks the value is non-empty, so "abc" or 95 °C are stored.
    const r = await createResident("VitBad");
    const dialog = await openVitalDialog(page, r.id);
    await dialog.getByPlaceholder("36.5").fill("abc");
    await dialog.getByRole("button", { name: "Save" }).click();
    await page.waitForTimeout(1_500);
    expect(await rowsFor("vitals", r.id)).toHaveLength(0);
  });

  test("BUG: blood pressure can be saved without a diastolic value", async ({ page }) => {
    const r = await createResident("VitBp");
    const dialog = await openVitalDialog(page, r.id);
    await pickOption(page, dialog.getByRole("combobox").filter({ hasText: "Temperature" }), "Blood Pressure");
    await dialog.getByPlaceholder("120").fill("130");
    await dialog.getByRole("button", { name: "Save" }).click();
    await page.waitForTimeout(1_500);
    expect(await rowsFor("vitals", r.id)).toHaveLength(0);
  });
});

test.describe("weight monitoring", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "A1.nurse");
  });

  async function recordWeight(page: Page, value: string, unit: "kg" | "lb" = "kg") {
    await page.getByRole("button", { name: /^Record( Weight)?$/ }).first().click();
    const dialog = page.getByRole("dialog", { name: "Record Weight" });
    await dialog.getByPlaceholder("0.00").fill(value);
    if (unit === "lb") await pickOption(page, dialog.getByRole("combobox").filter({ hasText: "kg" }), "lb");
    await dialog.getByRole("button", { name: /Save|Record/ }).last().click();
    return dialog;
  }

  test("records a weight in kg and in lb (converted)", async ({ page }) => {
    const r = await createResident("Wt");
    await openResidentPage(page, r.id, "weight-monitoring");
    await expect(page.getByText("Weight Tracking")).toBeVisible();
    await recordWeight(page, "64.5");
    await expectToast(page, "Weight recorded successfully");
    await recordWeight(page, "143", "lb");
    await expectToast(page, "Weight recorded successfully");

    const rows = await waitForRows<{ weight_kg: number; weight_lb: number; unit: string; measured_by_id: string }>(
      () => db().from("weight_records").select("*").eq("resident_id", r.id).order("created_at"),
      2
    );
    expect(rows[0]).toMatchObject({ unit: "kg", measured_by_id: world().users["A1.nurse"].id });
    expect(Number(rows[0].weight_kg)).toBeCloseTo(64.5, 2);
    expect(Number(rows[0].weight_lb)).toBeCloseTo(142.2, 1);
    expect(rows[1].unit).toBe("lb");
    expect(Number(rows[1].weight_kg)).toBeCloseTo(64.86, 1);
  });

  test("BUG: negative or implausible weights are accepted", async ({ page }) => {
    const r = await createResident("WtBad");
    await openResidentPage(page, r.id, "weight-monitoring");
    await recordWeight(page, "-5");
    await page.waitForTimeout(1_500);
    await page.keyboard.press("Escape");
    await recordWeight(page, "900");
    await page.waitForTimeout(1_500);
    expect(await rowsFor("weight_records", r.id)).toHaveLength(0);
  });

  test("weight check frequency can be changed", async ({ page }) => {
    const r = await createResident("WtFreq");
    await openResidentPage(page, r.id, "weight-monitoring");
    await page.getByRole("button", { name: "Monthly" }).click();
    await expectToast(page, /Weight check frequency updated to/i);
    await expect
      .poll(async () => (await db().from("residents").select("weight_check_frequency").eq("id", r.id).single()).data?.weight_check_frequency)
      .toMatch(/monthly/i);
  });
});

test.describe("continence", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "A1.nurse");
  });

  test("records a bowel movement with Bristol type and size", async ({ page }) => {
    const r = await createResident("Con");
    await openResidentPage(page, r.id, "continence");
    await expect(page.getByText("No bowel entries", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Bowel" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Record Bowel Movement" });

    // Record Entry stays disabled until both stool type and size are chosen.
    const submit = dialog.getByRole("button", { name: "Record Entry" });
    await expect(submit).toBeDisabled();
    await dialog.getByText("Type 4", { exact: true }).click();
    await expect(submit).toBeDisabled();
    await dialog.getByText("M", { exact: true }).click();
    await expect(submit).toBeEnabled();
    await dialog.getByPlaceholder("Enter any additional observations...").fill("No straining");
    await dialog.getByRole("button", { name: "Record Entry" }).click();
    await expectToast(page, "Bowel entry recorded successfully");

    await expect(page.getByText("Type 4 - Like a smooth, soft sausage or snake")).toBeVisible();
    await expect(page.getByText("Size: M")).toBeVisible();
    const [row] = await waitForRows<Record<string, unknown>>(() => db().from("continence_entries").select("*").eq("resident_id", r.id));
    expect(row).toMatchObject({ stool_type: "type_4", bowel_size: "m", notes: "No straining" });
  });

  test("records a urine output entry", async ({ page }) => {
    const r = await createResident("ConU");
    await openResidentPage(page, r.id, "continence");
    await page.getByRole("button", { name: "Urine" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Record Urine Output" });
    await expect(dialog.getByText("Step 1 of 5")).toBeVisible();
    await dialog.getByRole("button", { name: "Normal" }).click();
    await dialog.getByRole("button", { name: "Next" }).click();
    await dialog.getByRole("button", { name: "Measured (ml)" }).click();
    await dialog.getByPlaceholder("Enter volume in ml").fill("300");
    await dialog.getByRole("button", { name: "Next" }).click();
    await dialog.getByRole("button", { name: "Clear / Pale Yellow" }).click();
    await dialog.getByRole("button", { name: "Next" }).click();
    await dialog.getByRole("button", { name: "Toilet" }).click();
    await dialog.getByRole("button", { name: "Next" }).click();
    await expect(dialog.getByText("Step 5 of 5")).toBeVisible();
    await dialog.getByRole("button", { name: "Record Entry" }).click();
    await expectToast(page, "Urine entry recorded successfully");
    await page.getByRole("tab", { name: "Urine" }).click();
    await expect(page.getByText("No urine entries", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("tabpanel")).toContainText("300");
    const [row] = await waitForRows<Record<string, unknown>>(() => db().from("continence_entries").select("*").eq("resident_id", r.id));
    expect(JSON.stringify(row)).toContain("300");
  });
});
