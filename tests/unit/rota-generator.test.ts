import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateWeeklyRota } from "@/lib/rota-generator";

interface Template {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  hours: number;
}
interface Requirement {
  shift_template_id: string;
  nurses_required: number;
  care_assistants_required: number;
}
interface StaffUser {
  id: string;
  name: string;
  role: string;
  contracted_weekly_hours?: number;
  max_weekly_hours?: number;
  preferred_shift_id?: string;
  preferred_working_days?: string[];
  availability_rules?: Array<{ day: string; unavailable?: boolean }>;
  is_onboarding_complete: boolean;
}
interface Leave {
  user_id: string;
  start_date: string;
  end_date: string;
}
interface MockData {
  templates?: Template[];
  requirements?: Requirement[];
  teamStaff?: Array<{ user_id: string }>;
  users?: StaffUser[];
  leaves?: Leave[];
  prevShifts?: Array<{ user_id: string; shift_template_id: string }>;
}
type Filter = [method: string, column: string, value: unknown];

/** Minimal thenable query-builder mock that records the filters applied per table. */
function mockSupabase(data: MockData) {
  const filters: Record<string, Filter[]> = {};
  const rows: Record<string, unknown[]> = {
    shift_templates: data.templates ?? [],
    shift_staffing_requirements: data.requirements ?? [],
    team_staff: data.teamStaff ?? [],
    users: data.users ?? [],
    leave_requests: data.leaves ?? [],
    rota_shifts: data.prevShifts ?? [],
  };
  const client = {
    from(table: string) {
      filters[table] = [];
      const chain = {
        select: (cols?: string) => (filters[table].push(["select", "*", cols ?? ""]), chain),
        eq: (c: string, v: unknown) => (filters[table].push(["eq", c, v]), chain),
        in: (c: string, v: unknown) => (filters[table].push(["in", c, v]), chain),
        gte: (c: string, v: unknown) => (filters[table].push(["gte", c, v]), chain),
        lte: (c: string, v: unknown) => (filters[table].push(["lte", c, v]), chain),
        then: (resolve: (r: { data: unknown[]; error: null }) => unknown) =>
          Promise.resolve({ data: rows[table] ?? [], error: null }).then(resolve),
      };
      return chain;
    },
  };
  return { client: client as unknown as SupabaseClient, filters };
}

const WEEK = { teamId: "team-1", startDate: "2026-06-29", endDate: "2026-07-05" };
const day: Template = { id: "t-day", name: "Day", start_time: "08:00:00", end_time: "20:00:00", hours: 12 };
const night: Template = { id: "t-night", name: "Night", start_time: "20:00:00", end_time: "08:00:00", hours: 12 };
const eight: Template = { id: "t8", name: "Early", start_time: "08:00:00", end_time: "16:00:00", hours: 8 };
const nurse = (id: string, extra: Partial<StaffUser> = {}): StaffUser => ({
  id,
  name: id,
  role: "nurse",
  contracted_weekly_hours: 40,
  is_onboarding_complete: true,
  ...extra,
});
const req = (t: Template, nurses = 1, cas = 0): Requirement => ({
  shift_template_id: t.id,
  nurses_required: nurses,
  care_assistants_required: cas,
});

async function run(data: MockData) {
  const { client, filters } = mockSupabase(data);
  const slots = await generateWeeklyRota(client, WEEK);
  return { slots, filters };
}

describe("rota generator: eligibility", () => {
  it("never assigns agency staff", async () => {
    const { slots } = await run({
      templates: [eight],
      requirements: [req(eight)],
      teamStaff: [{ user_id: "perm" }, { user_id: "agency" }],
      users: [nurse("perm"), nurse("agency", { role: "agency_nurse" })],
    });
    expect(slots.filter((s) => s.assignedTo).length).toBe(5);
    expect(slots.every((s) => s.assignedTo !== "agency")).toBe(true);
  });

  it("throws when no permanent staff are assigned to the team", async () => {
    await expect(run({ templates: [eight], requirements: [req(eight)], teamStaff: [] })).rejects.toThrow(/No active staff/);
  });

  it("only fills nurse slots with nurses and CA slots with care assistants", async () => {
    const { slots } = await run({
      templates: [eight],
      requirements: [req(eight, 1, 1)],
      teamStaff: [{ user_id: "n" }, { user_id: "c" }],
      users: [nurse("n"), nurse("c", { role: "care_assistant" })],
    });
    for (const s of slots.filter((x) => x.assignedTo)) {
      expect(s.assignedTo).toBe(s.role === "nurse" ? "n" : "c");
    }
  });

  it("skips staff on approved leave for those dates", async () => {
    const { slots } = await run({
      templates: [eight],
      requirements: [req(eight)],
      teamStaff: [{ user_id: "n" }],
      users: [nurse("n")],
      leaves: [{ user_id: "n", start_date: "2026-06-30", end_date: "2026-07-01" }],
    });
    const assignedDates = slots.filter((s) => s.assignedTo === "n").map((s) => s.date);
    expect(assignedDates).not.toContain("2026-06-30");
    expect(assignedDates).not.toContain("2026-07-01");
  });

  it("respects weekday unavailability rules", async () => {
    const { slots } = await run({
      templates: [eight],
      requirements: [req(eight)],
      teamStaff: [{ user_id: "n" }],
      users: [nurse("n", { availability_rules: [{ day: "Monday", unavailable: true }] })],
    });
    expect(slots.find((s) => s.date === "2026-06-29")?.assignedTo).toBeNull();
  });
});

