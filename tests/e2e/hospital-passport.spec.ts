import { expect, test, type Page } from "@playwright/test";
import { formatInTimeZone } from "date-fns-tz";
import { login, world } from "./helpers";
import { createResident, db, expectToast, openResidentPage, waitForRows } from "./resident-helpers";

/**
 * Resident profile -> hospital transfer: the hospital passport (SBAR) create flow.
 * The passport travels with the resident to hospital, so the fields the form marks
 * with * must be filled in before it can be generated.
 */

test.use({ timezoneId: "Europe/London" });

interface PassportRow {
  id: string;
  organization_id: string;
  created_by: string;
  general_details: Record<string, string>;
  medical_care_needs: Record<string, string | boolean>;
  skin_medication_attachments: Record<string, unknown>;
  sign_off: Record<string, string>;
}

const REQUIRED_TEXT: Record<string, string> = {
  "Care Home Phone*": "028 9000 0000",
  "Care Home Address*": "1 Care Street, Belfast",
  "Hospital/Facility Name*": "Royal Victoria Hospital",
  "Hospital/Facility Address*": "274 Grosvenor Rd, Belfast",
  "Name*": "Jane Relative",
  "Phone*": "07700 900000",
  "Address*": "2 Family Road, Belfast",
  "GP Name*": "Dr Test GP",
  "GP Phone*": "028 9000 1111",
  "GP Address*": "Health Centre, Belfast",
  "Background*": "Type 2 diabetes, previous stroke.",
  "Assessment*": "Reduced consciousness, BM 2.1.",
  "Recommendations*": "Review hypoglycaemia management.",
  "Past Medical History*": "T2DM, CVA 2019, hypertension.",
  "Skin State on Transfer*": "Intact, grade 1 redness sacrum.",
  "Current Medication Regime*": "See attached MAR.",
  "Contact Telephone No*": "028 9000 2222",
};

async function openNewPassport(page: Page, residentId: string) {
  await openResidentPage(page, residentId, "hospital-transfer");
  await page.getByRole("button", { name: /Create Passport/ }).click();
  await expect(page.getByRole("heading", { name: "New Hospital Passport (SBAR)" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Name of Person *" })).not.toHaveValue("");
}

test.beforeEach(async ({ page }) => {
  await login(page, "A1.nurse");
});

test("BUG: a passport with the required (*) fields left blank cannot be generated", async ({ page }) => {
  const r = await createResident("PassBlank");
  await openNewPassport(page, r.id);
  await page.getByRole("button", { name: "Generate Passport" }).click();
  await expectToast(page, "Please complete the required fields marked *");
  await page.waitForTimeout(1_000);
  expect((await db().from("hospital_passports").select("id").eq("resident_id", r.id)).data).toEqual([]);
});

test("nurse generates a complete passport; details and SBAR are saved", async ({ page }) => {
  const r = await createResident("PassNew");
  const w = world();
  await openNewPassport(page, r.id);
  for (const [label, value] of Object.entries(REQUIRED_TEXT)) {
    await page.getByRole("textbox", { name: label, exact: true }).fill(value);
  }
  await page.getByRole("checkbox", { name: "Glasses" }).check();
  await page.getByRole("checkbox", { name: "DNACPR Form" }).check();
  await page.getByRole("button", { name: "Generate Passport" }).click();
  await expectToast(page, "Passport created successfully");

  const [p] = await waitForRows<PassportRow>(() => db().from("hospital_passports").select("*").eq("resident_id", r.id));
  expect(p.organization_id).toBe(w.homes.A1.orgId);
  expect(p.created_by).toBe(w.users["A1.nurse"].id);
  expect(p.general_details).toMatchObject({
    personName: r.fullName,
    nhsNumber: "9434765919",
    dateOfBirth: "1938-05-17",
    hospitalName: "Royal Victoria Hospital",
    nextOfKinName: "Jane Relative",
    gpName: "Dr Test GP",
  });
  expect(p.medical_care_needs).toMatchObject({ background: "Type 2 diabetes, previous stroke.", glasses: true });
  expect(p.skin_medication_attachments).toMatchObject({
    currentMedicationRegime: "See attached MAR.",
    attachments: expect.objectContaining({ dnacprForm: true }),
  });
  expect(p.sign_off.contactPhone).toBe("028 9000 2222");

  // The resident's transfer page now lists the passport instead of "Record missing".
  await openResidentPage(page, r.id, "hospital-transfer");
  await expect(page.getByText("Record missing")).toHaveCount(0);
});

test("BUG: the default transfer and last-medication times are UK time, not UTC", async ({ page }) => {
  const r = await createResident("PassTime");
  await openNewPassport(page, r.id);
  for (const [label, value] of Object.entries(REQUIRED_TEXT)) {
    await page.getByRole("textbox", { name: label, exact: true }).fill(value);
  }
  await page.getByRole("button", { name: "Generate Passport" }).click();
  await expectToast(page, "Passport created successfully");
  const [p] = await waitForRows<PassportRow>(() => db().from("hospital_passports").select("*").eq("resident_id", r.id));

  // Stored as UK wall-clock "yyyy-MM-ddTHH:mm"; allow for the minute ticking over.
  const ukNowMs = Date.parse(`${formatInTimeZone(new Date(), "Europe/London", "yyyy-MM-dd'T'HH:mm")}:00Z`);
  for (const value of [p.general_details.transferDateTime, p.skin_medication_attachments.lastMedicationDateTime as string]) {
    const diffMinutes = Math.abs(ukNowMs - Date.parse(`${value}:00Z`)) / 60_000;
    expect(diffMinutes, `${value} vs UK now`).toBeLessThanOrEqual(5);
  }
});
