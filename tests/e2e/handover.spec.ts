import { expect, test, type Page } from "@playwright/test";
import { formatInTimeZone } from "date-fns-tz";
import { getCurrentShift } from "@/lib/config/shift-config";
import { login, world } from "./helpers";
import { createResident, db, expectToast, waitForRows } from "./resident-helpers";

/**
 * Handover sheet: per-resident shift notes autosave, and "Save Handover" archives the
 * shift into handover_reports (listed under All Handovers) and clears the live notes.
 */

test.use({ timezoneId: "Europe/London" });

interface CommentRow {
  id: string;
  comment: string;
  shift: string;
  date: string;
  created_by: string;
}

const ukToday = () => formatInTimeZone(new Date(), "Europe/London", "yyyy-MM-dd");

function notesFor(page: Page, residentName: string) {
  return page.getByRole("row").filter({ hasText: residentName }).getByPlaceholder("Shift notes…");
}

async function openHandover(page: Page) {
  await page.goto("/dashboard/handover");
  await expect(page.getByText("Loading residents…")).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Day Shift", exact: true })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await login(page, "A1.nurse");
});

test("a shift note autosaves for the resident, shift and UK date", async ({ page }) => {
  const r = await createResident("HoNote");
  await openHandover(page);
  await notesFor(page, r.fullName).fill("Settled day, ate well, family visited.");

  const [row] = await waitForRows<CommentRow>(() => db().from("handover_comments").select("*").eq("resident_id", r.id));
  expect(row).toMatchObject({
    comment: "Settled day, ate well, family visited.",
    date: ukToday(),
    shift: getCurrentShift(),
    created_by: world().users["A1.nurse"].id,
  });

  // The note is still there after a reload.
  await openHandover(page);
  await expect(notesFor(page, r.fullName)).toHaveValue("Settled day, ate well, family visited.");
});

test("BUG: switching to the other shift does not carry over or overwrite this shift's note", async ({ page }) => {
  const r = await createResident("HoShift");
  await openHandover(page);
  const current = getCurrentShift();
  const other = current === "day" ? "Night Shift" : "Day Shift";
  await notesFor(page, r.fullName).fill("Note for the current shift only.");
  await waitForRows(() => db().from("handover_comments").select("id").eq("resident_id", r.id));

  await page.getByRole("button", { name: other, exact: true }).click();
  await expect(notesFor(page, r.fullName)).toHaveValue("");

  // Typing on the other shift creates that shift's note and leaves the first one alone.
  await notesFor(page, r.fullName).fill("Other shift note.");
  await waitForRows(() => db().from("handover_comments").select("id").eq("resident_id", r.id), 2);
  const { data } = await db().from("handover_comments").select("shift, comment").eq("resident_id", r.id).order("shift");
  expect(data).toEqual(
    expect.arrayContaining([
      { shift: current, comment: "Note for the current shift only." },
      { shift: current === "day" ? "night" : "day", comment: "Other shift note." },
    ])
  );
});

test("Save Handover archives the shift with its notes and clears the live sheet", async ({ page }) => {
  const r = await createResident("HoSave");
  const w = world();
  page.on("dialog", (d) => d.accept()); // overwrite confirmation if another run saved this shift
  await openHandover(page);
  await notesFor(page, r.fullName).fill("Handover note to archive.");
  await waitForRows(() => db().from("handover_comments").select("id").eq("resident_id", r.id));

  await page.getByRole("button", { name: "Save Handover" }).click();
  const dialog = page.getByRole("dialog", { name: "Save Handover Report" });
  await dialog.getByRole("button", { name: "Save Handover" }).click();
  await expectToast(page, "Handover saved successfully!");
  await page.waitForURL(/\/dashboard\/handover\/documents/);

  const [report] = await waitForRows<{
    id: string;
    date: string;
    shift: string;
    organization_id: string;
    created_by: string;
    handover_data: { residentHandovers: { residentId: string; comments: string }[] };
  }>(() =>
    db().from("handover_reports").select("*").eq("team_id", w.homes.A1.teamId).eq("date", ukToday()).eq("shift", getCurrentShift())
  );
  expect(report).toMatchObject({ organization_id: w.homes.A1.orgId, created_by: w.users["A1.nurse"].id });
  expect(report.handover_data.residentHandovers.find((h) => h.residentId === r.id)?.comments).toBe("Handover note to archive.");

  // Live notes for that shift are cleared once archived.
  expect((await db().from("handover_comments").select("id").eq("resident_id", r.id)).data).toEqual([]);

  // The archived report opens from All Handovers.
  await page.goto(`/dashboard/handover/documents/${report.id}`);
  await expect(page.getByText(r.fullName).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Handover note to archive.")).toBeVisible();
});

test("BUG: saving the same shift twice overwrites the report instead of duplicating it", async ({ page }) => {
  const w = world();
  page.on("dialog", (d) => d.accept());
  const reports = () =>
    db().from("handover_reports").select("id").eq("team_id", w.homes.A1.teamId).eq("date", ukToday()).eq("shift", getCurrentShift());
  // Duplicates left behind by the old behaviour are replaced as well.
  const legacy = { date: ukToday(), shift: getCurrentShift(), team_id: w.homes.A1.teamId, organization_id: w.homes.A1.orgId, handover_data: {}, created_by: w.users["A1.nurse"].id };
  await db().from("handover_reports").insert([legacy, legacy]);
  for (let i = 0; i < 2; i++) {
    await openHandover(page);
    await page.getByRole("button", { name: "Save Handover" }).click();
    await page.getByRole("dialog", { name: "Save Handover Report" }).getByRole("button", { name: "Save Handover" }).click();
    await expectToast(page, "Handover saved successfully!");
    await page.waitForURL(/\/dashboard\/handover\/documents/);
  }
  expect((await reports()).data).toHaveLength(1);
});

test("a handover from another organisation cannot be opened", async ({ page }) => {
  const w = world();
  const { data: foreign, error } = await db()
    .from("handover_reports")
    .insert({
      date: "2026-01-01",
      shift: "day",
      team_id: w.homes.B1.teamId,
      organization_id: w.homes.B1.orgId,
      handover_data: { teamName: "Unit B1", residentHandovers: [{ residentId: w.homes.B1.residentId, residentName: "Secret Resident", comments: "Org B only" }] },
      created_by: w.users["B1.nurse"].id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await page.goto(`/dashboard/handover/documents/${foreign!.id}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Org B only")).toHaveCount(0);
  await expect(page.getByText("Secret Resident")).toHaveCount(0);
});