describe("rota generator: hours and safety limits", () => {
  it("stops assigning once contracted hours are met (may exceed by one shift)", async () => {
    const { slots } = await run({
      templates: [day],
      requirements: [req(day)],
      teamStaff: [{ user_id: "n" }],
      users: [nurse("n")],
    });
    expect(slots.filter((s) => s.assignedTo === "n").length).toBe(4); // 48h for a 40h contract
  });

  it("zero-hour contracts are capped by max_weekly_hours", async () => {
    const { slots } = await run({
      templates: [eight],
      requirements: [req(eight)],
      teamStaff: [{ user_id: "n" }],
      users: [nurse("n", { contracted_weekly_hours: 0, max_weekly_hours: 16 })],
    });
    expect(slots.filter((s) => s.assignedTo === "n").length).toBe(2);
  });

  it("never exceeds 6 consecutive days", async () => {
    const { slots } = await run({
      templates: [eight],
      requirements: [req(eight)],
      teamStaff: [{ user_id: "n" }],
      users: [nurse("n", { contracted_weekly_hours: 0, max_weekly_hours: 100 })],
    });
    expect(slots.filter((s) => s.assignedTo === "n").length).toBeLessThanOrEqual(6);
  });

  it("does not double-book simultaneous shifts", async () => {
    const twin: Template = { ...eight, id: "t8b" };
    const { slots } = await run({
      templates: [eight, twin],
      requirements: [req(eight), req(twin)],
      teamStaff: [{ user_id: "n" }],
      users: [nurse("n")],
    });
    const perDay = new Map<string, number>();
    for (const s of slots.filter((x) => x.assignedTo === "n")) perDay.set(s.date, (perDay.get(s.date) ?? 0) + 1);
    expect(Math.max(...perDay.values())).toBe(1);
  });

  it("detects overlap of an overnight shift with the next morning's day shift", async () => {
    const early: Template = { id: "t-early", name: "Early", start_time: "07:00:00", end_time: "15:00:00", hours: 8 };
    const { slots } = await run({
      templates: [night, early],
      requirements: [req(night), req(early)],
      teamStaff: [{ user_id: "n" }],
      users: [nurse("n", { contracted_weekly_hours: 0, max_weekly_hours: 200 })],
    });
    const mine = slots.filter((s) => s.assignedTo === "n");
    for (const s of mine.filter((x) => x.template.id === "t-early")) {
      const prev = new Date(new Date(s.date).getTime() - 86_400_000).toISOString().slice(0, 10);
      expect(mine.some((x) => x.template.id === "t-night" && x.date === prev)).toBe(false);
    }
  });

  it("allows back-to-back day+night shifts (product decision: no minimum rest rule)", async () => {
    const { slots } = await run({
      templates: [day, night],
      requirements: [req(day), req(night)],
      teamStaff: [{ user_id: "n" }],
      users: [nurse("n", { contracted_weekly_hours: 0, max_weekly_hours: 200 })],
    });
    const monday = slots.filter((s) => s.date === "2026-06-29" && s.assignedTo === "n");
    expect(monday.length).toBe(2);
  });
});

describe("rota generator: preferences and queries", () => {
  it("strict preferred shifts", async () => {
    const { slots } = await run({
      templates: [eight, night],
      requirements: [req(eight), req(night)],
      teamStaff: [{ user_id: "a" }, { user_id: "b" }],
      users: [nurse("a", { preferred_shift_id: "t8" }), nurse("b", { preferred_shift_id: "t-night" })],
    });
    expect(slots.filter((s) => s.template.id === "t8" && s.assignedTo === "b")).toHaveLength(0);
    expect(slots.filter((s) => s.template.id === "t-night" && s.assignedTo === "a")).toHaveLength(0);
  });

  it("only queries onboarded staff of the given team", async () => {
    const { filters } = await run({
      templates: [eight],
      requirements: [req(eight)],
      teamStaff: [{ user_id: "n" }],
      users: [nurse("n")],
    });
    expect(filters.team_staff).toContainEqual(["eq", "team_id", "team-1"]);
    expect(filters.users).toContainEqual(["eq", "is_onboarding_complete", true]);
    expect(filters.leave_requests).toContainEqual(["eq", "status", "approved"]);
  });

  it("previous-week continuity query inner-joins rotas so it is limited to this team and week", async () => {
    const { filters } = await run({
      templates: [eight],
      requirements: [req(eight)],
      teamStaff: [{ user_id: "n" }],
      users: [nurse("n")],
    });
    const select = filters.rota_shifts.find(([m]) => m === "select")?.[2] as string;
    expect(select).toMatch(/rotas!inner\(/);
    expect(filters.rota_shifts).toContainEqual(["eq", "rotas.team_id", "team-1"]);
  });
});
