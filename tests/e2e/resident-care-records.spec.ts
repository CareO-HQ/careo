import { format } from "date-fns";
import { expect, test, type Page } from "@playwright/test";
import { login, world } from "./helpers";
import { createResident, db, expectToast, openResidentPage, pickOption, waitForRows } from "./resident-helpers";

/**
 * Resident profile -> day-to-day care records: daily care, lifestyle & social,
 * documents, appointments, multidisciplinary notes and checks.
 * Runs on a UK clock by default; timezone bugs are exercised explicitly.
 */

test.use({ timezoneId: "Europe/London" });

function ukNowMinutes(): number {
  const [h, m] = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/London" })
    .format(new Date())
    .split(":")
    .map(Number);
  return h * 60 + m;
}

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

async function rowsFor<T>(table: string, column: string, value: string): Promise<T[]> {
  const { data, error } = await db().from(table).select("*").eq(column, value);
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data ?? []) as T[];
}

test.describe("daily care", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "A1.nurse");
  });

  test("logs personal care activities for today", async ({ page }) => {
    const r = await createResident("Dc");
    await openResidentPage(page, r.id, "daily-care");
    await page.getByRole("button", { name: "Log Personal Care" }).click();
    const dialog = page.getByRole("dialog", { name: /Personal Care Activities for/ });

    // At least one activity is required.
    await dialog.getByRole("button", { name: "Save Personal Care Activities" }).click();
    await expect(dialog.getByText("You have to select at least one activity.")).toBeVisible();

    await dialog.getByText("Bed Bath", { exact: true }).click();
    await dialog.getByText("Shower + shampoo", { exact: true }).click();
    await dialog.getByPlaceholder("Enter notes...").fill("Skin intact, no redness");
    await dialog.getByRole("button", { name: "Save Personal Care Activities" }).click();
    // The page reloads after saving; the entries appear in today's log history.
    await expect(page.getByText(/Bed Bath - Skin intact, no redness/)).toBeVisible();
    await expect(page.getByText(/Shower \+ shampoo - Skin intact, no redness/)).toBeVisible();

    const events = await waitForRows<{ task_type: string; status: string; performed_by: string }>(
      () => db().from("personal_care_task_events").select("*").eq("resident_id", r.id),
      2
    );
    expect(events.map((e) => e.task_type).sort()).toEqual(["bed_bath", "shower_shampoo"]);
    expect(new Set(events.map((e) => e.performed_by))).toEqual(new Set([world().users["A1.nurse"].id]));
    const daily = await rowsFor<{ date: string }>("personal_care_daily", "resident_id", r.id);
    expect(daily).toHaveLength(1);
  });

  test("a second log on the same day reuses today's daily record", async ({ page }) => {
    const r = await createResident("DcTwice");
    await openResidentPage(page, r.id, "daily-care");
    for (const activity of ["Bed Bath", "Wash Upper body"]) {
      await page.getByRole("button", { name: "Log Personal Care" }).click();
      const dialog = page.getByRole("dialog", { name: /Personal Care Activities for/ });
      await dialog.getByText(activity, { exact: true }).click();
      await dialog.getByRole("button", { name: "Save Personal Care Activities" }).click();
      await expect(page.getByText(activity, { exact: false }).first()).toBeVisible();
    }
    await expect.poll(async () => (await rowsFor("personal_care_task_events", "resident_id", r.id)).length).toBe(2);
    expect(await rowsFor("personal_care_daily", "resident_id", r.id)).toHaveLength(1);
  });

  test("records a daily activity note", async ({ page }) => {
    const r = await createResident("DcAct");
    await openResidentPage(page, r.id, "daily-care");
    await page.getByRole("button", { name: "Log Daily Activity" }).click();
    const dialog = page.getByRole("dialog", { name: /Daily Activity Record for/ });
    await dialog.getByPlaceholder("Enter activity details...").fill("Walked to the garden with frame");
    await dialog.getByRole("button", { name: /Save/ }).last().click();
    const [event] = await waitForRows<{ task_type: string; notes: string }>(() =>
      db().from("personal_care_task_events").select("*").eq("resident_id", r.id)
    );
    expect(event).toMatchObject({ task_type: "daily_activity_record", notes: "Walked to the garden with frame" });
  });

  test("care assistant can log personal care", async ({ page }) => {
    const r = await createResident("DcCa");
    await page.context().clearCookies();
    await login(page, "A1.care_assistant");
    await openResidentPage(page, r.id, "daily-care");
    await page.getByRole("button", { name: "Log Personal Care" }).click();
    const dialog = page.getByRole("dialog", { name: /Personal Care Activities for/ });
    await dialog.getByText("Bed Bath", { exact: true }).click();
    await dialog.getByRole("button", { name: "Save Personal Care Activities" }).click();
    await expect(page.getByText(/Bed Bath/).first()).toBeVisible();
    const [event] = await waitForRows<{ performed_by: string }>(() => db().from("personal_care_task_events").select("*").eq("resident_id", r.id));
    expect(event.performed_by).toBe(world().users["A1.care_assistant"].id);
  });
});

