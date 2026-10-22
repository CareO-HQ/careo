/**
 * Manual TOTP walkthrough: SaaS admin -> owner -> manager -> nurse + care assistant.
 *
 * Runs in a visible browser. Every persona gets a fresh temp-mail.org address, receives the
 * real invitation email, signs up and reaches the authenticator setup page. There the script
 * waits for YOU to scan the QR code, type the code and click "Verify and continue"; it then
 * ticks the backup-codes box, continues, and carries on with the invite chain.
 *
 * The invite chain follows the app's permissions: a SaaS admin can only invite owners, an
 * owner invites the manager (onboarding step 3), and the manager invites nurse/care assistant.
 *
 * Usage (dev server already running against the database the admin lives in):
 *   SAAS_ADMIN_EMAIL=... SAAS_ADMIN_PASSWORD=... npx tsx scripts/totp-invite-walkthrough.ts
 * Optional: CAREO_BASE_URL (default http://localhost:3000), PERSONA_PASSWORD, SLOW_MO (ms).
 *
 * If the script gets stuck it opens the Playwright Inspector: fix things in the browser by
 * hand, then press Resume (F8) and it carries on.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";

const BASE_URL = (process.env.CAREO_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const ADMIN_EMAIL = process.env.SAAS_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.SAAS_ADMIN_PASSWORD ?? "";
const PERSONA_PASSWORD = process.env.PERSONA_PASSWORD ?? "CareoTotp!2026";
const SLOW_MO = Number(process.env.SLOW_MO ?? 300);

const MINUTE = 60_000;
const HUMAN_TIMEOUT = 15 * MINUTE;
const EMAIL_TIMEOUT = 5 * MINUTE;
/** The dev server compiles each route on first visit, which can take well over 30s. */
const NAVIGATION_TIMEOUT = 3 * MINUTE;

const STAMP = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
const ORG_NAME = `TOTP Test Org ${STAMP}`;
const CARE_HOME_NAME = `TOTP Care Home ${STAMP}`;
const TEAM_NAME = "Day Team";
const OUTPUT_FILE = path.resolve("test-results", `totp-personas-${STAMP}.json`);

type PersonaRole = "owner" | "manager" | "nurse" | "care_assistant";

interface Mailbox {
  context: BrowserContext;
  page: Page;
  address: string;
}

interface Persona {
  role: PersonaRole;
  label: string;
  name: string;
  mailbox: Mailbox;
  totpSecret?: string;
  backupCodes?: string[];
  status: "pending" | "invited" | "onboarded";
}

function log(who: string, message: string): void {
  const time = new Date().toLocaleTimeString();
  console.log(`[${time}] [${who}] ${message}`);
}

function banner(message: string): void {
  const line = "=".repeat(78);
  console.log(`\n${line}\n  >>> ${message}\n${line}\n`);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function isVisible(page: Page, selector: ReturnType<Page["locator"]>): Promise<boolean> {
  return selector.first().isVisible().catch(() => false);
}

/** Stops for a human: opens the Playwright Inspector until Resume is pressed. */
async function needHelp(page: Page, who: string, message: string): Promise<void> {
  banner(`[${who}] HELP NEEDED: ${message}\n      Fix it in the browser, then press Resume (F8) in the Playwright Inspector.`);
  await page.bringToFront();
  await page.pause();
}

function savePersonas(personas: Persona[]): void {
  const data = {
    baseUrl: BASE_URL,
    organization: ORG_NAME,
    careHome: CARE_HOME_NAME,
    password: PERSONA_PASSWORD,
    personas: personas.map((p) => ({
      role: p.role,
      name: p.name,
      email: p.mailbox.address,
      status: p.status,
      totpSecret: p.totpSecret ?? null,
      backupCodes: p.backupCodes ?? [],
    })),
  };
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
}

// ---------------------------------------------------------------------------------------------
// temp-mail.org
// ---------------------------------------------------------------------------------------------

async function readTempAddress(page: Page): Promise<string> {
  const value = await page.locator("#mail").inputValue().catch(() => "");
  return value.includes("@") ? value.trim() : "";
}

async function waitForTempAddress(page: Page, who: string): Promise<string> {
  for (;;) {
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      const address = await readTempAddress(page);
      if (address) return address;
      await sleep(1000);
    }
    await needHelp(page, who, "temp-mail.org did not show an address (Cloudflare check or ad pop-up?).");
  }
}

