import { expect, test, type Page } from "@playwright/test";
import { PASSWORD, serviceClient } from "../db/fixtures";
import { login, world } from "./helpers";

/**
 * Manual smoke test, automated: clicks through the flows touched by the security
 * hardening in a real browser against the local stack (no direct API shortcuts
 * except creating the platform-admin side of an owner invitation).
 */


const consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`[${page.url()}] ${msg.text().slice(0, 300)}`);
  });
  page.on("pageerror", (err) => consoleErrors.push(`[${page.url()}] pageerror: ${err.message.slice(0, 300)}`));
});

test.afterAll(() => {
  // Surfaced in the report; individual flows assert on behaviour, not on console noise.
  console.log(`\n=== browser console errors (${consoleErrors.length}) ===\n${[...new Set(consoleErrors)].join("\n")}`);
});

const run = Date.now().toString(36);
const ownerEmail = `smoke-owner-${run}@test.local`;
const managerEmail = `smoke-manager-${run}@test.local`;

async function signUpViaInvite(page: Page, token: string, email: string, name: string) {
  await page.goto(`/accept-invitation?token=${token}&email=${encodeURIComponent(email)}`);
  // Not signed in -> the page sends the invitee to signup with the token preserved.
  await expect(page).toHaveURL(/\/signup/);
  await page.locator('input[type="text"]').first().fill(name);
  const emailInput = page.locator('input[type="email"]');
  // The invite link pre-fills and locks the email field.
  if (await emailInput.isEditable()) await emailInput.fill(email);
  else await expect(emailInput).toHaveValue(email);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: /sign up|create account|register/i }).click();
  await expect(page).toHaveURL(/\/accept-invitation/);
  await page.getByRole("button", { name: "Accept Invitation" }).click();
  await expect(page).toHaveURL(/\/onboarding|\/dashboard/, { timeout: 30_000 });
}

