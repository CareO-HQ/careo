import { expect, type Locator, type Page } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { serviceClient } from "../db/fixtures";
import { world } from "./helpers";

export interface TestResident {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
}

let admin: SupabaseClient | null = null;

/** Service-role client for arranging data and asserting what the UI persisted. */
export function db(): SupabaseClient {
  admin ??= serviceClient();
  return admin;
}

/**
 * Creates a fresh resident in care home A1 so each spec file starts from an empty
 * record (the shared fixture resident accumulates rows across specs).
 */
export async function createResident(
  label: string,
  extra: Record<string, unknown> = {},
): Promise<TestResident> {
  const w = world();
  const home = w.homes.A1;
  const firstName = `${label}${Math.random().toString(36).slice(2, 6)}`;
  const lastName = w.runId;
  const insert = () =>
    db()
      .from("residents")
      .insert({
        first_name: firstName,
        last_name: lastName,
        date_of_birth: "1938-05-17",
        organization_id: home.orgId,
        care_home_id: home.careHomeId,
        team_id: home.teamId,
        created_by: w.users["A1.manager"].id,
        room_number: "12B",
        nhs_health_number: "9434765919",
        ...extra,
      })
      .select("id")
      .single();
  // The local API gateway occasionally returns a transient "invalid upstream response".
  let { data, error } = await insert();
  if (error) ({ data, error } = await insert());
  if (error || !data)
    throw new Error(`createResident: ${error?.message ?? "no row"}`);
  return {
    id: data.id as string,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
  };
}

export async function openResidentPage(
  page: Page,
  residentId: string,
  sub = "",
): Promise<void> {
  await page.goto(`/dashboard/residents/${residentId}${sub ? `/${sub}` : ""}`);
  await expect(page.getByText("Loading resident...")).toHaveCount(0, {
    timeout: 30_000,
  });
}

/** Asserts a sonner toast containing `text` is shown. */
export async function expectToast(
  page: Page,
  text: string | RegExp,
): Promise<void> {
  await expect(
    page.locator("[data-sonner-toast]").filter({ hasText: text }).first(),
  ).toBeVisible();
}

/** Opens a Radix Select (by its trigger) and picks an option by visible name. */
export async function pickOption(
  page: Page,
  trigger: Locator,
  option: string | RegExp,
): Promise<void> {
  await trigger.click();
  await page
    .getByRole("option", { name: option, exact: typeof option === "string" })
    .click();
}

/** Collects uncaught page errors so a spec can assert the page never crashed. */
export function trackPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

/** Polls the DB until `query` returns rows (the UI writes asynchronously). */
export async function waitForRows<T>(
  query: () => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>,
  min = 1,
): Promise<T[]> {
  let rows: T[] = [];
  await expect
    .poll(
      async () => {
        const { data, error } = await query();
        if (error) throw new Error(error.message);
        rows = data ?? [];
        return rows.length;
      },
      { timeout: 15_000 },
    )
    .toBeGreaterThanOrEqual(min);
  return rows;
}
