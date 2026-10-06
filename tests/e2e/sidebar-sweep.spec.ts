import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { PASSWORD } from "../db/fixtures";
import { fillLogin, world } from "./helpers";

/**
 * Signs in as every persona and clicks each link its sidebar actually shows (main
 * sidebar, then the settings sidebar when the persona can open settings). A page
 * fails when it crashes, logs an error, gets a failing Supabase/server-action
 * response, raises an error toast, denies access to a link the sidebar offered, or
 * renders placeholder garbage such as "undefined" or "Invalid Date".
 */

test.use({ timezoneId: "Europe/London" });

const PERSONAS = [
  "A1.owner",
  "A1.manager",
  "A1.nurse",
  "A1.care_assistant",
  "A1.agency_nurse",
  "A1.agency_care_assistant",
  "A1.kitchen_staff",
  "A1.mdt",
  "A1.rqia",
  "A1.saas_admin",
];

const OUT_DIR = path.resolve(__dirname, "../../test-results/sidebar-sweep");
const SIDEBAR = '[data-sidebar="sidebar"]';
const GARBAGE = /\bundefined\b|\bNaN\b|Invalid Date|\[object Object\]/;
// Dev-only noise, plus 406: PostgREST's "no row" answer to .single(), which pages handle.
const CONSOLE_NOISE = /Download the React DevTools|\[Fast Refresh\]|\[HMR\]|webpack-hmr|turbopack-hmr|status of 406/i;

interface PageReport {
  persona: string;
  link: string;
  landedOn: string;
  problems: string[];
}

async function signIn(page: Page, key: string): Promise<void> {
  const user = world().users[key];
  await page.goto("/login");
  await fillLogin(page, user.email, PASSWORD);
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 60_000 });
  await page.waitForLoadState("networkidle");
}

async function pickFirstOption(page: Page, triggerId: string): Promise<void> {
  const trigger = page.locator(`#${triggerId}`);
  await expect(trigger).toBeEnabled({ timeout: 30_000 });
  await trigger.click();
  await page.getByRole("option").first().click();
}

/** MDT and RQIA visitors only get their working sidebar once a visit session is registered. */
async function startVisitSession(page: Page, persona: string): Promise<void> {
  if (persona.endsWith(".mdt")) {
    await page.goto("/dashboard/mdt-session");
    await pickFirstOption(page, "profession");
    await pickFirstOption(page, "unit");
    await pickFirstOption(page, "resident");
  } else if (persona.endsWith(".rqia")) {
    await page.goto("/dashboard/rqia-session");
    await page.locator("#firstName").fill("Sweep");
    await page.locator("#lastName").fill("Inspector");
  } else {
    return;
  }
  await page.getByRole("button", { name: /Start Visit Session|Enter Inspection Portal/i }).click();
  await page.waitForURL((url) => !/\/(mdt|rqia)-session$/.test(url.pathname), { timeout: 60_000 });
  await page.waitForLoadState("networkidle");
}

async function expandSidebarGroups(page: Page): Promise<void> {
  // Collapsible group triggers only - dropdown triggers (team switcher, user menu) open
  // a modal overlay that would swallow every later click.
  const closed = page.locator(`${SIDEBAR} [aria-expanded="false"][data-state="closed"]:not([aria-haspopup])`);
  for (let i = 0; i < 10 && (await closed.count()) > 0; i++) {
    await closed.first().click({ timeout: 5_000 }).catch(() => undefined);
  }
  await page.keyboard.press("Escape");
}

async function sidebarLinks(page: Page): Promise<string[]> {
  await page.locator(SIDEBAR).first().waitFor({ timeout: 30_000 });
  await expandSidebarGroups(page);
  const hrefs = await page
    .locator(`${SIDEBAR} a[href^="/"]`)
    .evaluateAll((anchors) => anchors.map((a) => a.getAttribute("href") ?? ""));
  return [...new Set(hrefs.filter((href) => href && !href.startsWith("/login")))];
}

async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle").catch(() => undefined);
  // Toasts and late fetches land just after network idle.
  await page.waitForTimeout(1500);
}