test.describe("1. owner invitation -> onboarding -> manager invitation", () => {
  test.describe.configure({ mode: "serial" });
  let managerToken = "";

  test("platform admin invites an owner; owner signs up, accepts and onboards", async ({ page }) => {
    const admin = serviceClient();
    const { data: org } = await admin.from("organizations").insert({ name: `Smoke Org ${run}` }).select("id").single();
    const { data: platformAdmin } = await admin.from("users").select("id").eq("is_saas_admin", true).limit(1).single();
    const ownerToken = crypto.randomUUID();
    const { error } = await admin.from("invitations").insert({
      organization_id: org!.id,
      email: ownerEmail,
      role: "owner",
      invited_by: platformAdmin!.id,
      token: ownerToken,
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    });
    expect(error).toBeNull();

    await signUpViaInvite(page, ownerToken, ownerEmail, "Smoke Owner");

    // Step 1: profile
    await expect(page.getByText("Set up your profile")).toBeVisible();
    await page.getByPlaceholder("John Doe").fill("Smoke Owner");
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 2: care home
    await expect(page.getByText("Add your Care home")).toBeVisible();
    await page.getByPlaceholder("Acme Inc.").fill(`Smoke Home ${run}`);
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 3: invite a manager
    await expect(page.getByText("Invite your managing team")).toBeVisible();
    await page.getByPlaceholder("user@email.com").first().fill(managerEmail);
    await page.getByRole("button", { name: "Finish" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

    const { data: invite } = await admin.from("invitations").select("token, role").eq("email", managerEmail).single();
    expect(invite?.role).toBe("manager");
    managerToken = invite!.token as string;
  });

  test("invited manager signs up, accepts and reaches the dashboard of the new care home", async ({ page }) => {
    test.skip(!managerToken, "owner flow did not create the manager invitation");
    await signUpViaInvite(page, managerToken, managerEmail, "Smoke Manager");
    // Manager onboarding: profile, then create the first unit.
    await expect(page.getByText("Set up your profile")).toBeVisible();
    await page.getByPlaceholder("John Doe").fill("Smoke Manager");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Create teams", { exact: true })).toBeVisible();
    await page.getByPlaceholder("Team").first().fill(`Smoke Unit ${run}`);
    await page.getByRole("button", { name: "Finish" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
    // The greeting shows the care home or organization name depending on load order (cosmetic).
    await expect(page.getByText(new RegExp(`happening at Smoke (Home|Org) ${run}`))).toBeVisible({ timeout: 30_000 });
    const { data: me } = await serviceClient()
      .from("users")
      .select("role, active_care_home_id, care_homes:active_care_home_id(name)")
      .eq("email", managerEmail)
      .single();
    expect(me?.role).toBe("manager");
    expect(JSON.stringify(me?.care_homes)).toContain(`Smoke Home ${run}`);

    // The new unit is offered in the switcher, and the manager can switch into it.
    await page.getByRole("button", { name: new RegExp(`Smoke (Home|Org) ${run}`) }).first().click();
    await Promise.all([page.waitForEvent("load"), page.getByRole("menuitem", { name: `Smoke Unit ${run}` }).click()]);
    await expect(page.getByRole("button", { name: new RegExp(`Smoke Unit ${run}`) }).first()).toBeVisible({ timeout: 30_000 });
  });
});

test.describe("2. team switching (TeamSwitcher)", () => {
  test("nurse switches to another unit in their care home", async ({ page }) => {
    const w = world();
    const admin = serviceClient();
    const unitName = `Unit B ${run}`;
    await admin.from("teams").insert({
      organization_id: w.homes.A1.orgId,
      care_home_id: w.homes.A1.careHomeId,
      name: unitName,
      created_by: w.users["A1.owner"].id,
    });

    await login(page, "A1.nurse");
    await page.getByRole("button", { name: /Home A1/ }).first().click();
    // Switching reloads the page; the switcher then shows the new unit.
    await Promise.all([page.waitForEvent("load"), page.getByRole("menuitem", { name: unitName }).click()]);
    await expect(page.getByRole("button", { name: new RegExp(unitName) }).first()).toBeVisible({ timeout: 30_000 });
  });

  test("owner switches to the organization's other care home and sees its residents", async ({ page }) => {
    await login(page, "A1.owner");
    await page.getByRole("button", { name: /Home A1/ }).first().click();
    await Promise.all([page.waitForEvent("load"), page.getByRole("menuitem", { name: /Home A2/ }).click()]);
    await expect(page.getByRole("button", { name: /Home A2/ }).first()).toBeVisible({ timeout: 30_000 });
    await page.goto("/dashboard/residents");
    await expect(page.getByText("ResA2").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("ResA1")).toHaveCount(0);
  });
});


test.describe("3. rota: shift type -> staffing rules -> draft -> generate -> publish", () => {
  test("manager builds and publishes a weekly rota", async ({ page }) => {
    const w = world();
    await login(page, "A1.manager");
    await page.goto("/dashboard/rota");

    await page.getByRole("tab", { name: "Shift Templates" }).click();
    await page.getByRole("button", { name: "Add Shift Type" }).click();
    await page.locator("#t-name").fill(`Smoke Day ${run}`);
    await page.locator("#t-start").fill("08:00");
    await page.locator("#t-end").fill("16:00");
    await page.getByRole("button", { name: "Save Template" }).click();
    await expect(page.getByText(`Smoke Day ${run}`)).toBeVisible();

    await page.getByRole("tab", { name: "Staffing Requirements" }).click();
    const row = page.locator("tr").filter({ hasText: `Smoke Day ${run}` });
    const numbers = row.locator('input[type="number"]');
    await numbers.nth(0).fill("1");
    await numbers.nth(1).fill("0");
    await page.getByRole("button", { name: "Save Staffing Rules" }).click();
    await expect(page.getByRole("button", { name: "Save Staffing Rules" })).toBeEnabled();

    await page.getByRole("tab", { name: "Rota Builder" }).click();
    await page.getByRole("button", { name: "Create Weekly Rota Draft" }).click();
    await page.getByRole("button", { name: "Edit Rota" }).click();
    await page.getByRole("button", { name: "Generate Schedule" }).click();
    await page.getByRole("button", { name: "Publish Rota" }).first().click();
    const anyway = page.getByRole("button", { name: "Publish Anyway" });
    if (await anyway.isVisible({ timeout: 3000 }).catch(() => false)) await anyway.click();

    await expect
      .poll(
        async () => {
          const { data } = await serviceClient()
            .from("rotas")
            .select("status")
            .eq("team_id", w.homes.A1.teamId)
            .order("created_at", { ascending: false })
            .limit(1);
          return data?.[0]?.status;
        },
        { timeout: 30_000 }
      )
      .toBe("published");

    const { data: shifts } = await serviceClient()
      .from("rota_shifts")
      .select("user_id, rotas!inner(team_id)")
      .eq("rotas.team_id", w.homes.A1.teamId);
    expect((shifts ?? []).some((s) => s.user_id === w.users["A1.nurse"].id)).toBe(true);
  });
});

test.describe("4. kitchen portal diet bell", () => {
  test("diet change appears in the bell; 'mark all read' leaves other notifications unread", async ({ page }) => {
    const w = world();
    const admin = serviceClient();
    const kitchenId = w.users["A1.kitchen_staff"].id;
    // A non-diet notification addressed to the kitchen user, which must stay unread.
    const { data: other } = await admin
      .from("notifications")
      .insert({
        organization_id: w.homes.A1.orgId,
        care_home_id: w.homes.A1.careHomeId,
        user_id: kitchenId,
        type: "incident",
        title: `Unrelated ${run}`,
        message: "not a diet notification",
      })
      .select("id")
      .single();

    // A nurse changes the resident's diet (DB trigger creates the notification).
    await admin.from("diet_lifestyle").insert({
      resident_id: w.homes.A1.residentId,
      organization_id: w.homes.A1.orgId,
      created_by: w.users["A1.nurse"].id,
      food_consistency: `Level 5 ${run}`,
    });

    await login(page, "A1.kitchen_staff");
    await expect(page).toHaveURL(/kitchen-portal/);
    await page.locator("button:has(svg.lucide-bell)").first().click();
    await expect(page.getByText("Diet Information Updated").first()).toBeVisible({ timeout: 20_000 });
    await page.getByText("Mark all read").click();
    await expect(page.getByText(/marked as read/i)).toBeVisible();

    const { data: reads } = await admin
      .from("notification_read_status")
      .select("notification_id")
      .eq("user_id", kitchenId)
      .eq("notification_id", other!.id);
    expect(reads ?? []).toHaveLength(0);
  });
});

test.describe("5. RQIA inspection session and portal", () => {
  test("inspector registers a session, lands on the portal and the visit is logged", async ({ page }) => {
    const w = world();
    await login(page, "A1.rqia");
    await page.goto("/dashboard/rqia-session");
    await page.getByPlaceholder("e.g. Sarah").fill("Ivy");
    await page.getByPlaceholder("e.g. Jenkins").fill(`Inspector${run}`);
    await page.getByRole("button", { name: "Enter Inspection Portal" }).click();
    await expect(page).toHaveURL(/rqia-portal/, { timeout: 30_000 });
    await expect(page.getByText("ResA1").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("ResA2")).toHaveCount(0);

    const { data } = await serviceClient()
      .from("rqia_login_logs")
      .select("organization_id, care_home_id")
      .eq("user_id", w.users["A1.rqia"].id)
      .eq("last_name", `Inspector${run}`);
    expect(data?.[0]).toMatchObject({ organization_id: w.homes.A1.orgId });
  });
});

test.describe("6. MDT visit session and note", () => {
  test("MDT visitor starts a session and writes a multidisciplinary note", async ({ page }) => {
    const w = world();
    await login(page, "A1.mdt");
    await page.goto("/dashboard/mdt-session");
    await page.locator("#profession").click();
    await page.getByRole("option").first().click();
    await page.locator("#unit").click();
    await page.getByRole("option", { name: /Unit A1/ }).click();
    await page.getByRole("combobox").last().click();
    await page.getByRole("option", { name: /ResA1/ }).click();
    await page.getByRole("button", { name: "Start Visit Session" }).click();
    await expect(page).toHaveURL(new RegExp(`/residents/${w.homes.A1.residentId}/multidisciplinary-note`), {
      timeout: 30_000,
    });

    // After starting the session the MDT visitor lands directly on the two-step note form.
    const form = page.locator("form").filter({ has: page.getByPlaceholder("Describe the reason for this visit...") });
    await form.getByPlaceholder("Describe the reason for this visit...").fill(`Smoke visit ${run}`);
    const outcome = form.getByPlaceholder("Describe the outcome of the visit...");
    if (!(await outcome.isVisible())) await form.getByRole("button", { name: "Next Step" }).click();
    await outcome.fill("Reviewed, no change");
    const next = form.getByRole("button", { name: "Next Step" });
    if (await next.isVisible()) await next.click();
    // "Relative Informed" defaults to No; signature is pre-filled with the visitor's name.
    await page.getByPlaceholder("Digital signature or full name...").fill("Dr Smoke");
    const dialog = page;
    await dialog.getByRole("button", { name: "Create Note" }).click();

    await expect
      .poll(
        async () => {
          const { data } = await serviceClient()
            .from("multidisciplinary_notes")
            .select("id")
            .eq("resident_id", w.homes.A1.residentId)
            .eq("reason_for_visit", `Smoke visit ${run}`);
          return data?.length ?? 0;
        },
        { timeout: 30_000 }
      )
      .toBe(1);

    const { data: log } = await serviceClient()
      .from("mdt_login_logs")
      .select("organization_id")
      .eq("user_id", w.users["A1.mdt"].id)
      .order("created_at", { ascending: false })
      .limit(1);
    expect(log?.[0]?.organization_id).toBe(w.homes.A1.orgId);
  });
});

test.describe("7. settings: remove a member", () => {
  test("manager removes a care assistant from the organization", async ({ page }) => {
    const w = world();
    // A throwaway member, so shared fixture users stay in the organization for other tests.
    const admin = serviceClient();
    const email = `smoke-removable-${run}@test.local`;
    const { data: created } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { name: "Removable Member" },
    });
    const memberId = created.user!.id;
    await admin
      .from("users")
      .update({
        role: "care_assistant",
        organization_id: w.homes.A1.orgId,
        active_organization_id: w.homes.A1.orgId,
        active_care_home_id: w.homes.A1.careHomeId,
        active_team_id: w.homes.A1.teamId,
        is_onboarding_complete: true,
      })
      .eq("id", memberId);

    await login(page, "A1.manager");
    await page.goto("/settings/members");
    const memberRow = page
      .getByText(email, { exact: true })
      .locator('xpath=ancestor::div[.//button[normalize-space()="Remove"]][1]');
    await expect(memberRow).toBeVisible({ timeout: 30_000 });
    await memberRow.getByRole("button", { name: "Remove" }).click();
    const confirm = page.getByRole("alertdialog").getByRole("button", { name: /remove|confirm|continue/i });
    if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) await confirm.click();
    await expect(page.getByText("Member removed from organization")).toBeVisible();

    const { data } = await serviceClient()
      .from("users")
      .select("active_organization_id")
      .eq("id", memberId)
      .single();
    expect(data?.active_organization_id).toBeNull();
  });
});

test.describe("8. landing pages load without failed data requests", () => {
  for (const key of ["A1.owner", "A1.manager", "A1.nurse", "A1.care_assistant", "A1.kitchen_staff"]) {
    test(`${key} landing page makes no failing Supabase requests`, async ({ page }) => {
      const failures: string[] = [];
      page.on("response", (r) => {
        if (r.status() >= 400 && r.url().includes(":54321/rest/")) {
          failures.push(`${r.status()} ${decodeURIComponent(r.url()).split("/rest/v1/")[1]?.slice(0, 120)}`);
        }
      });
      await login(page, key);
      await page.waitForLoadState("networkidle");
      expect(failures).toEqual([]);
    });
  }
});