test.describe("daily care (device clock ahead of UK)", () => {
  test.use({ timezoneId: "Asia/Kolkata" });

  test("BUG: personal care is time-stamped with the device clock instead of UK time", async ({ page }) => {
    // The form defaults `time` to new Date().toTimeString() (device-local), so a care
    // record made "now" on a non-UK device is logged hours away from UK time.
    const r = await createResident("DcTz");
    await login(page, "A1.nurse");
    await openResidentPage(page, r.id, "daily-care");
    await page.getByRole("button", { name: "Log Personal Care" }).click();
    const dialog = page.getByRole("dialog", { name: /Personal Care Activities for/ });
    await dialog.getByText("Bed Bath", { exact: true }).click();
    await dialog.getByRole("button", { name: "Save Personal Care Activities" }).click();
    const [event] = await waitForRows<{ payload: { time: string } }>(() => db().from("personal_care_task_events").select("*").eq("resident_id", r.id));
    expect(Math.abs(minutesOf(event.payload.time) - ukNowMinutes())).toBeLessThanOrEqual(5);
  });
});

test.describe("lifestyle & social", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "A1.nurse");
  });

  async function openActivityWizard(page: Page, residentId: string) {
    await openResidentPage(page, residentId, "lifestyle-social");
    await page.getByRole("button", { name: "Record Activity" }).click();
    const dialog = page.getByRole("dialog", { name: /Record Social Activity for/ });
    await expect(dialog.getByText(/Step 1 of 3/)).toBeVisible();
    return dialog;
  }

  test("records a social activity through the 3-step wizard", async ({ page }) => {
    const r = await createResident("Soc");
    const dialog = await openActivityWizard(page, r.id);
    await pickOption(page, dialog.getByRole("combobox").filter({ hasText: "Group Activity" }), "Music");
    await dialog.getByPlaceholder("e.g., Music Therapy Session").fill("Sing-along with guitar");
    await dialog.getByPlaceholder("e.g., Activity Room").fill("Lounge");
    await dialog.getByRole("button", { name: "Next" }).click();
    await expect(dialog.getByText(/Step 2 of 3/)).toBeVisible();
    await dialog.getByRole("button", { name: "Next" }).click();
    await expect(dialog.getByText(/Step 3 of 3/)).toBeVisible();
    await dialog.getByRole("button", { name: "Record Activity" }).click();
    await expectToast(page, "Social activity recorded successfully");
    await expect(page.getByText("Sing-along with guitar").first()).toBeVisible();
  });

  test("BUG: a missing activity name is only rejected on the last step, with no visible error", async ({ page }) => {
    // Fixed: "Next" now validates step 1 while its fields and errors are on screen.
    const r = await createResident("SocReq");
    const dialog = await openActivityWizard(page, r.id);
    await dialog.getByRole("button", { name: "Next" }).click();
    await expect(dialog.getByText("Activity name is required")).toBeVisible({ timeout: 5_000 });
    await expect(dialog.getByText(/Step 1 of 3/)).toBeVisible();
  });

  test("adds a social connection (family member)", async ({ page }) => {
    const r = await createResident("SocCon");
    await openResidentPage(page, r.id, "lifestyle-social");
    await page.getByRole("button", { name: "Add Member" }).click();
    const dialog = page.getByRole("dialog", { name: /Add Social Connection for/ });
    await dialog.getByPlaceholder("e.g., Sarah Wilson").fill("Sarah Wilson");
    await dialog.getByPlaceholder("e.g., Daughter").fill("Daughter");
    await pickOption(page, dialog.getByRole("combobox", { name: /^Type/ }), "Family");
    await dialog.getByPlaceholder("e.g., Daily, Weekly, 3x/week").fill("Weekly");
    await dialog.getByRole("button", { name: "Add Connection" }).click();
    await expectToast(page, "Social connection added successfully");
    await expect(page.getByText("Sarah Wilson").first()).toBeVisible();
  });
});

