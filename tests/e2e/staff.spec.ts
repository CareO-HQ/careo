import { expect, test } from "@playwright/test";
import { login, world } from "./helpers";
import { db, pickOption, waitForRows } from "./resident-helpers";

/**
 * Staff -> profile and training records.
 */

test.use({ timezoneId: "Europe/London" });

test("manager opens a staff member's training page", async ({ page }) => {
  const w = world();
  await login(page, "A1.manager");
  await page.goto(`/dashboard/staff/${w.users["A1.nurse"].id}/trainings`);
  await expect(page.getByText("Staff member not found")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add Training" }).first()).toBeVisible({ timeout: 30_000 });
});

test("BUG: a training record survives a page reload", async ({ page }) => {
  // Trainings used to live only in React state; they are now stored in staff_trainings.
  const w = world();
  const nurse = w.users["A1.nurse"];
  const name = `Safeguarding Adults ${Date.now()}`;
  await login(page, "A1.manager");
  await page.goto(`/dashboard/staff/${nurse.id}/trainings`);
  await page.getByRole("button", { name: "Add Training" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add Online Training" });
  await dialog.getByPlaceholder("e.g., Safeguarding Adults").fill(name);
  await dialog.getByPlaceholder("e.g., Care Skills Academy").fill("Care Skills Academy");
  await pickOption(page, dialog.getByRole("combobox").first(), "Completed");
  await dialog.getByRole("button", { name: "Add Training" }).click();
  await expect(page.getByRole("cell", { name, exact: true })).toBeVisible();

  const [row] = await waitForRows<{ user_id: string; organization_id: string; care_home_id: string; training_type: string; status: string; created_by: string }>(
    () => db().from("staff_trainings").select("*").eq("name", name)
  );
  expect(row).toMatchObject({
    user_id: nurse.id,
    organization_id: w.homes.A1.orgId,
    care_home_id: w.homes.A1.careHomeId,
    training_type: "online",
    status: "completed",
    created_by: w.users["A1.manager"].id,
  });

  await page.reload();
  await expect(page.getByRole("cell", { name, exact: true })).toBeVisible({ timeout: 15_000 });
});

test("a completed training past its expiry date is shown as expired", async ({ page }) => {
  const w = world();
  const nurse = w.users["A1.nurse"];
  const name = `Manual Handling ${Date.now()}`;
  const { error } = await db().from("staff_trainings").insert({
    user_id: nurse.id,
    organization_id: w.homes.A1.orgId,
    training_type: "inperson",
    name,
    provider: "Care Training UK",
    status: "completed",
    completion_date: "2024-01-10",
    expiry_period: "1_year",
    expiry_date: "2025-01-10",
  });
  if (error) throw new Error(error.message);
  await login(page, "A1.manager");
  await page.goto(`/dashboard/staff/${nurse.id}/trainings`);
  const row = page.getByRole("row").filter({ hasText: name });
  await expect(row.getByText("Expired")).toBeVisible();
  await expect(row.getByText("10 Jan 2025")).toBeVisible();
});