/** Opens a new temp-mail.org mailbox in its own browser context so every persona gets a new address. */
async function openMailbox(browser: Browser, who: string, usedAddresses: Set<string>): Promise<Mailbox> {
  const context = await browser.newContext({ viewport: { width: 1100, height: 800 } });
  const page = await context.newPage();
  log(who, "Opening temp-mail.org for a fresh address...");
  await page.goto("https://temp-mail.org/en/", { waitUntil: "domcontentloaded", timeout: 90_000 });
  let address = await waitForTempAddress(page, who);

  while (usedAddresses.has(address)) {
    log(who, `Got a reused address (${address}); asking temp-mail for a new one...`);
    await page.locator("#click-to-delete").click();
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline && (await readTempAddress(page)) === address) await sleep(1000);
    address = await waitForTempAddress(page, who);
  }
  usedAddresses.add(address);
  log(who, `Mailbox ready: ${address}`);
  return { context, page, address };
}

const INVITE_LINK_PATTERN = /https?:\/\/[^\s"'<>]*accept-invitation\?token=[^\s"'<>]+/;

async function findInviteLinkOnPage(page: Page): Promise<string | null> {
  for (const frame of page.frames()) {
    const href = await frame
      .locator('a[href*="accept-invitation"]')
      .first()
      .getAttribute("href", { timeout: 500 })
      .catch(() => null);
    if (href) return href.replace(/&amp;/g, "&");
    const html = await frame.content().catch(() => "");
    const match = html.match(INVITE_LINK_PATTERN);
    if (match) return match[0].replace(/&amp;/g, "&");
  }
  return null;
}

/** Waits for the CareO invitation in the mailbox and returns its link pointed at BASE_URL. */
async function waitForInviteLink(mailbox: Mailbox, who: string): Promise<string> {
  const { page } = mailbox;
  await page.bringToFront();
  log(who, `Waiting for the invitation email at ${mailbox.address} (temp-mail refreshes every ~10s)...`);

  for (;;) {
    const deadline = Date.now() + EMAIL_TIMEOUT;
    while (Date.now() < deadline) {
      const direct = await findInviteLinkOnPage(page);
      if (direct) return toBaseUrl(direct);

      const message = page.locator('a[href*="/view/"]').filter({ hasText: /invited|CareO/i }).first();
      if (await isVisible(page, message)) {
        log(who, "Invitation email arrived, opening it...");
        await message.click();
        const linkDeadline = Date.now() + 30_000;
        while (Date.now() < linkDeadline) {
          const link = await findInviteLinkOnPage(page);
          if (link) return toBaseUrl(link);
          await sleep(1000);
        }
      }
      await sleep(3000);
    }
    await needHelp(
      page,
      who,
      `No invitation email reached ${mailbox.address} yet. Open the email in this tab if it is there, or check the dev server log for a Resend error.`
    );
  }
}

function toBaseUrl(link: string): string {
  const url = new URL(link);
  return `${BASE_URL}${url.pathname}${url.search}`;
}

// ---------------------------------------------------------------------------------------------
// CareO pages
// ---------------------------------------------------------------------------------------------

async function fillLogin(page: Page, email: string, password: string): Promise<void> {
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[name="password"], input[type="password"]').first().fill(password);
  await page.getByRole("button", { name: "Login" }).click();
}

/** Waits on the authenticator setup page for the human, then handles the backup codes step. */
async function handleAuthenticatorSetup(page: Page, who: string, persona?: Persona): Promise<void> {
  await page.bringToFront();
  const secret = (await page.getByTestId("totp-secret").textContent({ timeout: 30_000 }).catch(() => null))?.trim();
  if (persona && secret) persona.totpSecret = secret;
  banner(
    `[${who}] YOUR TURN: scan the QR code with your authenticator app, type the 6-digit code\n      and click "Verify and continue". I'll handle the backup codes after that.`
  );

  const codeItems = page.getByTestId("backup-code");
  const shown = await codeItems
    .first()
    .waitFor({ timeout: HUMAN_TIMEOUT })
    .then(() => true)
    .catch(() => false);
  if (!shown) {
    // The person may already have finished the whole page themselves.
    if (!page.url().includes("/login/setup-authenticator")) return;
    await needHelp(page, who, "Backup codes never appeared after the authenticator step.");
    return;
  }

  const codes = (await codeItems.allTextContents()).map((c) => c.trim());
  if (persona) persona.backupCodes = codes;
  log(who, `Authenticator verified. Saved ${codes.length} backup codes. Continuing...`);
  const checkbox = page.getByLabel("I have saved these codes");
  if (await isVisible(page, checkbox)) {
    if ((await checkbox.getAttribute("data-state")) !== "checked") await checkbox.click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  await page.waitForURL((url) => !url.pathname.startsWith("/login/setup-authenticator"), { timeout: HUMAN_TIMEOUT });
}

async function handleTwoFactor(page: Page, who: string): Promise<void> {
  await page.bringToFront();
  banner(`[${who}] YOUR TURN: type the current 6-digit code from your authenticator app and click "Verify code".`);
  await page.waitForURL((url) => !url.pathname.startsWith("/login/two-factor"), { timeout: HUMAN_TIMEOUT });
  log(who, "Code accepted.");
}

async function newAppPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  context.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
  context.setDefaultTimeout(NAVIGATION_TIMEOUT);
  return context.newPage();
}

async function signInSaasAdmin(browser: Browser): Promise<Page> {
  const who = "SaaS admin";
  const page = await newAppPage(browser);
  log(who, `Logging in as ${ADMIN_EMAIL} at ${BASE_URL}/login`);
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await fillLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD);

  const deadline = Date.now() + HUMAN_TIMEOUT;
  while (Date.now() < deadline) {
    await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    const { pathname } = new URL(page.url());
    if (pathname.startsWith("/login/two-factor")) await handleTwoFactor(page, who);
    else if (pathname.startsWith("/login/setup-authenticator")) await handleAuthenticatorSetup(page, who);
    else if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) {
      log(who, "Signed in.");
      return page;
    } else await sleep(1000);
  }
  await needHelp(page, who, "Could not get past login. Sign in by hand.");
  return page;
}

