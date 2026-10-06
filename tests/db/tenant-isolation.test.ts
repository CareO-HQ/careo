import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import type { SupabaseClient } from "@supabase/supabase-js";
import { anonClient, buildWorld, type World } from "./fixtures";
import { DB_URL, seedTenantRows, type SeedResult } from "./seed";

/**
 * Generic RLS sweep: one row is seeded into every tenant-scoped table for
 * care home B1 (other organization) and A2 (same organization, other home).
 * Every role in A1 then tries to read / update / delete those rows.
 */

const A1_VIEWERS = [
  "A1.manager",
  "A1.nurse",
  "A1.care_assistant",
  "A1.agency_nurse",
  "A1.mdt",
  "A1.rqia",
  "A1.kitchen_staff",
];
const A1_ALL = ["A1.owner", ...A1_VIEWERS];

let w: World;
let sql: postgres.Sql;
let otherOrg: SeedResult;
let otherHome: SeedResult;
const clients = new Map<string, SupabaseClient>();
/** Tables whose rows carry a care-home level scope (resident, care home or team). */
const homeScoped = new Set<string>();
/** Organization-wide by design (shared templates). */
const ORG_WIDE = new Set([
  "audit_templates",
  "audit_care_file_templates",
  "audit_clinical_templates",
  "audit_environment_templates",
  "audit_governance_templates",
  "audit_resident_templates",
]);

beforeAll(async () => {
  w = await buildWorld();
  sql = postgres(DB_URL, { max: 1, onnotice: () => undefined });
  otherOrg = await seedTenantRows(sql, w.homes.B1, w.users["B1.owner"].id);
  otherHome = await seedTenantRows(sql, w.homes.A2, w.users["A2.manager"].id);
  const rows = await sql<{ table_name: string }[]>`
    select distinct table_name from information_schema.columns
    where table_schema = 'public' and column_name in ('resident_id', 'care_home_id', 'team_id')`;
  for (const r of rows) homeScoped.add(r.table_name);
  for (const k of A1_ALL) clients.set(k, await w.as(k));
  clients.set("anon", anonClient());
}, 300_000);

afterAll(async () => {
  await sql?.end();
  await w?.cleanup();
});

async function visibleTo(client: SupabaseClient, table: string, id: string): Promise<boolean> {
  const { data } = await client.from(table).select("id").eq("id", id);
  return (data?.length ?? 0) > 0;
}

describe("seeding coverage", () => {
  it("seeds most tenant-scoped tables (lists those it could not)", () => {
    // Informational: skipped tables are not covered by the sweep below.
    console.info(
      `seeded ${otherOrg.seeded.size} tables; skipped ${otherOrg.skipped.size}:\n` +
        [...otherOrg.skipped].map(([t, why]) => `  - ${t}: ${why}`).join("\n")
    );
    expect(otherOrg.seeded.size).toBeGreaterThan(60);
  });
});

describe("cross-organization isolation (org A users vs org B rows)", () => {
  it("residents of org B are invisible to every org A role and to anon", async () => {
    const leaks: string[] = [];
    for (const k of [...A1_ALL, "anon"]) {
      if (await visibleTo(clients.get(k)!, "residents", w.homes.B1.residentId)) leaks.push(k);
    }
    expect(leaks).toEqual([]);
  });

  it("positive control: A1 owner and nurse can see their own resident", async () => {
    expect(await visibleTo(clients.get("A1.owner")!, "residents", w.homes.A1.residentId)).toBe(true);
    expect(await visibleTo(clients.get("A1.nurse")!, "residents", w.homes.A1.residentId)).toBe(true);
  });

  it("users of org B are invisible to org A staff", async () => {
    const leaks: string[] = [];
    for (const k of [...A1_ALL, "anon"]) {
      if (await visibleTo(clients.get(k)!, "users", w.users["B1.nurse"].id)) leaks.push(k);
    }
    expect(leaks).toEqual([]);
  });

  it("CRITICAL BUG: every seeded table: no org A role (or anon) can SELECT org B's row", async () => {
    const leaks: string[] = [];
    for (const [table, id] of otherOrg.seeded) {
      for (const k of [...A1_ALL, "anon"]) {
        if (await visibleTo(clients.get(k)!, table, id)) leaks.push(`${table} <- ${k}`);
      }
    }
    expect(leaks).toEqual([]);
  });

  it("CRITICAL BUG: every seeded table: no org A role can UPDATE org B's row", async () => {
    const leaks: string[] = [];
    for (const [table, id] of otherOrg.seeded) {
      for (const k of A1_ALL) {
        const { data } = await clients.get(k)!.from(table).update({ id }).eq("id", id).select("id");
        if ((data?.length ?? 0) > 0) leaks.push(`${table} <- ${k}`);
      }
    }
    expect(leaks).toEqual([]);
  });

  it("CRITICAL BUG: every seeded table: no org A role can DELETE org B's row", async () => {
    const leaks: string[] = [];
    for (const [table, id] of otherOrg.seeded) {
      for (const k of A1_ALL) {
        const { data } = await clients.get(k)!.from(table).delete().eq("id", id).select("id");
        if ((data?.length ?? 0) > 0) leaks.push(`${table} <- ${k}`);
      }
    }
    expect(leaks).toEqual([]);
  });
});

describe("cross-care-home isolation inside one organization (A1 staff vs A2 rows)", () => {
  it("positive control: org owner can see the other care home's resident", async () => {
    expect(await visibleTo(clients.get("A1.owner")!, "residents", w.homes.A2.residentId)).toBe(true);
  });

  it("A2 resident is invisible to non-owner A1 roles", async () => {
    const leaks: string[] = [];
    for (const k of A1_VIEWERS) {
      if (await visibleTo(clients.get(k)!, "residents", w.homes.A2.residentId)) leaks.push(k);
    }
    expect(leaks).toEqual([]);
  });

  // Tables with only an organization column are organization-level records by design.
  it("BUG: every care-home scoped table: non-owner A1 roles cannot SELECT A2 rows", async () => {
    const leaks: string[] = [];
    for (const [table, id] of otherHome.seeded) {
      if (!homeScoped.has(table) || ORG_WIDE.has(table)) continue;
      for (const k of A1_VIEWERS) {
        if (await visibleTo(clients.get(k)!, table, id)) leaks.push(`${table} <- ${k}`);
      }
    }
    expect(leaks).toEqual([]);
  });
});
