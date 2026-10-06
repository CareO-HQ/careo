import { expect, test, type Page } from "@playwright/test";
import { fillLogin, login, world } from "./helpers";
import { PASSWORD } from "../db/fixtures";

async function sidebarLinks(page: Page): Promise<string[]> {
  await page.waitForLoadState("networkidle");
  const hrefs = await page.locator('[data-sidebar="sidebar"] a[href^="/dashboard"]').evaluateAll((as) =>
    as.map((a) => a.getAttribute("href") ?? "")
  );
  return [...new Set(hrefs)].sort();
}

test.describe("authentication", () => {
  test("anonymous visit to dashboard redirects to login with redirectedFrom", async ({ page }) => {
    await page.goto("/dashboard/residents");
    await expect(page).toHaveURL(/\/login\?redirectedFrom=%2Fdashboard%2Fresidents/);
  });

  test("wrong password shows an error and stays on login", async ({ page }) => {
    await page.goto("/login");
    await fillLogin(page, world().users["A1.nurse"].email, "wrong-password-1");
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page.getByText(/invalid/i).first()).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("client-side validation rejects a short password", async ({ page }) => {
    await page.goto("/login");
    await fillLogin(page, "someone@example.com", "short");
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("BUG (a11y): login form labels are associated with their inputs", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible({ timeout: 5_000 });
  });

  test("nurse can log in and reach the dashboard", async ({ page }) => {
    await login(page, "A1.nurse");
    await expect(page.getByRole("link", { name: /residents/i }).first()).toBeVisible();
  });

  test("BUG: anonymous visitor is not redirected away from /settings pages", async ({ page }) => {
    await page.goto("/settings/members");
    await expect(page).toHaveURL(/\/login/);
  });

  test("deactivated RQIA account is turned away by the login form", async ({ page, browser }) => {
    const w = world();
    const key = "A1.rqia";
    const { serviceClient } = await import("../db/fixtures");
    const admin = serviceClient();
    await admin.from("users").update({ is_login_allowed: false }).eq("id", w.users[key].id);
    try {
      await page.goto("/login");
      await fillLogin(page, w.users[key].email, PASSWORD);
      await page.getByRole("button", { name: "Login" }).click();
      await expect(page.getByText(/deactivated/i)).toBeVisible();
      await expect(page).toHaveURL(/\/login/);
    } finally {
      await admin.from("users").update({ is_login_allowed: true }).eq("id", w.users[key].id);
    }
    void browser;
  });
});

test.describe("role-based navigation", () => {
  test("care assistant sidebar hides staff, audit and incidents", async ({ page }) => {
    await login(page, "A1.care_assistant");
    const links = await sidebarLinks(page);
    expect(links).toContain("/dashboard/residents");
    expect(links).not.toContain("/dashboard/staff");
    expect(links).not.toContain("/dashboard/incidents");
    expect(links.some((l) => l.includes("audit"))).toBe(false);
  });

  test("manager sidebar shows staff and rota", async ({ page }) => {
    await login(page, "A1.manager");
    const links = await sidebarLinks(page);
    expect(links).toEqual(expect.arrayContaining(["/dashboard/staff", "/dashboard/rota", "/dashboard/residents"]));
  });

  test("kitchen staff are redirected to the kitchen portal on direct URL entry", async ({ page }) => {
    await login(page, "A1.kitchen_staff");
    await page.goto("/dashboard/residents");
    await expect(page).toHaveURL(/\/dashboard\/kitchen-portal/);
  });

  test("BUG (code review #7): kitchen staff can reach blocked pages via browser back navigation", async ({ page }) => {
    await login(page, "A1.kitchen_staff");
    await page.goto("/dashboard/residents");
    await expect(page).toHaveURL(/\/dashboard\/kitchen-portal/);
    await page.goBack(); // client-side popstate back to /dashboard/residents
    await page.waitForTimeout(3000);
    expect(new URL(page.url()).pathname).toBe("/dashboard/kitchen-portal");
  });

  test("nurse cannot open another organization's resident page", async ({ page }) => {
    await login(page, "A1.nurse");
    const B1 = world().homes.B1;
    await page.goto(`/dashboard/residents/${B1.residentId}`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(`ResB1`)).toHaveCount(0);
  });

  test("nurse residents list shows only own care home", async ({ page }) => {
    await login(page, "A1.nurse");
    await page.goto("/dashboard/residents");
    const runId = world().runId;
    await expect(page.getByText(`ResA1`).first()).toBeVisible();
    await expect(page.getByText(`ResA2`)).toHaveCount(0);
    await expect(page.getByText(`ResB1`)).toHaveCount(0);
    void runId;
  });
});