async function inviteOwner(adminPage: Page, owner: Persona): Promise<void> {
  const who = "SaaS admin";
  log(who, `Creating organization "${ORG_NAME}" and inviting owner ${owner.mailbox.address}`);
  await adminPage.bringToFront();
  await adminPage.goto(`${BASE_URL}/admin/owners/create`, { waitUntil: "domcontentloaded" });
  await adminPage.getByPlaceholder("John Doe").fill(owner.name);
  await adminPage.getByPlaceholder("owner@example.com").fill(owner.mailbox.address);
  await adminPage.getByPlaceholder("Sunset Organization").fill(ORG_NAME);
  await adminPage.locator('button[type="submit"]').click();
  await expectToast(adminPage, who, /invitation email has been sent/i);
  owner.status = "invited";
}

async function expectToast(page: Page, who: string, text: RegExp): Promise<void> {
  const toast = page.locator("[data-sonner-toast]").filter({ hasText: text }).first();
  const ok = await toast
    .waitFor({ timeout: 30_000 })
    .then(() => true)
    .catch(() => false);
  if (ok) {
    log(who, `OK: ${(await toast.textContent().catch(() => ""))?.trim()}`);
    return;
  }
  const others = await page.locator("[data-sonner-toast]").allTextContents().catch(() => []);
  await needHelp(page, who, `Expected a toast matching ${text}. Saw: ${others.join(" | ") || "nothing"}`);
}

async function selectOption(page: Page, trigger: ReturnType<Page["locator"]>, option: string | RegExp): Promise<void> {
  await trigger.click();
  await page.getByRole("option", { name: option }).first().click();
}

/** What a persona should do on each onboarding step that needs input from them. */
interface OnboardingPlan {
  /** Owner step 3: who to invite as manager. */
  managerEmail?: string;
}