test.describe("documents", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "A1.nurse");
  });

  async function createFolder(page: Page, name: string) {
    await page.getByRole("button", { name: "New Folder" }).click();
    const dialog = page.getByRole("dialog", { name: "Create New Folder" });
    await dialog.getByPlaceholder("e.g., Medical Records").fill(name);
    await dialog.getByRole("button", { name: /Create/ }).last().click();
  }

  test("creates a folder; only one folder is allowed per resident", async ({ page }) => {
    const r = await createResident("Doc");
    await openResidentPage(page, r.id, "documents");
    await createFolder(page, "Medical Records");
    await expectToast(page, "Folder created successfully");
    await expect(page.getByText("Medical Records").first()).toBeVisible();

    if (await page.getByRole("button", { name: "New Folder" }).isVisible()) {
      await createFolder(page, "Second");
      await expectToast(page, "This resident already has a folder. Only one folder is allowed per resident.");
    }
    expect(await rowsFor("folders", "resident_id", r.id)).toHaveLength(1);
  });

  test("folder name is required", async ({ page }) => {
    const r = await createResident("DocReq");
    await openResidentPage(page, r.id, "documents");
    await page.getByRole("button", { name: "New Folder" }).click();
    const dialog = page.getByRole("dialog", { name: "Create New Folder" });
    await dialog.getByRole("button", { name: /Create/ }).last().click();
    await expect(dialog.getByText("Folder name is required")).toBeVisible();
  });

  test("uploads a document into the folder", async ({ page }) => {
    const r = await createResident("DocUp");
    await openResidentPage(page, r.id, "documents");
    await createFolder(page, "Letters");
    await expectToast(page, "Folder created successfully");
    await page.getByText("Letters").first().click();
    await page.locator('input[type="file"]').first().setInputFiles({
      name: "discharge.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n%%EOF\n"),
    });
    await page.getByPlaceholder("Enter document name...").fill("Hospital discharge letter");
    await page.getByRole("button", { name: /Upload/ }).last().click();
    await expectToast(page, "Document uploaded successfully");
    await expect(page.getByText("Hospital discharge letter").first()).toBeVisible();
    const [file] = await waitForRows<{ storage_path: string }>(() => db().from("files").select("*").eq("resident_id", r.id));
    expect(file.storage_path).toContain(r.id);
  });
});

