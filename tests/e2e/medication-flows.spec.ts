import { expect, test, type Page } from "@playwright/test";
import { formatInTimeZone } from "date-fns-tz";
import { config } from "@/config";
import { getNearestMedicationTime } from "@/lib/date-utils";
import { login, world } from "./helpers";
import { createResident, db, expectToast, openResidentPage, pickOption, trackPageErrors, waitForRows } from "./resident-helpers";

/**
 * Resident profile -> medication: full create flows (Scheduled, PRN) through the
 * dual-check step, and the Today's Medications round (prepare -> witness -> taken).
 */

test.use({ timezoneId: "Europe/London" });

const UK = "Europe/London";
const ROUND_TIMES = config.times.flatMap((t) => t.values);

interface MedicationRow {
  id: string;
  name: string;
  strength: string;
  strength_unit: string;
  schedule_type: string;
  frequency: string;
  times: string[] | null;
  created_by: string;
  checked_by: string;
  organization_id: string;
  total_count: number | null;
}

interface IntakeRow {
  id: string;
  scheduled_time: string;
  status: string;
  popped_out_at: string | null;
  popped_out_by_id: string | null;
  witness_id: string | null;
  administered_by_id: string | null;
}

async function startCreate(page: Page, residentId: string, type: "Scheduled" | "PRN") {
  await openResidentPage(page, residentId, "medication");
  await page.getByRole("button", { name: "Add Medication" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByText(type, { exact: true }).first().click();
  await expect(dialog.getByRole("heading", { name: "Create Medication" })).toBeVisible();
  return dialog;
}

async function fillBasics(page: Page, dialog: ReturnType<Page["getByRole"]>, name: string, strength: string) {
  await dialog.getByRole("textbox", { name: "Name*" }).fill(name);
  await dialog.getByPlaceholder("100").fill(strength);
  await pickOption(page, dialog.getByRole("combobox").filter({ hasText: "Select a dosage form" }), "Tablet");
  await pickOption(page, dialog.getByRole("combobox").filter({ hasText: "Select a route" }), "Oral");
}

async function pickChecker(page: Page, dialog: ReturnType<Page["getByRole"]>, email: string) {
  await pickOption(page, dialog.getByRole("combobox").filter({ hasText: "Select verifying staff..." }), email);
}

test.describe("create medication", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "A1.nurse");
  });

  test("scheduled tablet: times, dual check and today's intakes are saved", async ({ page }) => {
    const r = await createResident("MedSch");
    const w = world();
    const errors = trackPageErrors(page);
    const dialog = await startCreate(page, r.id, "Scheduled");
    await fillBasics(page, dialog, "Paracetamol", "500");
    await pickOption(page, dialog.getByRole("combobox").filter({ hasText: "Select a frequency" }), "Twice daily (BD)");
    await dialog.getByRole("button", { name: "Continue" }).click();

    await expect(dialog.getByText("Medication Times")).toBeVisible();
    await dialog.getByRole("button", { name: "08:00", exact: true }).click();
    await dialog.getByRole("button", { name: "18:00", exact: true }).click();
    // Twice daily allows two times only.
    await expect(dialog.getByRole("button", { name: "22:00", exact: true })).toBeDisabled();
    await dialog.getByRole("button", { name: "Continue" }).click();

    await dialog.getByPlaceholder("Dr. John Doe").fill("Dr Test GP");
    await pickChecker(page, dialog, w.users["A1.manager"].email);
    await dialog.getByRole("button", { name: "Create Medication" }).click();
    await expect(dialog).toBeHidden();

    const [med] = await waitForRows<MedicationRow>(() => db().from("medications").select("*").eq("resident_id", r.id));
    expect(med).toMatchObject({
      name: "Paracetamol",
      strength: "500",
      strength_unit: "mg",
      schedule_type: "Scheduled",
      frequency: "Twice daily (BD)",
      created_by: w.users["A1.nurse"].id,
      checked_by: w.users["A1.manager"].id,
      organization_id: w.homes.A1.orgId,
    });
    expect([...(med.times ?? [])].sort()).toEqual(["08:00", "18:00"]);

    // Today's two doses are scheduled at 08:00 and 18:00 UK time.
    const intakes = await waitForRows<IntakeRow>(() => db().from("medication_intakes").select("*").eq("medication_id", med.id), 2);
    const ukTimes = [...new Set(intakes.map((i) => formatInTimeZone(new Date(i.scheduled_time), UK, "HH:mm")))].sort();
    expect(ukTimes).toEqual(["08:00", "18:00"]);
    expect(errors).toEqual([]);
  });

  test("opening the page twice does not duplicate today's doses", async ({ page }) => {
    const r = await createResident("MedDup");
    const w = world();
    const { data: med } = await db()
      .from("medications")
      .insert({
        resident_id: r.id,
        organization_id: w.homes.A1.orgId,
        team_id: w.homes.A1.teamId,
        created_by: w.users["A1.nurse"].id,
        checked_by: w.users["A1.manager"].id,
        name: "Amlodipine",
        strength: "5",
        strength_unit: "mg",
        dosage_form: "Tablet",
        route: "Oral",
        frequency: "Once daily (OD)",
        schedule_type: "Scheduled",
        times: ["08:00"],
        time_quantities: { "08:00": 1 },
        start_date: new Date(Date.now() - 86_400_000).toISOString(),
        status: "active",
      })
      .select("id")
      .single();
    await openResidentPage(page, r.id, "medication");
    await waitForRows(() => db().from("medication_intakes").select("id").eq("medication_id", med!.id));
    await openResidentPage(page, r.id, "medication");
    await page.waitForLoadState("networkidle");
    const { data } = await db().from("medication_intakes").select("id").eq("medication_id", med!.id);
    expect(data).toHaveLength(1);
  });

  test("PRN: no times step and no scheduled doses", async ({ page }) => {
    const r = await createResident("MedPrn");
    const w = world();
    const dialog = await startCreate(page, r.id, "PRN");
    await fillBasics(page, dialog, "Lorazepam", "1");
    await pickOption(page, dialog.getByRole("combobox").filter({ hasText: "Select dosage unit" }), "Tablets/Capsules");
    await dialog.getByRole("button", { name: "Continue" }).click();
    // PRN skips straight to the prescriber / dual-check step.
    await expect(dialog.getByText("Medication Times")).toHaveCount(0);
    await pickChecker(page, dialog, w.users["A1.manager"].email);
    await dialog.getByRole("button", { name: "Create Medication" }).click();
    await expect(dialog).toBeHidden();

    const [med] = await waitForRows<MedicationRow>(() => db().from("medications").select("*").eq("resident_id", r.id));
    expect(med).toMatchObject({ schedule_type: "PRN (As Needed)", frequency: "Tablets/Capsules" });
    const { data: intakes } = await db().from("medication_intakes").select("id").eq("medication_id", med.id);
    expect(intakes).toEqual([]);
  });

  test("the dual-check list does not offer the signed-in nurse", async ({ page }) => {
    const r = await createResident("MedChk");
    const w = world();
    const dialog = await startCreate(page, r.id, "PRN");
    await fillBasics(page, dialog, "Ibuprofen", "200");
    await pickOption(page, dialog.getByRole("combobox").filter({ hasText: "Select dosage unit" }), "Tablets/Capsules");
    await dialog.getByRole("button", { name: "Continue" }).click();
    // Submitting without a checker is refused and nothing is saved.
    await dialog.getByRole("button", { name: "Create Medication" }).click();
    await expect(dialog.getByText("Select a staff member for Checked by")).toBeVisible();
    expect((await db().from("medications").select("id").eq("resident_id", r.id)).data).toEqual([]);
    await dialog.getByRole("combobox").filter({ hasText: "Select verifying staff..." }).click();
    await expect(page.getByRole("option", { name: w.users["A1.manager"].email })).toBeVisible();
    await expect(page.getByRole("option", { name: w.users["A1.nurse"].email })).toHaveCount(0);
  });
});