async function handleOnboardingStep(page: Page, who: string, plan: OnboardingPlan): Promise<void> {
  const careHomeName = page.getByPlaceholder("Acme Inc.");
  const teamName = page.getByPlaceholder("Team", { exact: true });
  const inviteEmail = page.getByPlaceholder("user@email.com");
  const profileName = page.getByPlaceholder("John Doe");

  if (await isVisible(page, careHomeName)) {
    log(who, `Onboarding: creating care home "${CARE_HOME_NAME}"`);
    await careHomeName.fill(CARE_HOME_NAME);
    await page.getByRole("button", { name: "Continue" }).click();
    await careHomeName.waitFor({ state: "hidden", timeout: 60_000 }).catch(() => undefined);
  } else if (await isVisible(page, teamName)) {
    log(who, `Onboarding: creating team "${TEAM_NAME}"`);
    await teamName.first().fill(TEAM_NAME);
    await page.getByRole("button", { name: "Finish" }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 60_000 }).catch(() => undefined);
  } else if (await isVisible(page, inviteEmail)) {
    if (!plan.managerEmail) {
      await needHelp(page, who, "Unexpected invite step in onboarding.");
      return;
    }
    log(who, `Onboarding: inviting manager ${plan.managerEmail}`);
    await inviteEmail.first().fill(plan.managerEmail);
    await selectOption(page, page.getByRole("combobox").first(), "Manager");
    await page.getByRole("button", { name: "Finish" }).click();
    await expectToast(page, who, /Successfully sent 1 invitation/i);
    await page.waitForURL(/\/dashboard/, { timeout: 60_000 }).catch(() => undefined);
  } else if (await isVisible(page, profileName)) {
    log(who, "Onboarding: confirming profile");
    await page.getByRole("button", { name: "Continue" }).click();
    await profileName.waitFor({ state: "hidden", timeout: 60_000 }).catch(() => undefined);
  } else {
    await sleep(1000);
  }
}

/**
 * Takes a persona from the invitation link to the dashboard, reacting to whichever page the
 * app sends them to (signup, MFA setup, accept invitation, onboarding steps).
 */
async function onboardInvitee(browser: Browser, persona: Persona, plan: OnboardingPlan): Promise<Page> {
  const who = persona.label;
  const link = await waitForInviteLink(persona.mailbox, who);
  log(who, `Invitation link: ${link}`);

  const page = await newAppPage(browser);
  await page.goto(link, { waitUntil: "domcontentloaded" });

  let signedUp = false;
  let accepted = false;
  const deadline = Date.now() + 3 * HUMAN_TIMEOUT;
  while (Date.now() < deadline) {
    await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    const { pathname } = new URL(page.url());

    if (pathname.startsWith("/signup")) {
      if (signedUp) {
        await needHelp(page, who, "Back on signup after creating the account. Email confirmation may be switched on — confirm it from the temp-mail tab and sign in.");
        continue;
      }
      log(who, `Signing up as ${persona.name} <${persona.mailbox.address}>`);
      await page.getByPlaceholder("John Doe").fill(persona.name);
      const email = page.getByPlaceholder("email@example.com");
      if ((await email.inputValue()) !== persona.mailbox.address && (await email.isEditable())) {
        await email.fill(persona.mailbox.address);
      }
      await page.locator('input[type="password"]').first().fill(PERSONA_PASSWORD);
      await page.locator('button[type="submit"]').click();
      signedUp = true;
      await page.waitForURL((url) => !url.pathname.startsWith("/signup"), { timeout: 30_000 }).catch(() => undefined);
    } else if (pathname.startsWith("/login/setup-authenticator")) {
      await handleAuthenticatorSetup(page, who, persona);
      savePersonas(personas);
    } else if (pathname.startsWith("/login/two-factor")) {
      await handleTwoFactor(page, who);
    } else if (pathname === "/login") {
      log(who, "Signing in");
      await fillLogin(page, persona.mailbox.address, PERSONA_PASSWORD);
      await page.waitForURL((url) => url.pathname !== "/login", { timeout: 30_000 }).catch(() => undefined);
    } else if (pathname.startsWith("/accept-invitation")) {
      const button = page.getByRole("button", { name: "Accept Invitation" });
      if (!accepted && (await isVisible(page, button)) && (await button.isEnabled())) {
        log(who, "Accepting invitation");
        await button.click();
        accepted = true;
        await page.waitForURL((url) => !url.pathname.startsWith("/accept-invitation"), { timeout: 60_000 }).catch(() => undefined);
      } else await sleep(1000);
    } else if (pathname.startsWith("/onboarding")) {
      await handleOnboardingStep(page, who, plan);
    } else if (pathname.startsWith("/dashboard")) {
      persona.status = "onboarded";
      savePersonas(personas);
      log(who, `Done: reached ${pathname}`);
      return page;
    } else {
      await sleep(1000);
    }
  }
  await needHelp(page, who, "Took too long to reach the dashboard.");
  return page;
}