test.describe("appointments", () => {
  test.use({ timezoneId: "Europe/London" });

  test.beforeEach(async ({ page }) => {
    await login(page, "A1.nurse");
  });

  async function createAppointment(page: Page, residentId: string, title: string) {
    await openResidentPage(page, residentId, "appointments");
    await page.getByRole("button", { name: "Create Appointment" }).click();
    const dialog = page.getByRole("dialog", { name: /Create Appointment for/ });
    await dialog.getByPlaceholder("e.g., Doctor Visit, Physical Therapy").fill(title);
    await dialog.getByPlaceholder("e.g., General Hospital, Room 205").fill("Royal Victoria Hospital, Clinic 4");
    await dialog.getByRole("button", { name: /Select date/ }).click();
    // Tomorrow, so the appointment is still upcoming whatever the time of day.
    const tomorrow = new Date(Date.now() + 86_400_000);
    if (tomorrow.getDate() === 1) await page.getByRole("button", { name: /Next Month/i }).click();
    await page.getByRole("button", { name: new RegExp(format(tomorrow, "MMMM do, yyyy")) }).click();
    // Time: 2:30 PM
    const time = dialog.getByRole("combobox");
    const n = await time.count();
    await pickOption(page, time.nth(n - 4), "2");
    await pickOption(page, time.nth(n - 3), "30");
    await pickOption(page, time.nth(n - 2), "PM");
    await dialog.getByRole("button", { name: /Create/ }).last().click();
    return dialog;
  }

  test("creates an appointment that is listed for the resident", async ({ page }) => {
    const r = await createResident("Appt");
    await createAppointment(page, r.id, "Eye clinic review");
    await expectToast(page, "Appointment created successfully");
    await expect(page.getByText("Eye clinic review").first()).toBeVisible();

    const [row] = await waitForRows<{ title: string; location: string; start_time: string }>(() =>
      db().from("appointments").select("*").eq("resident_id", r.id)
    );
    expect(row).toMatchObject({ title: "Eye clinic review", location: "Royal Victoria Hospital, Clinic 4" });
    const ukTime = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }).format(new Date(row.start_time));
    expect(ukTime).toBe("14:30");
  });

  test("title must be at least 3 characters and location is required", async ({ page }) => {
    const r = await createResident("ApptReq");
    await openResidentPage(page, r.id, "appointments");
    await page.getByRole("button", { name: "Create Appointment" }).click();
    const dialog = page.getByRole("dialog", { name: /Create Appointment for/ });
    await dialog.getByPlaceholder("e.g., Doctor Visit, Physical Therapy").fill("GP");
    await dialog.getByRole("button", { name: /Create/ }).last().click();
    await expect(dialog.getByText("Title must be at least 3 characters long")).toBeVisible();
    await expect(dialog.getByText("Location is required")).toBeVisible();
    expect(await rowsFor("appointments", "resident_id", r.id)).toHaveLength(0);
  });
});

test.describe("appointments (device clock ahead of UK)", () => {
  test.use({ timezoneId: "Asia/Kolkata" });

  test("BUG: appointment time is stored in the device timezone, not UK time", async ({ page }) => {
    // FormDateTimePicker builds the Date with `new Date(y, m, d, h, min)` (device-local),
    // so 2:30 PM entered on a non-UK device is saved hours away from 14:30 UK time.
    const r = await createResident("ApptTz");
    await login(page, "A1.nurse");
    await openResidentPage(page, r.id, "appointments");
    await page.getByRole("button", { name: "Create Appointment" }).click();
    const dialog = page.getByRole("dialog", { name: /Create Appointment for/ });
    await dialog.getByPlaceholder("e.g., Doctor Visit, Physical Therapy").fill("Dentist");
    await dialog.getByPlaceholder("e.g., General Hospital, Room 205").fill("Surgery");
    await dialog.getByRole("button", { name: /Select date/ }).click();
    await page.getByRole("button", { name: /Today/ }).click();
    const time = dialog.getByRole("combobox");
    const n = await time.count();
    await pickOption(page, time.nth(n - 4), "2");
    await pickOption(page, time.nth(n - 3), "30");
    await pickOption(page, time.nth(n - 2), "PM");
    await dialog.getByRole("button", { name: /Create/ }).last().click();
    const [row] = await waitForRows<{ start_time: string }>(() => db().from("appointments").select("*").eq("resident_id", r.id));
    const ukTime = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }).format(new Date(row.start_time));
    expect(ukTime).toBe("14:30");
  });
});