test.describe("medication round", () => {
  /** Seeds an active scheduled tablet due at the round the page opens on, with stock. */
  async function seedDueMedication(label: string) {
    const r = await createResident(label);
    const w = world();
    const round = getNearestMedicationTime(ROUND_TIMES)!;
    const { data: med, error } = await db()
      .from("medications")
      .insert({
        resident_id: r.id,
        organization_id: w.homes.A1.orgId,
        team_id: w.homes.A1.teamId,
        created_by: w.users["A1.manager"].id,
        checked_by: w.users["A1.owner"].id,
        name: `Metformin${label}`,
        strength: "500",
        strength_unit: "mg",
        dosage_form: "Tablet",
        route: "Oral",
        frequency: "Once daily (OD)",
        schedule_type: "Scheduled",
        times: [round],
        time_quantities: { [round]: 1 },
        total_count: 28,
        start_date: new Date(Date.now() - 86_400_000).toISOString(),
        status: "active",
      })
      .select("id, name")
      .single();
    if (error || !med) throw new Error(error?.message);
    return { r, med: med as { id: string; name: string }, round };
  }

  async function openRound(page: Page, residentId: string, medName: string) {
    await openResidentPage(page, residentId, "medication");
    const row = page.getByRole("row").filter({ hasText: medName });
    await expect(row).toBeVisible();
    return row;
  }

  test.beforeEach(async ({ page }) => {
    await login(page, "A1.nurse");
  });

  test("prepare -> witness -> taken records the administration and reduces stock", async ({ page }) => {
    const { r, med } = await seedDueMedication("Rnd");
    const w = world();
    const row = await openRound(page, r.id, med.name);

    // Marking taken before preparing is refused.
    await pickOption(page, row.getByRole("combobox").last(), "T Taken");
    await expectToast(page, "Please prepare the medication first");

    await row.getByRole("button").first().click();
    await expectToast(page, "Medication prepared successfully");
    await pickOption(page, row.getByRole("combobox").filter({ hasText: "Select witness" }), w.users["A1.manager"].email);
    await expectToast(page, "Witness set successfully");
    await pickOption(page, row.getByRole("combobox").last(), "T Taken");
    await expectToast(page, "Status updated successfully");

    const [intake] = await waitForRows<IntakeRow>(() =>
      db().from("medication_intakes").select("*").eq("medication_id", med.id).eq("status", "taken")
    );
    expect(intake).toMatchObject({
      popped_out_by_id: w.users["A1.nurse"].id,
      witness_id: w.users["A1.manager"].id,
      administered_by_id: w.users["A1.nurse"].id,
    });
    const { data: after } = await db().from("medications").select("total_count").eq("id", med.id).single();
    expect(after?.total_count).toBe(27);
  });

  test("BUG: neither the administering nurse nor the owner can be picked as witness", async ({ page }) => {
    const { r, med } = await seedDueMedication("RndW");
    const w = world();
    const row = await openRound(page, r.id, med.name);
    await row.getByRole("combobox").filter({ hasText: "Select witness" }).click();
    await expect(page.getByRole("option", { name: w.users["A1.manager"].email })).toBeVisible();
    await expect(page.getByRole("option", { name: w.users["A1.nurse"].email })).toHaveCount(0);
    // The owner is never offered as a witness either.
    await expect(page.getByRole("option", { name: w.users["A1.owner"].email })).toHaveCount(0);
  });

  test("BUG: the prepared time is shown in UK time, not UTC", async ({ page }) => {
    const { r, med } = await seedDueMedication("RndT");
    const row = await openRound(page, r.id, med.name);
    await row.getByRole("button").first().click();
    await expectToast(page, "Medication prepared successfully");
    const [intake] = await waitForRows<IntakeRow>(() =>
      db().from("medication_intakes").select("*").eq("medication_id", med.id).not("popped_out_at", "is", null)
    );
    const ukTime = formatInTimeZone(new Date(intake.popped_out_at!), UK, "HH:mm");
    await expect(row.getByText(ukTime, { exact: true })).toBeVisible();
  });

  test("refusal is recorded without preparation and locks the dose", async ({ page }) => {
    const { r, med } = await seedDueMedication("RndR");
    const row = await openRound(page, r.id, med.name);
    await pickOption(page, row.getByRole("combobox").last(), "R Refused");
    await expectToast(page, "Status updated successfully");
    await waitForRows(() => db().from("medication_intakes").select("id").eq("medication_id", med.id).eq("status", "refused"));
    await expect(row.getByRole("combobox").last()).toBeDisabled();
    // Refused doses do not come out of stock.
    const { data: after } = await db().from("medications").select("total_count").eq("id", med.id).single();
    expect(after?.total_count).toBe(28);
  });
});
