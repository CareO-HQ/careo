import { expect, test, type Page } from "@playwright/test";
import { format } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { login, world } from "./helpers";
import { db, expectToast, pickOption, waitForRows } from "./resident-helpers";

/**
 * Action Plans: a manager raises a care-home action plan for a nurse, the nurse sees it
 * and moves it through its statuses; overdue highlighting and who can be assigned.
 */

test.use({ timezoneId: "Europe/London" });

interface PlanRow {
  id: string;
  description: string;
  priority: string;
  status: string;
  assigned_to: string;
  assigned_to_email: string;
  organization_id: string;
  created_by: string;
  due_date: string;
}

const TABLE = "care_home_common_action_plans";

async function openCreateDialog(page: Page) {
  await page.goto("/dashboard/action-plans?create=1");
  const dialog = page.getByRole("dialog", { name: "Add action plan" });
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  return dialog;
}

/** Seeds a plan for A1's nurse directly, due at `due`. */
async function seedPlan(description: string, due: Date): Promise<PlanRow> {
  const w = world();
  const nurse = w.users["A1.nurse"];
  const { data, error } = await db()
    .from(TABLE)
    .insert({
      description,
      priority: "Medium",
      due_date: due.toISOString(),
      assigned_to: nurse.id,
      assigned_to_email: nurse.email,
      organization_id: w.homes.A1.orgId,
      care_home_id: w.homes.A1.careHomeId,
      created_by: w.users["A1.manager"].id,
      status: "pending",
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(`seedPlan: ${error?.message}`);
  return data as PlanRow;
}

test("manager assigns an action plan to a nurse; the nurse sees it and completes it", async ({ page }) => {
  const w = world();
  const text = `Update falls care plan ${Date.now()}`;
  await login(page, "A1.manager");
  const dialog = await openCreateDialog(page);
  await dialog.getByPlaceholder("What needs to be done?").fill(text);
  await pickOption(page, dialog.getByRole("combobox").filter({ hasText: "Select team member" }), new RegExp(w.users["A1.nurse"].email));
  await pickOption(page, dialog.getByRole("combobox").filter({ hasText: "Priority" }), "High");
  await dialog.getByRole("button", { name: "Pick date" }).click();
  await page.getByRole("button", { name: new RegExp(format(new Date(), "MMMM do, yyyy")) }).click();
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await expectToast(page, "Action plan created");

  const [plan] = await waitForRows<PlanRow>(() => db().from(TABLE).select("*").eq("description", text));
  expect(plan).toMatchObject({
    priority: "High",
    status: "pending",
    assigned_to: w.users["A1.nurse"].id,
    organization_id: w.homes.A1.orgId,
    created_by: w.users["A1.manager"].id,
  });

  // The nurse sees the plan and moves it to completed with a comment.
  await page.context().clearCookies();
  await login(page, "A1.nurse");
  await page.goto("/dashboard/action-plans");
  await page.getByText(text).click();
  const update = page.getByRole("dialog", { name: "Update Action Plan" });
  await pickOption(page, update.getByRole("combobox"), /Completed/);
  await update.getByPlaceholder("Add a note...").fill("Care plan reviewed with the family.");
  await update.getByRole("button", { name: "Update", exact: true }).click();
  await expectToast(page, "Status updated successfully");
  await expect.poll(async () => (await db().from(TABLE).select("status").eq("id", plan.id).single()).data?.status).toBe("completed");
});

test("nurse does not see a plan assigned to a colleague", async ({ page }) => {
  const w = world();
  const ca = w.users["A1.care_assistant"];
  const text = `Colleague-only plan ${Date.now()}`;
  await db().from(TABLE).insert({
    description: text,
    priority: "Low",
    due_date: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    assigned_to: ca.id,
    assigned_to_email: ca.email,
    organization_id: w.homes.A1.orgId,
    care_home_id: w.homes.A1.careHomeId,
    created_by: w.users["A1.manager"].id,
    status: "pending",
  });
  await login(page, "A1.nurse");
  await page.goto("/dashboard/action-plans");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(text)).toHaveCount(0);
});

test("BUG: a plan due today is not shown as overdue", async ({ page }) => {
  // Due dates are picked as a calendar day, stored as that day's midnight.
  const today = fromZonedTime(`${formatInTimeZone(new Date(), "Europe/London", "yyyy-MM-dd")}T00:00:00`, "Europe/London");
  const plan = await seedPlan(`Due today ${Date.now()}`, today);
  const overdue = await seedPlan(`Due yesterday ${Date.now()}`, new Date(today.getTime() - 86_400_000));
  await login(page, "A1.nurse");
  await page.goto("/dashboard/action-plans");
  const card = (description: string) => page.locator("div.cursor-pointer").filter({ hasText: description });
  await expect(card(overdue.description)).toHaveClass(/border-l-destructive/);
  await expect(card(plan.description)).toBeVisible();
  await expect(card(plan.description)).not.toHaveClass(/border-l-destructive/);
});

test("BUG: a care home's action plan cannot be assigned to staff of another care home", async ({ page }) => {
  const w = world();
  await login(page, "A1.manager");
  const dialog = await openCreateDialog(page);
  await dialog.getByRole("combobox").filter({ hasText: "Select team member" }).click();
  await expect(page.getByRole("option", { name: new RegExp(w.users["A1.nurse"].email) })).toBeVisible();
  // A2 staff cannot open A1's records, so a plan assigned to them can never be actioned.
  await expect(page.getByRole("option", { name: new RegExp(w.users["A2.nurse"].email) })).toHaveCount(0);
  await expect(page.getByRole("option", { name: new RegExp(w.users["A1.owner"].email) })).toHaveCount(0);
});
