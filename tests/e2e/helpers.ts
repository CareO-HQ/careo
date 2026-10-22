import fs from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { authenticator } from "otplib";
import { requiresMfa } from "@/lib/mfa";
import type { UserRole } from "@/lib/permissions";
import {
  PASSWORD,
  createAuthUser,
  enrollTotp,
  placeUser,
  serviceClient,
  type FixtureUser,
  type Home,
} from "../db/fixtures";

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
  if (u.totpSecret) await passTwoFactor(page, u.totpSecret);
  await expect(page).toHaveURL(/\/dashboard/);
}

/** The form's <label>s are not associated with their inputs, so select by input type. */
export async function fillLogin(page: Page, email: string, password: string): Promise<void> {
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[name="password"], input[type="password"]').first().fill(password);
}

/** The single input behind the 6-slot OTP field. */
export function otpInput(page: Page) {
  return page.locator('input[autocomplete="one-time-code"]');
}

/**
 * On /login/two-factor, enters the current code from the authenticator secret. If the code
 * was already used in this 30s window and is refused, waits for the next one and retries.
 */
export async function passTwoFactor(page: Page, secret: string): Promise<void> {
  await expect(page).toHaveURL(/\/login\/two-factor/);
  const first = authenticator.generate(secret);
  await otpInput(page).fill(first);
  await page.getByRole("button", { name: "Verify code" }).click();
  const left = await page
    .waitForURL((url) => !url.pathname.startsWith("/login/two-factor"), { timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  if (left) return;
  await expect.poll(() => authenticator.generate(secret), { timeout: 35_000, intervals: [1000] }).not.toBe(first);
  await otpInput(page).fill(authenticator.generate(secret));
  await page.getByRole("button", { name: "Verify code" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login/two-factor"));
}

/** Completes /login/setup-authenticator through the UI; returns the new secret and backup codes. */
export async function enrolThroughUi(page: Page): Promise<{ secret: string; codes: string[] }> {
  await expect(page).toHaveURL(/\/login\/setup-authenticator/);
  const secret = (await page.getByTestId("totp-secret").textContent())?.trim() ?? "";
  expect(secret).toMatch(/^[A-Z2-7]+=*$/);
  await otpInput(page).fill(authenticator.generate(secret));
  await page.getByRole("button", { name: "Verify and continue" }).click();

  const codeItems = page.getByTestId("backup-code");
  await expect(codeItems).toHaveCount(10);
  const codes = (await codeItems.allTextContents()).map((c) => c.trim());
  const continueButton = page.getByRole("button", { name: "Continue" });
  await expect(continueButton).toBeDisabled();
  await page.getByLabel("I have saved these codes").click();
  await continueButton.click();
  return { secret, codes };
}

export interface TestUser {
  id: string;
  email: string;
  totpSecret?: string;
}

/** Creates a one-off user in a fixture home. Delete it with deleteTestUser when done. */
export async function createTestUser(
  homeKey: keyof WorldFile["homes"],
  role: UserRole,
  { enrollMfa = true }: { enrollMfa?: boolean } = {}
): Promise<TestUser> {
  const admin = serviceClient();
  const email = `e2e-${role.replace(/_/g, "-")}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@test.local`;
  const id = await createAuthUser(admin, email);
  await placeUser(admin, id, role, world().homes[homeKey]);
  const totpSecret = enrollMfa && requiresMfa(role) ? await enrollTotp(admin, id, email) : undefined;
  return { id, email, totpSecret };
}

export async function deleteTestUser(user: TestUser | undefined): Promise<void> {
  if (user) await serviceClient().auth.admin.deleteUser(user.id).catch(() => undefined);
}
