import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { buildWorld, type World } from "./fixtures";
import { DB_URL } from "./seed";

let w: World;
let sql: postgres.Sql;

beforeAll(async () => {
  w = await buildWorld();
  sql = postgres(DB_URL, { max: 1, onnotice: () => undefined });
}, 300_000);

afterAll(async () => {
  await sql?.end();
  await w?.cleanup();
});

async function dietNotificationCount(residentId: string): Promise<number> {
  const [r] = await sql<{ n: number }[]>`
    select count(*)::int as n from notifications
    where type = 'diet_change' and metadata->>'residentId' = ${residentId}`;
  return r.n;
}

describe("diet change notification trigger", () => {
  it("creates one notification when diet info is added", async () => {
    const { residentId, orgId } = w.homes.A1;
    const before = await dietNotificationCount(residentId);
    await sql`insert into diet_lifestyle (resident_id, organization_id, created_by, food_consistency)
              values (${residentId}, ${orgId}, ${w.users["A1.nurse"].id}, 'Level 7 - Regular')`;
    expect(await dietNotificationCount(residentId)).toBe(before + 1);
  });

  it("notification is scoped to the resident's care home and team", async () => {
    const [n] = await sql<{ care_home_id: string; team_id: string }[]>`
      select care_home_id::text, team_id::text from notifications
      where type = 'diet_change' and metadata->>'residentId' = ${w.homes.A1.residentId}
      order by created_at desc limit 1`;
    expect(n).toEqual({ care_home_id: w.homes.A1.careHomeId, team_id: w.homes.A1.teamId });
  });

  it("BUG: an update that changes no diet field still broadcasts a 'Diet Information Updated' notification", async () => {
    const { residentId } = w.homes.A1;
    const before = await dietNotificationCount(residentId);
    // Same values written back (what the resident edit form does on every save).
    await sql`update diet_lifestyle set allergies = allergies, food_consistency = food_consistency
              where resident_id = ${residentId}`;
    expect(await dietNotificationCount(residentId)).toBe(before);
  });

  it("BUG: diet notifications from care home A2 are not visible to A1 kitchen staff", async () => {
    const { residentId, orgId } = w.homes.A2;
    await sql`insert into diet_lifestyle (resident_id, organization_id, created_by, food_consistency)
              values (${residentId}, ${orgId}, ${w.users["A2.nurse"].id}, 'Level 4 - Pureed')`;
    const kitchen = await w.as("A1.kitchen_staff");
    const { data } = await kitchen
      .from("notifications")
      .select("id")
      .eq("type", "diet_change")
      .eq("care_home_id", w.homes.A2.careHomeId);
    expect(data ?? []).toEqual([]);
  });

  it("diet notifications of another organization are not visible", async () => {
    const { residentId, orgId } = w.homes.B1;
    await sql`insert into diet_lifestyle (resident_id, organization_id, created_by)
              values (${residentId}, ${orgId}, ${w.users["B1.nurse"].id})`;
    const kitchen = await w.as("A1.kitchen_staff");
    const { data } = await kitchen.from("notifications").select("id").eq("organization_id", orgId);
    expect(data ?? []).toEqual([]);
  });
});
