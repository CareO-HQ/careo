import fs from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { PASSWORD, type FixtureUser, type Home } from "../db/fixtures";

interface WorldFile {
  runId: string;
  homes: { A1: Home; A2: Home; B1: Home };
  users: Record<string, FixtureUser>;
}

export function world(): WorldFile {
  return JSON.parse(fs.readFileSync(path.resolve(__dirname, ".auth/world.json"), "utf8")) as WorldFile;
}

export async function login(page: Page, key: string): Promise<void> {
  const u = world().users[key];
  await page.goto("/login");
  await fillLogin(page, u.email, PASSWORD);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

/** The form's <label>s are not associated with their inputs, so select by input type. */
export async function fillLogin(page: Page, email: string, password: string): Promise<void> {
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[name="password"], input[type="password"]').first().fill(password);
}
