import { expect, test, type Locator, type Page } from "@playwright/test";
import { login, world } from "./helpers";
import { createResident, db, expectToast, openResidentPage, pickOption, trackPageErrors, type TestResident } from "./resident-helpers";

/**
 * Resident profile -> Food & Fluid: diet information wizard, menu management,
 * food/fluid intake logging, daily totals and fluid target.
 * Every test creates its own resident so failures do not cascade.
 */

interface FoodFluidRow {
  type_of_food_drink: string;
  portion_served: string | null;
  amount_eaten: string;
  fluid_consumed_ml: number | null;
  signature: string;
  section: string;
  organization_id: string;
  created_by: string;
}

async function logRows(residentId: string): Promise<FoodFluidRow[]> {
  const { data, error } = await db().from("food_fluid_logs").select("*").eq("resident_id", residentId);
  if (error) throw new Error(error.message);
  return (data ?? []) as FoodFluidRow[];
}

function summaryTile(page: Page, label: string): Locator {
  return page.getByText(label, { exact: true }).locator("..");
}

async function openLogDialog(page: Page, kind: "Food" | "Fluid"): Promise<Locator> {
  await page.getByRole("button", { name: `Log ${kind} Entry` }).click();
  const dialog = page.getByRole("dialog", { name: new RegExp(`Log ${kind} Entry for`) });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function typeItem(dialog: Locator, kind: "food" | "fluid", name: string): Promise<void> {
  const input = dialog.getByPlaceholder(kind === "food" ? "Search or type food..." : "Search or type fluid...");
  await input.fill(name);
  await input.press("Tab");
}

async function logFluidPreset(page: Page, name: string, preset: string): Promise<void> {
  const dialog = await openLogDialog(page, "Fluid");
  await typeItem(dialog, "fluid", name);
  await pickOption(page, dialog.getByRole("combobox").filter({ hasText: "Select volume or container..." }), preset);
  await dialog.getByRole("button", { name: "Save Entry" }).click();
  await expect(dialog).toBeHidden();
}

async function seedDiet(residentId: string, extra: Record<string, unknown> = {}): Promise<void> {
  const nurse = world().users["A1.nurse"];
  const { error } = await db()
    .from("diet_lifestyle")
    .insert({
      resident_id: residentId,
      organization_id: nurse.home.orgId,
      created_by: nurse.id,
      diet_types: ["Soft Diet"],
      allergies: [{ allergy: "Shellfish" }],
      choking_risk: "medium",
      assistance_required: "no",
      chef_notified: "yes",
      chef_name: "Chef Ramsay",
      ...extra,
    });
  if (error) throw new Error(`seedDiet: ${error.message}`);
}

test.describe("food & fluid (nurse)", () => {
  let resident: TestResident;

  test.beforeEach(async ({ page }) => {
    resident = await createResident("Ff");
    await login(page, "A1.nurse");
  });

  test("empty state shows no entries and zero totals", async ({ page }) => {
    const errors = trackPageErrors(page);
    await openResidentPage(page, resident.id, "food-fluid");
    await expect(page.getByText(resident.fullName).first()).toBeVisible();
    await expect(page.getByText("No food entries logged today")).toBeVisible();
    await expect(summaryTile(page, "Food Entries")).toContainText("0");
    await expect(summaryTile(page, "Fluid Intake")).toContainText("0ml");
    await expect(summaryTile(page, "Fluid Target")).toContainText("--ml");
    await expect(summaryTile(page, "Last Recorded")).toContainText("--:--");
    await expect(page.getByText("No allergies recorded")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("food entry requires a food name", async ({ page }) => {
    await openResidentPage(page, resident.id, "food-fluid");
    const dialog = await openLogDialog(page, "Food");
    await dialog.getByRole("button", { name: "Save Entry" }).click();
    await expect(dialog.getByText("Please specify the food or drink")).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    expect(await logRows(resident.id)).toHaveLength(0);
  });

  test("logs a food entry and shows it in today's history and summary", async ({ page }) => {
    const nurse = world().users["A1.nurse"];
    await openResidentPage(page, resident.id, "food-fluid");
    const dialog = await openLogDialog(page, "Food");
    // Signature is taken from the logged-in profile and cannot be edited.
    const signature = dialog.getByPlaceholder("Your name...");
    await expect(signature).toHaveValue(nurse.email);
    await expect(signature).toHaveAttribute("readonly", "");

    await typeItem(dialog, "food", "Porridge with honey");
    await pickOption(page, dialog.getByRole("combobox").filter({ hasText: "Select portion size..." }), "Half Plate");
    await pickOption(page, dialog.getByRole("combobox").filter({ hasText: /^All$/ }), "3/4");
    await dialog.getByRole("button", { name: "Save Entry" }).click();

    await expectToast(page, "Food/fluid entry logged successfully");
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Entry logged successfully!")).toBeVisible();

    const foodTab = page.getByRole("tabpanel");
    await expect(foodTab).toContainText("Porridge with honey");
    await expect(foodTab).toContainText("Portion: Half Plate");
    await expect(foodTab).toContainText("Amount: 3/4");
    await expect(foodTab).toContainText(`sign by ${nurse.email}`);
    await expect(summaryTile(page, "Food Entries")).toContainText("1");
    await expect(summaryTile(page, "Last Recorded")).not.toContainText("--:--");

    const rows = await logRows(resident.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      type_of_food_drink: "Porridge with honey",
      portion_served: "Half Plate",
      amount_eaten: "3/4",
      fluid_consumed_ml: null,
      signature: nurse.email,
      organization_id: nurse.home.orgId,
      created_by: nurse.id,
    });
    expect(["midnight-7am", "7am-12pm", "12pm-5pm", "5pm-midnight"]).toContain(rows[0].section);
  });

  test("food entry requires a portion", async ({ page }) => {
    await openResidentPage(page, resident.id, "food-fluid");
    const dialog = await openLogDialog(page, "Food");
    await typeItem(dialog, "food", "Toast");
    await dialog.getByRole("button", { name: "Save Entry" }).click();
    await expect(dialog.getByText("Portion served is required for food entries")).toBeVisible();
    expect(await logRows(resident.id)).toHaveLength(0);
  });

  test("logs fluid entries from presets and totals the intake", async ({ page }) => {
    await openResidentPage(page, resident.id, "food-fluid");
    await logFluidPreset(page, "Tea", "Cup (250ml)");
    await logFluidPreset(page, "Orange juice", "Bottle (500ml)");

    await page.getByRole("tab", { name: "Fluid" }).click();
    const fluidTab = page.getByRole("tabpanel");
    await expect(fluidTab).toContainText("Tea");
    await expect(fluidTab).toContainText("Volume: 250ml");
    await expect(fluidTab).toContainText("Orange juice");
    await expect(fluidTab).toContainText("Volume: 500ml");
    await expect(summaryTile(page, "Fluid Intake")).toContainText("750ml");
    // Fluid entries must not count as food.
    await expect(summaryTile(page, "Food Entries")).toContainText("0");

    const rows = await logRows(resident.id);
    expect(rows.map((r) => [r.type_of_food_drink, r.fluid_consumed_ml, r.portion_served]).sort()).toEqual([
      ["Orange juice", 500, "N/A"],
      ["Tea", 250, "N/A"],
    ]);
  });

  test("'Log Another Fluid' quick action reopens the dialog prefilled with Water", async ({ page }) => {
    await openResidentPage(page, resident.id, "food-fluid");
    await logFluidPreset(page, "Tea", "Cup (250ml)");
    await page.getByRole("button", { name: "Log Another Fluid" }).click();
    const dialog = page.getByRole("dialog", { name: /Log Fluid Entry for/ });
    await expect(dialog.getByPlaceholder("Search or type fluid...")).toHaveValue("Water");
  });

  test("BUG: a custom fluid volume cannot be typed (input is wiped, 'Expected number, received nan')", async ({ page }) => {
    // The volume <Select> receives a value that matches none of its items and fires
    // onValueChange(""), which the page turns into parseInt("") = NaN. As a result only
    // preset volumes can be recorded, and the 2000ml upper limit is unreachable.
    await openResidentPage(page, resident.id, "food-fluid");
    const dialog = await openLogDialog(page, "Fluid");
    await typeItem(dialog, "fluid", "Orange juice");
    const custom = dialog.getByPlaceholder("Enter custom amount in ml...");
    await custom.fill("120");
    await expect(custom).toHaveValue("120", { timeout: 5_000 });
    await dialog.getByRole("button", { name: "Save Entry" }).click();
    await expect(dialog).toBeHidden({ timeout: 5_000 });
    expect((await logRows(resident.id)).map((r) => r.fluid_consumed_ml)).toEqual([120]);
  });

  test("custom volume keeps the input while typing through a preset value (250 -> 2500)", async ({ page }) => {
    await openResidentPage(page, resident.id, "food-fluid");
    const dialog = await openLogDialog(page, "Fluid");
    await typeItem(dialog, "fluid", "Water");
    const custom = dialog.getByPlaceholder("Enter custom amount in ml...");
    await custom.pressSequentially("2500");
    await expect(custom).toHaveValue("2500");
    await dialog.getByRole("button", { name: "Save Entry" }).click();
    // Over 2000ml is blocked (browser max=2000 and the schema's "Volume seems too high").
    expect(await custom.evaluate((el) => (el as HTMLInputElement).validity.rangeOverflow)).toBe(true);
    await expect(dialog).toBeVisible();
    expect(await logRows(resident.id)).toHaveLength(0);
  });

  test("BUG: a fluid entry saved without a volume is counted as a food entry", async ({ page }) => {
    // Volume is optional in the schema, and the page classifies rows by
    // `fluid_consumed_ml IS NULL`, so a volume-less drink lands in the Food tab.
    await openResidentPage(page, resident.id, "food-fluid");
    const dialog = await openLogDialog(page, "Fluid");
    await typeItem(dialog, "fluid", "Squash");
    await dialog.getByRole("button", { name: "Save Entry" }).click();
    await page.waitForTimeout(2_000);

    // Acceptable outcomes: the form demands a volume, or the drink is filed as fluid.
    if ((await logRows(resident.id)).length === 0) {
      await expect(dialog).toBeVisible();
      return;
    }
    await expect(summaryTile(page, "Food Entries")).toContainText("0", { timeout: 5_000 });
    await expect(page.getByText("No food entries logged today")).toBeVisible();
  });

  test("sets a daily fluid target, persists it, and rejects a zero target", async ({ page }) => {
    await openResidentPage(page, resident.id, "food-fluid");
    await page.getByRole("button", { name: "Set Fluid Target" }).click();
    const dialog = page.getByRole("dialog", { name: "Set Daily Fluid Target" });
    await dialog.getByLabel("Target (ml)").fill("0");
    await dialog.getByRole("button", { name: "Save Target" }).click();
    await expectToast(page, "Please enter a valid target amount");
    await expect(dialog).toBeVisible();

    await dialog.getByLabel("Target (ml)").fill("1800");
    await dialog.getByRole("button", { name: "Save Target" }).click();
    await expectToast(page, "Fluid target set to 1800ml");
    await expect(summaryTile(page, "Fluid Target")).toContainText("1800ml");

    const { data } = await db().from("residents").select("fluid_target").eq("id", resident.id).single();
    expect(data?.fluid_target).toBe(1800);

    await page.reload();
    await expect(summaryTile(page, "Fluid Target")).toContainText("1800ml");
    await page.getByRole("button", { name: "Set Fluid Target" }).click();
    await expect(page.getByText("Current target: 1800ml")).toBeVisible();
  });

  test("diet information wizard saves all three steps", async ({ page }) => {
    await openResidentPage(page, resident.id, "food-fluid");
    await page.getByRole("button", { name: "Add Diet" }).first().click();
    const dialog = page.getByRole("dialog", { name: /Add Diet Information for/ });
    await expect(dialog.getByText("Step 1 of 3")).toBeVisible();

    await dialog.getByLabel("Diabetic Diet").check();
    await dialog.getByLabel("Halal").check();
    await dialog.getByPlaceholder("e.g., No pork, No beef, etc.").fill("No pork");
    await dialog.getByRole("button", { name: "Next" }).click();

    await expect(dialog.getByText("Step 2 of 3")).toBeVisible();
    await dialog.getByRole("button", { name: "Add Allergy" }).click();
    await dialog.getByPlaceholder("Enter allergy...").fill("Peanuts");
    await dialog.getByRole("button", { name: "Add Allergy" }).click();
    await dialog.getByPlaceholder("Enter allergy...").nth(1).fill("   "); // blank rows are dropped
    await pickOption(page, dialog.getByRole("combobox").filter({ hasText: "Select choking risk level..." }), "High");
    await pickOption(page, dialog.getByRole("combobox").filter({ hasText: "Select food consistency level..." }), "Level 5 - Minced & Moist");
    await pickOption(page, dialog.getByRole("combobox").filter({ hasText: "Select fluid consistency level..." }), "Level 1 - Slightly Thick");
    await dialog.getByRole("button", { name: "Next" }).click();

    await expect(dialog.getByText("Step 3 of 3")).toBeVisible();
    await dialog.getByLabel("Yes, assistance required").click();
    await dialog.getByLabel("Yes", { exact: true }).click();
    await dialog.getByPlaceholder("Enter chef's name...").fill("Chef Ramsay");
    await expect(dialog.getByText("Diet Types: Diabetic Diet, Halal")).toBeVisible();
    await expect(dialog.getByText("Allergies: Peanuts")).toBeVisible();
    await dialog.getByRole("button", { name: "Save Diet Information" }).click();

    await expectToast(page, "Diet information saved successfully");
    for (const badge of ["Diabetic Diet", "Halal", "No pork", "Peanuts", "High Risk", "Level 5 - Minced & Moist", "Level 1 - Slightly Thick", "Assistance Required", "Notified: Chef Ramsay"]) {
      await expect(page.getByText(badge, { exact: true }).first()).toBeVisible();
    }

    const { data } = await db().from("diet_lifestyle").select("*").eq("resident_id", resident.id).single();
    expect(data).toMatchObject({
      diet_types: ["Diabetic Diet", "Halal"],
      cultural_restrictions: "No pork",
      allergies: [{ allergy: "Peanuts" }],
      choking_risk: "high",
      food_consistency: "level5",
      fluid_consistency: "level1",
      assistance_required: "yes",
      chef_notified: "yes",
      chef_name: "Chef Ramsay",
    });
  });

  test("Cancel on the diet wizard does not save anything", async ({ page }) => {
    await openResidentPage(page, resident.id, "food-fluid");
    await page.getByRole("button", { name: "Add Diet" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Vegan").check();
    await dialog.getByRole("button", { name: "Next" }).click();
    await dialog.getByRole("button", { name: "Next" }).click();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    const { data } = await db().from("diet_lifestyle").select("id").eq("resident_id", resident.id);
    expect(data).toEqual([]);
  });

  test("existing diet is shown and the edit form is prefilled", async ({ page }) => {
    await seedDiet(resident.id);
    await openResidentPage(page, resident.id, "food-fluid");
    for (const badge of ["Soft Diet", "Shellfish", "Medium Risk", "Independent", "Notified: Chef Ramsay"]) {
      await expect(page.getByText(badge, { exact: true }).first()).toBeVisible();
    }
    await page.getByRole("button", { name: "Edit Diet" }).click();
    const dialog = page.getByRole("dialog", { name: /Edit Diet Information for/ });
    await expect(dialog.getByLabel("Soft Diet")).toBeChecked();
    await dialog.getByRole("button", { name: "Next" }).click();
    await expect(dialog.getByPlaceholder("Enter allergy...")).toHaveValue("Shellfish");
  });

  test("BUG: re-saving an existing diet keeps the chef notification and name", async ({ page }) => {
    // The edit form is pre-filled from `existingDiet.chef_notified/chef_name`, but the
    // loaded object uses camelCase keys, so the chef fields start blank and get wiped.
    await seedDiet(resident.id);
    await openResidentPage(page, resident.id, "food-fluid");
    await page.getByRole("button", { name: "Edit Diet" }).click();
    const dialog = page.getByRole("dialog", { name: /Edit Diet Information for/ });
    await dialog.getByRole("button", { name: "Next" }).click();
    await dialog.getByRole("button", { name: "Next" }).click();
    await expect(dialog.getByLabel("Yes", { exact: true })).toBeChecked({ timeout: 5_000 });
    await expect(dialog.getByPlaceholder("Enter chef's name...")).toHaveValue("Chef Ramsay");
    await dialog.getByRole("button", { name: "Update Diet Information" }).click();
    await expectToast(page, "Diet information updated successfully");

    const { data } = await db().from("diet_lifestyle").select("chef_notified, chef_name").eq("resident_id", resident.id).single();
    expect(data).toEqual({ chef_notified: "yes", chef_name: "Chef Ramsay" });
  });

  test("BUG: a diet saved without consistency levels can be edited again", async ({ page }) => {
    // NULL consistency columns were loaded as null, which the optional enums reject,
    // so "Update Diet Information" silently did nothing.
    await seedDiet(resident.id, { food_consistency: null, fluid_consistency: null, chef_notified: null, chef_name: null });
    await openResidentPage(page, resident.id, "food-fluid");
    await page.getByRole("button", { name: "Edit Diet" }).click();
    const dialog = page.getByRole("dialog", { name: /Edit Diet Information for/ });
    await dialog.getByLabel("Vegetarian").check();
    await dialog.getByRole("button", { name: "Next" }).click();
    await dialog.getByRole("button", { name: "Next" }).click();
    await dialog.getByRole("button", { name: "Update Diet Information" }).click();
    await expectToast(page, "Diet information updated successfully");
    const { data } = await db().from("diet_lifestyle").select("diet_types").eq("resident_id", resident.id).single();
    expect(data?.diet_types).toEqual(["Soft Diet", "Vegetarian"]);
  });

  test("menu items added by staff are suggested when logging, and can be removed", async ({ page }) => {
    const dish = `Shepherds Pie ${Date.now().toString(36)}`;
    await openResidentPage(page, resident.id, "food-fluid");
    await page.getByRole("button", { name: "Add Menu" }).click();
    const menu = page.getByRole("dialog", { name: "Management Menu Items" });
    await menu.getByPlaceholder(/Enter dish name/).fill(dish);
    await menu.getByRole("button", { name: "Add", exact: true }).click();
    await expectToast(page, "Dish added to menu");
    const row = menu.locator("div.flex.items-center.justify-between").filter({ hasText: dish });
    await expect(row).toContainText("Food");
    await menu.getByRole("button", { name: "Close" }).first().click();

    const dialog = await openLogDialog(page, "Food");
    await dialog.getByPlaceholder("Search or type food...").fill(dish.slice(0, 10));
    await expect(dialog.getByText(dish, { exact: true })).toBeVisible();
    await dialog.getByText(dish, { exact: true }).click();
    await expect(dialog.getByPlaceholder("Search or type food...")).toHaveValue(dish);
    await dialog.getByRole("button", { name: "Cancel" }).click();

    await page.getByRole("button", { name: "Add Menu" }).click();
    await row.getByRole("button", { name: "Remove" }).click();
    await expectToast(page, "Dish removed from menu");
    await expect(row).toHaveCount(0);
    const { data } = await db().from("menu_items").select("id").eq("name", dish);
    expect(data).toEqual([]);
  });

});

test.describe("food & fluid records history (UK device)", () => {
  test.use({ timezoneId: "Europe/London" });

  test("See All Records lists today's report with food and fluid counts", async ({ page }) => {
    const r = await createResident("FfRec");
    await login(page, "A1.nurse");
    await openResidentPage(page, r.id, "food-fluid");
    await logFluidPreset(page, "Hot chocolate", "Cup (250ml)");
    await page.getByRole("button", { name: "See All Records" }).click();
    await expect(page).toHaveURL(new RegExp(`/residents/${r.id}/food-fluid/documents`));
    await expect(page.getByText("Food & Fluid Reports History")).toBeVisible();
    const today = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/London" }).format(new Date());
    const row = page.getByRole("row").filter({ hasText: today });
    await expect(row).toContainText("1 entries");
    await expect(row.getByRole("button", { name: "View" })).toBeVisible();
  });

  test("BUG: 'This Month' stat on the records page ignores reports from this month", async ({ page }) => {
    // reportStats.thisMonth is a placeholder that is 0 unless a month filter is selected.
    const r = await createResident("FfMonth");
    await login(page, "A1.nurse");
    await openResidentPage(page, r.id, "food-fluid");
    await logFluidPreset(page, "Tea", "Cup (250ml)");
    await page.goto(`/dashboard/residents/${r.id}/food-fluid/documents`);
    await expect(page.getByText("Total Reports").locator("..")).toContainText("1");
    await expect(page.getByText("This Month", { exact: true }).locator("..")).toContainText("1", { timeout: 5_000 });
  });
});

test.describe("food & fluid records history (device clock ahead of UK)", () => {
  test.use({ timezoneId: "Asia/Kolkata" });

  test("BUG: report dates are shown a day early when the device timezone is ahead of the UK", async ({ page }) => {
    // `new Date(report.date + "T00:00:00")` is parsed as *device-local* midnight, which is
    // still the previous day in Europe/London, so today's report is labelled yesterday.
    const r = await createResident("FfTz");
    await login(page, "A1.nurse");
    await openResidentPage(page, r.id, "food-fluid");
    await logFluidPreset(page, "Tea", "Cup (250ml)");
    await page.goto(`/dashboard/residents/${r.id}/food-fluid/documents`);
    const ukToday = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/London" }).format(new Date());
    await expect(page.getByRole("row").filter({ hasText: "1 entries" })).toContainText(ukToday, { timeout: 10_000 });
  });
});

test.describe("food & fluid permissions", () => {
  test("care assistant can log intake but cannot manage diet, target or menu", async ({ page }) => {
    const r = await createResident("FfCa");
    await login(page, "A1.care_assistant");
    await openResidentPage(page, r.id, "food-fluid");
    await expect(page.getByRole("button", { name: "Log Food Entry" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Log Fluid Entry" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Add Diet|Edit Diet/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Set Fluid Target" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Add Menu" })).toHaveCount(0);
  });

  test("nurse from another organization cannot open this resident's food & fluid", async ({ page }) => {
    const r = await createResident("FfIso");
    const nurse = world().users["A1.nurse"];
    await db().from("food_fluid_logs").insert({
      resident_id: r.id,
      organization_id: nurse.home.orgId,
      created_by: nurse.id,
      type_of_food_drink: "Secret soup",
      amount_eaten: "All",
      signature: "x",
      section: "7am-12pm",
      date: new Date().toISOString().slice(0, 10),
      timestamp: new Date().toISOString(),
    });
    await login(page, "B1.nurse");
    await openResidentPage(page, r.id, "food-fluid");
    await expect(page.getByText("Resident not found")).toBeVisible();
    await expect(page.getByText("Secret soup")).toHaveCount(0);
  });
});
