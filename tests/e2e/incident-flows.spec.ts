import { expect, test, type Page } from "@playwright/test";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { login, world } from "./helpers";
import { createResident, db, expectToast, openResidentPage, pickOption, waitForRows } from "./resident-helpers";

/**
 * Resident profile -> incidents & falls: folder -> Incident Report form -> submit,
 * checked against the incidents table and the notification it raises.
 */

interface IncidentRow {
  id: string;
  date: string;
  injured_person_dob: string;
  date_completed: string;
  incident_types: string[];
  incident_level: string;
  detailed_description: string;
  resident_id: string;
  folder_id: string;
  organization_id: string;
  care_home_id: string;
  created_by: string;
}

/** Creates an incident folder through the UI and opens a new Incident Report form in it. */
async function openIncidentForm(page: Page, residentId: string) {
  await openResidentPage(page, residentId, "incidents");
  await page.getByRole("button", { name: "Create Incident" }).click();
  await page.getByRole("button", { name: "Incident", exact: true }).click();
  await page.getByRole("button", { name: "Create Folder" }).click();
  await expectToast(page, "Incident folder created successfully");
  await page.getByRole("row").filter({ hasText: "Incident Folder" }).getByRole("cell").first().click();
  await page.waitForURL(/incidents\/[0-9a-f-]{36}/, { timeout: 60_000 });
  await page.getByRole("button", { name: "Add form" }).click();
  await page.getByRole("dialog").getByText("Incident Report", { exact: true }).click();
  // Prefilled from the resident once loaded.
  await expect(page.getByRole("textbox", { name: "Unit (Team) *" })).toHaveValue("Unit A1");
}

test.describe("incident report", () => {
  test.use({ timezoneId: "Europe/London" });

  test.beforeEach(async ({ page }) => {
    await login(page, "A1.nurse");
  });

  test("nurse files an unwitnessed fall; the record and a notification are saved", async ({ page }) => {
    const r = await createResident("IncNew");
    const w = world();
    await openIncidentForm(page, r.id);
    await page.getByRole("checkbox", { name: "Fall (unwitnessed)" }).check();
    await page.getByRole("textbox", { name: "Description *" }).fill("Found on the floor beside the bed at handover.");
    await pickOption(page, page.getByRole("combobox", { name: "Incident Level *" }), "Minor injury/First aid");
    await page.getByRole("checkbox", { name: "First aid" }).check();
    await page.getByRole("button", { name: "Submit Incident Report" }).click();
    await expectToast(page, "Incident report submitted successfully");

    const [inc] = await waitForRows<IncidentRow>(() => db().from("incidents").select("*").eq("resident_id", r.id));
    expect(inc).toMatchObject({
      incident_types: ["FallUnwitnessed"],
      incident_level: "minor_injury",
      organization_id: w.homes.A1.orgId,
      care_home_id: w.homes.A1.careHomeId,
      created_by: w.users["A1.nurse"].id,
      injured_person_dob: "1938-05-17",
      date: formatInTimeZone(new Date(), "Europe/London", "yyyy-MM-dd"),
    });
    const { data: folder } = await db().from("incident_folders").select("id").eq("resident_id", r.id).single();
    expect(inc.folder_id).toBe(folder?.id);

    const [note] = await waitForRows<{ type: string; care_home_id: string; metadata: { incidentId: string } }>(() =>
      db().from("notifications").select("*").eq("type", "incident").contains("metadata", { incidentId: inc.id })
    );
    expect(note.care_home_id).toBe(w.homes.A1.careHomeId);

    // The folder list now reports the incident's severity.
    await openResidentPage(page, r.id, "incidents");
    await expect(page.getByText("Total Incidents").locator("..").getByText("1", { exact: true })).toBeVisible();
  });

  test("an incident type and a detailed description are required", async ({ page }) => {
    const r = await createResident("IncReq");
    await openIncidentForm(page, r.id);
    await page.getByRole("textbox", { name: "Description *" }).fill("Fell");
    await page.getByRole("button", { name: "Submit Incident Report" }).click();
    await expect(page.getByText("At least one incident type must be selected")).toBeVisible();
    await expect(page.getByText("Please provide a detailed description")).toBeVisible();
    expect((await db().from("incidents").select("id").eq("resident_id", r.id)).data).toEqual([]);
  });

  test("a submitted report is shown read-only and cannot be added twice to the folder", async ({ page }) => {
    const r = await createResident("IncView");
    await openIncidentForm(page, r.id);
    await page.getByRole("checkbox", { name: "Bruise" }).check();
    await page.getByRole("textbox", { name: "Description *" }).fill("Bruise noted on left forearm during wash.");
    await page.getByRole("button", { name: "Submit Incident Report" }).click();
    await expectToast(page, "Incident report submitted successfully");

    await expect(page.getByRole("heading", { name: "Detailed Description" })).toBeVisible();
    await expect(page.getByText("Bruise noted on left forearm during wash.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Download PDF" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit Incident Report" })).toHaveCount(0);

    await page.getByRole("button", { name: "Add form" }).click();
    const picker = page.getByRole("dialog", { name: "Select Form Type" });
    await expect(picker.getByText("Restrictive Practice", { exact: true })).toBeVisible();
    await expect(picker.getByText("Incident Report", { exact: true })).toHaveCount(0);
  });
});

test.describe("incident dates on a device ahead of UK time", () => {
  test.use({ timezoneId: "Asia/Kolkata" });

  test("BUG: a date picked in the calendar is saved as the day before", async ({ page }) => {
    const r = await createResident("IncTz");
    await login(page, "A1.nurse");
    await openIncidentForm(page, r.id);
    // Pick the 1st of the current month as the incident date.
    const first = new Date();
    first.setDate(1);
    await page.getByRole("button", { name: "Date of Incident *" }).click();
    await page.getByRole("button", { name: new RegExp(format(first, "MMMM do, yyyy")) }).click();
    await page.getByRole("checkbox", { name: "Wound", exact: true }).check();
    await page.getByRole("textbox", { name: "Description *" }).fill("Skin tear on right shin noticed at breakfast.");
    await page.getByRole("button", { name: "Submit Incident Report" }).click();
    await expectToast(page, "Incident report submitted successfully");

    const [inc] = await waitForRows<IncidentRow>(() => db().from("incidents").select("*").eq("resident_id", r.id));
    expect(inc.date).toBe(format(first, "yyyy-MM-dd"));
    expect(inc.injured_person_dob).toBe("1938-05-17");
  });
});
