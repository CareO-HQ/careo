import { expect, test } from "@playwright/test";
import { serviceClient } from "../db/fixtures";
import { login, world } from "./helpers";
import { expectToast } from "./resident-helpers";

/**
 * Settings: care home details (owner-only edit) and personal profile.
 */

test.use({ timezoneId: "Europe/London" });

test("owner renames the care home", async ({ page }) => {
  const w = world();
  const admin = serviceClient();
  const { data: before } = await admin.from("care_homes").select("name").eq("id", w.homes.A1.careHomeId).single();
  const newName = `Home A1 renamed ${Date.now()}`;
  try {
    await login(page, "A1.owner");
    await page.goto("/settings/care-home");
    await page.getByLabel("Care home name").fill(newName);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expectToast(page, "Care home updated successfully");
    const { data: after } = await admin.from("care_homes").select("name").eq("id", w.homes.A1.careHomeId).single();
    expect(after?.name).toBe(newName);
  } finally {
    await admin.from("care_homes").update({ name: before?.name }).eq("id", w.homes.A1.careHomeId);
  }
});

test("manager sees the care home details read-only", async ({ page }) => {
  await login(page, "A1.manager");
  await page.goto("/settings/care-home");
  await expect(page.getByLabel("Care home name")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save changes" })).toBeDisabled();
});

test("staff member updates their own name", async ({ page }) => {
  const w = world();
  const admin = serviceClient();
  const user = w.users["A1.care_assistant"];
  const { data: before } = await admin.from("users").select("name").eq("id", user.id).single();
  const newName = `Carer ${Date.now()}`;
  try {
    await login(page, "A1.care_assistant");
    await page.goto("/settings/profile");
    await page.getByRole("textbox", { name: "Name" }).fill(newName);
    await page.getByRole("button", { name: "Save", exact: true }).first().click();
    await expectToast(page, "User updated successfully");
    const { data: after } = await admin.from("users").select("name").eq("id", user.id).single();
    expect(after?.name).toBe(newName);
  } finally {
    await admin.from("users").update({ name: before?.name }).eq("id", user.id);
  }
});