async function inviteStaff(managerPage: Page, persona: Persona): Promise<void> {
  const who = "Manager";
  const roleLabel = persona.role === "nurse" ? "Nurse" : "Care Assistant";
  log(who, `Inviting ${roleLabel} ${persona.mailbox.address}`);
  await managerPage.bringToFront();
  await managerPage.goto(`${BASE_URL}/settings/members`, { waitUntil: "domcontentloaded" });
  await managerPage.getByRole("button", { name: "Send invitation" }).first().click();

  const dialog = managerPage.getByRole("dialog");
  await dialog.getByPlaceholder("Email").fill(persona.mailbox.address);
  await selectOption(managerPage, dialog.getByRole("combobox").first(), roleLabel);
  const teamTrigger = dialog.getByRole("combobox").nth(1);
  await teamTrigger.waitFor({ timeout: 10_000 });
  await selectOption(managerPage, teamTrigger, TEAM_NAME);
  await dialog.getByRole("button", { name: "Send invitation" }).click();
  await expectToast(managerPage, who, /Invitation sent successfully/i);
  persona.status = "invited";
  await managerPage.waitForLoadState("domcontentloaded");
}

// ---------------------------------------------------------------------------------------------

const personas: Persona[] = [];

async function main(): Promise<void> {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Set SAAS_ADMIN_EMAIL and SAAS_ADMIN_PASSWORD.");
  }

  const browser = await chromium
    .launch({ channel: "chrome", headless: false, slowMo: SLOW_MO })
    .catch(() => chromium.launch({ headless: false, slowMo: SLOW_MO }));

  const used = new Set<string>();
  const specs: Array<{ role: PersonaRole; label: string; name: string }> = [
    { role: "owner", label: "Owner", name: "Olivia Owner" },
    { role: "manager", label: "Manager", name: "Mark Manager" },
    { role: "nurse", label: "Nurse", name: "Nina Nurse" },
    { role: "care_assistant", label: "Care assistant", name: "Carl Carer" },
  ];
  for (const spec of specs) {
    const mailbox = await openMailbox(browser, spec.label, used);
    personas.push({ ...spec, mailbox, status: "pending" });
  }
  savePersonas(personas);
  const [owner, manager, nurse, careAssistant] = personas;

  const adminPage = await signInSaasAdmin(browser);
  await inviteOwner(adminPage, owner);
  await adminPage.context().close();

  // The owner invites the manager from onboarding step 3.
  await onboardInvitee(browser, owner, { managerEmail: manager.mailbox.address });
  manager.status = "invited";
  savePersonas(personas);

  // The manager creates a team during onboarding, then invites the nurse and care assistant.
  const managerPage = await onboardInvitee(browser, manager, {});
  await inviteStaff(managerPage, nurse);
  await inviteStaff(managerPage, careAssistant);

  await onboardInvitee(browser, nurse, {});
  await onboardInvitee(browser, careAssistant, {});

  savePersonas(personas);
  banner(`All four personas are set up. Details (emails, password, TOTP secrets, backup codes):\n      ${OUTPUT_FILE}\n      Close the browser when you are finished looking around.`);
  await new Promise<void>((resolve) => browser.on("disconnected", () => resolve()));
}

main().catch((error: unknown) => {
  if (personas.length) savePersonas(personas);
  console.error(error);
  process.exitCode = 1;
});