for (const persona of PERSONAS) {
  test(`${persona}: every sidebar link works`, async ({ page }) => {
    test.setTimeout(20 * 60_000);
    // A stuck click should fail one step, not hang the whole persona.
    page.setDefaultTimeout(30_000);
    // The dev server compiles each route on first visit, which can take minutes.
    page.setDefaultNavigationTimeout(180_000);
    const reports: PageReport[] = [];
    let current: string[] = [];
    page.on("pageerror", (e) => current.push(`pageerror: ${e.message.split("\n")[0]}`));
    page.on("console", (msg) => {
      if (msg.type() !== "error" || CONSOLE_NOISE.test(msg.text())) return;
      current.push(`console.error: ${msg.text().replace(/\s+/g, " ").slice(0, 220)}`);
    });
    page.on("response", (r) => {
      const url = decodeURIComponent(r.url());
      if (url.includes(":54321/") && r.status() >= 400 && r.status() !== 406) {
        current.push(`${r.status()} ${url.split(":54321/")[1]?.slice(0, 180)}`);
      } else if (r.request().method() === "POST" && url.includes(":3100/") && r.status() >= 500) {
        current.push(`${r.status()} server action/route POST ${new URL(r.url()).pathname}`);
      }
    });

    await signIn(page, persona);
    await startVisitSession(page, persona);
    const slug = persona.replace(/\./g, "-");
    fs.mkdirSync(path.join(OUT_DIR, slug), { recursive: true });

    const visit = async (sidebarScope: string, href: string) => {
      current = [];
      const link = page.locator(`${sidebarScope} a[href="${href}"]`).first();
      if (!(await link.isVisible().catch(() => false))) await expandSidebarGroups(page);
      if (await link.isVisible().catch(() => false)) await link.click();
      else await page.goto(href);
      // Client-side navigation can wait minutes for a first compile; don't judge the old page.
      const target = href.split("?")[0];
      const arrived = await page
        .waitForURL((url) => url.pathname === target, { timeout: 180_000 })
        .then(() => true)
        .catch(() => false);
      await settle(page);

      const landedOn = new URL(page.url()).pathname;
      const problems = [...current];
      if (!arrived && !landedOn.startsWith("/login")) problems.push(`link did not open ${target}`);
      if (landedOn.startsWith("/login")) problems.push("sidebar link sent the user back to login");
      if (await page.getByText(/Access Denied|don.t have permission|not authori[sz]ed/i).count()) {
        problems.push("sidebar link opened an access-denied page");
      }
      if (await page.getByText(/Application error|Unhandled Runtime Error|Something went wrong/i).count()) {
        problems.push("error screen");
      }
      for (const toast of await page.locator('[data-sonner-toast][data-type="error"]').allInnerTexts()) {
        problems.push(`error toast: ${toast.replace(/\s+/g, " ").trim()}`);
      }
      const mainText = await page.locator("main").first().innerText().catch(() => "");
      const garbage = mainText.split("\n").find((line) => GARBAGE.test(line));
      if (garbage) problems.push(`placeholder text on page: "${garbage.trim().slice(0, 120)}"`);

      await page.screenshot({
        path: path.join(OUT_DIR, slug, `${href.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "_") || "root"}.png`),
        fullPage: true,
      });
      reports.push({ persona, link: href, landedOn, problems: [...new Set(problems)] });
    };

    const landing = new URL(page.url()).pathname;
    for (const href of await sidebarLinks(page)) {
      await test.step(href, () => visit(SIDEBAR, href));
    }

    // Settings has its own sidebar; open it the way users do when the persona may.
    await page.goto("/settings/profile");
    await settle(page);
    if (new URL(page.url()).pathname.startsWith("/settings")) {
      for (const href of (await sidebarLinks(page)).filter((h) => h.startsWith("/settings"))) {
        await test.step(href, () => visit(SIDEBAR, href));
      }
    }

    fs.writeFileSync(
      path.join(OUT_DIR, `${slug}.json`),
      JSON.stringify({ persona, landing, pages: reports }, null, 2)
    );
    const failing = reports.filter((r) => r.problems.length > 0);
    expect.soft(reports.length, "sidebar showed no links").toBeGreaterThan(0);
    expect(failing.map((r) => `${r.link} -> ${r.landedOn}: ${r.problems.join(" | ")}`)).toEqual([]);
  });
}
