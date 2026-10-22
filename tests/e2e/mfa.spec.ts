import { expect, test, type Browser, type Page } from "@playwright/test";
import { authenticator } from "otplib";
import { PASSWORD } from "../db/fixtures";
import {
  createTestUser,
  deleteTestUser,
  enrolThroughUi,
  fillLogin,
  login,
  otpInput,
  passTwoFactor,
  world,
  type TestUser,
} from "./helpers";
import { expectToast } from "./resident-helpers";

/**
 * Authenticator-app (TOTP) login: first-time setup, code entry, backup codes, device
 * replacement and manager reset. Codes are generated from the secret with otplib.
 */

const created: TestUser[] = [];
async function newUser(...args: Parameters<typeof createTestUser>): Promise<TestUser> {
  const user = await createTestUser(...args);
  created.push(user);
  return user;
}
test.afterAll(async () => {
  for (const user of created) await deleteTestUser(user);
});

async function submitPassword(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await fillLogin(page, email, PASSWORD);
  await page.getByRole("button", { name: "Login" }).click();
}

async function signOut(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.evaluate(() => window.localStorage.clear()).catch(() => undefined);
}

test.describe("first-time setup", () => {
  test("a user without an authenticator is made to set one up, then signs in with codes", async ({ page }) => {
    const user = await newUser("A1", "care_assistant", { enrollMfa: false });
    await submitPassword(page, user.email);
    const { secret, codes } = await enrolThroughUi(page);
    expect(new Set(codes).size).toBe(10);
    await expect(page).toHaveURL(/\/dashboard/);

    await signOut(page);
    await submitPassword(page, user.email);
    await passTwoFactor(page, secret);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("kitchen staff must set up an authenticator and land on the kitchen portal", async ({ page }) => {
    const user = await newUser("A1", "kitchen_staff", { enrollMfa: false });
    await submitPassword(page, user.email);
    await enrolThroughUi(page);
    await expect(page).toHaveURL(/\/dashboard\/kitchen-portal/);
  });
});

test.describe("code entry", () => {
  test("a wrong code is refused and the right one lets the user in", async ({ page }) => {
    const u = world().users["A1.nurse"];
    await submitPassword(page, u.email);
    await expect(page).toHaveURL(/\/login\/two-factor/);
    const wrong = authenticator.generate(u.totpSecret!) === "000000" ? "111111" : "000000";
    await otpInput(page).fill(wrong);
    await page.getByRole("button", { name: "Verify code" }).click();
    await expectToast(page, /didn't match/);
    await expect(page).toHaveURL(/\/login\/two-factor/);
    await passTwoFactor(page, u.totpSecret!);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("after the password step, protected pages redirect back to the code page", async ({ page }) => {
    const u = world().users["A1.manager"];
    await submitPassword(page, u.email);
    await expect(page).toHaveURL(/\/login\/two-factor/);
    for (const path of ["/dashboard", "/dashboard/residents", "/settings/security"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login\/two-factor/);
    }
  });

  test("returns to the page the user originally asked for", async ({ page }) => {
    const u = world().users["A1.nurse"];
    await submitPassword(page, u.email);
    await expect(page).toHaveURL(/\/login\/two-factor/);
    await page.goto("/dashboard/residents");
    await passTwoFactor(page, u.totpSecret!);
    await expect(page).toHaveURL(/\/dashboard\/residents$/);
  });
});

test.describe("exempt roles", () => {
  for (const key of ["A1.agency_care_assistant", "A1.agency_nurse", "A1.mdt", "A1.rqia"]) {
    test(`${key} signs in without an authenticator`, async ({ page }) => {
      const u = world().users[key];
      expect(u.totpSecret).toBeUndefined();
      await submitPassword(page, u.email);
      await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 60_000 });
      await expect(page).toHaveURL(/\/dashboard/);
    });
  }
});

test.describe("backup codes", () => {
  test("lost device: a backup code removes the old authenticator and the user sets up a new one", async ({ page }) => {
    const user = await newUser("A1", "nurse", { enrollMfa: false });
    await submitPassword(page, user.email);
    const first = await enrolThroughUi(page);
    await signOut(page);

    await submitPassword(page, user.email);
    await expect(page).toHaveURL(/\/login\/two-factor/);
    await page.getByRole("button", { name: "Use a backup code instead" }).click();
    await page.getByLabel("Backup code").fill(first.codes[0].toUpperCase());
    await page.getByRole("button", { name: "Use backup code" }).click();
    await expectToast(page, /Backup code accepted/);
    await expect(page).toHaveURL(/\/login$/);

    await submitPassword(page, user.email);
    const second = await enrolThroughUi(page);
    await expect(page).toHaveURL(/\/dashboard/);
    expect(second.secret).not.toBe(first.secret);
    expect(second.codes).not.toContain(first.codes[1]);

    // The old backup codes went with the old authenticator.
    await signOut(page);
    await submitPassword(page, user.email);
    await page.getByRole("button", { name: "Use a backup code instead" }).click();
    await page.getByLabel("Backup code").fill(first.codes[1]);
    await page.getByRole("button", { name: "Use backup code" }).click();
    await expectToast(page, /not valid/);
    await expect(page).toHaveURL(/\/login\/two-factor/);
  });

  test("a wrong backup code is refused", async ({ page }) => {
    const u = world().users["A1.care_assistant"];
    await submitPassword(page, u.email);
    await page.getByRole("button", { name: "Use a backup code instead" }).click();
    await page.getByLabel("Backup code").fill("aaaaa-aaaaa");
    await page.getByRole("button", { name: "Use backup code" }).click();
    await expectToast(page, /not valid/);
    await expect(page).toHaveURL(/\/login\/two-factor/);
  });

  test("regenerating backup codes replaces the old set", async ({ page }) => {
    const user = await newUser("A1", "nurse", { enrollMfa: false });
    await submitPassword(page, user.email);
    const { secret, codes: oldCodes } = await enrolThroughUi(page);

    await page.goto("/settings/security");
    await expect(page.getByTestId("backup-code-status")).toHaveText("10 of 10 remaining");
    await page.getByRole("button", { name: "Regenerate" }).click();
    await page.getByRole("button", { name: "Create new codes" }).click();
    const dialog = page.getByRole("dialog", { name: "Your new backup codes" });
    await expect(dialog.getByTestId("backup-code")).toHaveCount(10);
    const newCodes = (await dialog.getByTestId("backup-code").allTextContents()).map((c) => c.trim());
    expect(newCodes).not.toContain(oldCodes[0]);
    await dialog.getByLabel("I have saved these codes").click();
    await dialog.getByRole("button", { name: "Done" }).click();
    await expect(page.getByTestId("backup-code-status")).toHaveText("10 of 10 remaining");

    await signOut(page);
    await submitPassword(page, user.email);
    await page.getByRole("button", { name: "Use a backup code instead" }).click();
    await page.getByLabel("Backup code").fill(oldCodes[0]);
    await page.getByRole("button", { name: "Use backup code" }).click();
    await expectToast(page, /not valid/);
    // The authenticator itself still works.
    await page.getByRole("button", { name: "Use the authenticator app instead" }).click();
    await passTwoFactor(page, secret);
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe("settings", () => {
  test("replace device: the new authenticator works and the old one stops working", async ({ page }) => {
    const user = await newUser("A1", "nurse");
    await submitPassword(page, user.email);
    await passTwoFactor(page, user.totpSecret!);

    await page.goto("/settings/security");
    await page.getByRole("button", { name: "Replace device" }).click();
    const dialog = page.getByRole("dialog", { name: "Move your authenticator to a new device" });
    const newSecret = (await dialog.getByTestId("totp-secret").textContent())?.trim() ?? "";
    expect(newSecret).not.toBe(user.totpSecret);
    await dialog.locator('input[autocomplete="one-time-code"]').fill(authenticator.generate(newSecret));
    await dialog.getByRole("button", { name: "Verify and continue" }).click();
    await expectToast(page, /moved to your new device/);

    await signOut(page);
    await submitPassword(page, user.email);
    await expect(page).toHaveURL(/\/login\/two-factor/);
    await otpInput(page).fill(authenticator.generate(user.totpSecret!));
    await page.getByRole("button", { name: "Verify code" }).click();
    await expectToast(page, /didn't match/);
    await passTwoFactor(page, newSecret);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("exempt roles do not see the authenticator settings", async ({ page }) => {
    await login(page, "A1.agency_nurse");
    await page.goto("/settings/security");
    await expect(page.getByText("Authenticator app")).toHaveCount(0);
  });
});

test.describe("manager reset", () => {
  async function signedInPage(browser: Browser, user: TestUser): Promise<Page> {
    const context = await browser.newContext();
    const page = await context.newPage();
    await submitPassword(page, user.email);
    await passTwoFactor(page, user.totpSecret!);
    await expect(page).toHaveURL(/\/dashboard/);
    return page;
  }

  test("a manager resets a care assistant, who is signed out and must set up a new authenticator", async ({
    page,
    browser,
  }) => {
    const staff = await newUser("A1", "care_assistant");
    const staffPage = await signedInPage(browser, staff);

    await login(page, "A1.manager");
    await page.goto("/settings/members");
    await page.getByRole("button", { name: `Actions for ${staff.email}` }).click();
    await page.getByRole("menuitem", { name: "Reset authenticator" }).click();
    await page.getByRole("button", { name: "Reset authenticator" }).click();
    await expectToast(page, /will set up a new authenticator/);

    // Their signed-in browser loses its session.
    await staffPage.goto("/dashboard");
    await expect(staffPage).toHaveURL(/\/login/);
    await staffPage.context().close();

    // Next login goes to setup.
    await signOut(page);
    await submitPassword(page, staff.email);
    await expect(page).toHaveURL(/\/login\/setup-authenticator/);
  });

  test("a manager is not offered a reset for the owner or for exempt staff", async ({ page }) => {
    const w = world();
    await login(page, "A1.manager");
    await page.goto("/settings/members");
    for (const key of ["A1.owner", "A1.agency_nurse"]) {
      const actions = page.getByRole("button", { name: `Actions for ${w.users[key].email}` });
      if ((await actions.count()) === 0) continue;
      await actions.click();
      await expect(page.getByRole("menuitem", { name: "Reset authenticator" })).toHaveCount(0);
      await page.keyboard.press("Escape");
    }
  });
});