test.describe("multidisciplinary notes", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "A1.nurse");
  });

  async function openNoteWizard(page: Page, residentId: string) {
    await openResidentPage(page, residentId, "multidisciplinary-note");
    await page.getByRole("button", { name: "Create Note" }).click();
    return page.getByRole("dialog", { name: /Create Multidisciplinary Note for/ });
  }

  test("writes a note on behalf of the resident's GP", async ({ page }) => {
    const r = await createResident("Mdt", { gp_name: "Dr Alan Jones" });
    const dialog = await openNoteWizard(page, r.id);
    await pickOption(page, dialog.getByRole("combobox", { name: "Team Member *" }), /Dr Alan Jones/);
    await dialog.getByRole("textbox", { name: "Reason for Visit *" }).fill("Mobility review after fall");
    await dialog.getByRole("textbox", { name: "Outcome *" }).fill("Frame provided; exercises twice daily");
    await dialog.getByRole("button", { name: "Next Step" }).click();
    await pickOption(page, dialog.getByRole("combobox", { name: /^Relative Informed/ }), /^No/);
    await dialog.getByPlaceholder("Digital signature or full name...").fill("A Jones");
    await dialog.getByRole("button", { name: "Create Note" }).click();
    await expectToast(page, /Multidisciplinary note.*saved successfully/);
    await expect(page.getByText("Mobility review after fall").first()).toBeVisible();
  });

  test("step 1 requires team member, reason and outcome", async ({ page }) => {
    const r = await createResident("MdtReq");
    const dialog = await openNoteWizard(page, r.id);
    await dialog.getByRole("button", { name: "Next Step" }).click();
    await expect(dialog.getByText("Reason for visit is required")).toBeVisible();
    await expect(dialog.getByText("Outcome is required")).toBeVisible();
    await expect(dialog.getByText("Team member is required")).toBeVisible();
  });

  test("BUG: there is no way to open the 'Add Team Member' dialog", async ({ page }) => {
    // Fixed: the note form has an "Add Team Member" button; a new member can then author a note.
    const r = await createResident("MdtAdd");
    const dialog = await openNoteWizard(page, r.id);
    await dialog.getByRole("button", { name: "Add Team Member" }).click();
    const add = page.getByRole("dialog", { name: /Add Team Member for/ });
    await add.getByPlaceholder("Enter full name...").fill("Priya Shah");
    await add.getByPlaceholder("e.g., Registered Nurse, Physiotherapist...").fill("Physiotherapist");
    await add.getByPlaceholder("e.g., Nursing, Medical, Physiotherapy...").fill("Physiotherapy");
    await add.getByRole("button", { name: "Add Team Member" }).click();
    await expectToast(page, "Team member added successfully");
    await expect(add).toBeHidden();

    const note = page.getByRole("dialog", { name: /Create Multidisciplinary Note for/ });
    if (!(await note.isVisible())) await page.getByRole("button", { name: "Create Note" }).click();
    await pickOption(page, note.getByRole("combobox", { name: "Team Member *" }), /Priya Shah/);
  });
});

test.describe("checks", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "A1.nurse");
  });

  test("Add Check opens the check recording flow", async ({ page }) => {
    const r = await createResident("Chk");
    await openResidentPage(page, r.id, "checks");
    for (const tab of ["All", "Check", "Positioning", "Pad Change", "Bed Rails", "Environmental", "Cleaning", "Note"]) {
      await expect(page.getByRole("tab", { name: tab, exact: true })).toBeVisible();
    }
    await page.getByRole("button", { name: "Add Check" }).click();
    await expect(page.getByRole("dialog").or(page.getByRole("menu")).first()).toBeVisible();
  });
});
