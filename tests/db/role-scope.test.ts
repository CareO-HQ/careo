import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { anonClient, buildWorld, PASSWORD, type World } from "./fixtures";
import { DB_URL, seedTenantRows, type SeedResult } from "./seed";

/**
 * Role scoping inside the user's own care home (A1). External / non-clinical roles
 * should not see or change clinical records, mirroring lib/permissions.ts.
 */

const CLINICAL = [
  "medications",
  "medication_rounds",
  "prn_protocols",
  "blood_monitoring_records",
  "vitals",
  "progress_notes",
  "clinical_notes",
  "dnacprs",
  "capacity_consents",
  "best_interest_decisions",
  "hospital_passports",
  "personal_profiles",
  "continence_entries",
  "wounds",
  "incidents",
];

let w: World;
let sql: postgres.Sql;
let own: SeedResult;

beforeAll(async () => {
  w = await buildWorld();
  sql = postgres(DB_URL, { max: 1, onnotice: () => undefined });
  own = await seedTenantRows(sql, w.homes.A1, w.users["A1.manager"].id);
}, 300_000);

afterAll(async () => {
  await sql?.end();
  await w?.cleanup();
});

async function readable(key: string, tables: string[]): Promise<string[]> {
  const c = await w.as(key);
  const out: string[] = [];
  for (const t of tables) {
    const id = own.seeded.get(t);
    if (!id) continue;
    const { data } = await c.from(t).select("id").eq("id", id);
    if ((data?.length ?? 0) > 0) out.push(t);
  }
  return out;
}

async function writable(key: string, tables: string[]): Promise<string[]> {
  const c = await w.as(key);
  const out: string[] = [];
  for (const t of tables) {
    const id = own.seeded.get(t);
    if (!id) continue;
    const { data } = await c.from(t).update({ id }).eq("id", id).select("id");
    if ((data?.length ?? 0) > 0) out.push(t);
  }
  return out;
}

describe("clinical data scoping within the same care home", () => {
  it("positive control: nurse can read clinical tables", async () => {
    expect((await readable("A1.nurse", ["medications", "vitals", "progress_notes"])).length).toBeGreaterThan(0);
  });

  it("BUG: kitchen staff cannot read clinical records (medications, DNACPR, notes...)", async () => {
    expect(await readable("A1.kitchen_staff", CLINICAL)).toEqual([]);
  });

  // RQIA inspectors and MDT visitors were deliberately granted read access to clinical
  // records (migrations 20260722160000-20260728140000); the portals depend on it.
  it("regression: RQIA and MDT can still read clinical records for their portals", async () => {
    for (const key of ["A1.rqia", "A1.mdt"]) {
      const visible = await readable(key, ["medications", "progress_notes", "incidents", "wounds"]);
      expect({ key, visible: visible.length }).toEqual({ key, visible: 4 });
    }
  });

  it.each(["A1.kitchen_staff", "A1.mdt", "A1.rqia"])("BUG: %s cannot modify clinical records", async (key) => {
    expect(await writable(key, CLINICAL)).toEqual([]);
  });

  // Care assistants administer topical medication (topical-medication page is care-assistant only).
  it("regression: care assistants can still record medication rounds", async () => {
    expect(await writable("A1.care_assistant", ["medication_rounds"])).toEqual(["medication_rounds"]);
  });

  it("regression: kitchen staff still read diet data and notifications for the kitchen portal", async () => {
    expect(await readable("A1.kitchen_staff", ["diet_lifestyle", "notifications", "menu_items"])).toEqual(
      ["diet_lifestyle", "notifications", "menu_items"].filter((t) => own.seeded.has(t))
    );
    const kitchen = await w.as("A1.kitchen_staff");
    const { data } = await kitchen.from("residents").select("id").eq("id", w.homes.A1.residentId);
    expect(data ?? []).toHaveLength(1);
  });

  it("regression: MDT visitors can still write multidisciplinary notes", async () => {
    expect(await writable("A1.mdt", ["multidisciplinary_notes"])).toEqual(
      own.seeded.has("multidisciplinary_notes") ? ["multidisciplinary_notes"] : []
    );
  });
});

describe("login logs of external visitors (code-review finding #5)", () => {
  it.each(["rqia_login_logs", "mdt_login_logs"])("BUG: %s of another organization are hidden from nurses/managers", async (table) => {
    const B1 = w.homes.B1;
    const visitor = w.users[table === "rqia_login_logs" ? "B1.rqia" : "B1.mdt"].id;
    const base = { user_id: visitor, organization_id: B1.orgId, care_home_id: B1.careHomeId, full_name: "Visitor" };
    const [row] = await sql<{ id: string }[]>`
      insert into ${sql(table)} ${sql(
        table === "rqia_login_logs" ? { ...base, first_name: "In", last_name: "Spector" } : { ...base, profession: "GP" }
      )} returning id::text as id`;
    const leaks: string[] = [];
    for (const k of ["A1.manager", "A1.nurse", "A1.owner"]) {
      const { data } = await (await w.as(k)).from(table).select("id").eq("id", row.id);
      if ((data?.length ?? 0) > 0) leaks.push(k);
    }
    expect(leaks).toEqual([]);
    // Positive control: staff of the visited care home still see the log.
    const { data: own } = await (await w.as("B1.nurse")).from(table).select("id").eq("id", row.id);
    expect(own ?? []).toHaveLength(1);
  });
});

describe("deactivated external accounts (is_login_allowed = false)", () => {
  it.each(["mdt", "rqia"] as const)(
    "BUG: a deactivated %s account with a valid session can no longer read residents",
    async (role) => {
      const { user } = await w.freshUser("A1", role);
      await w.admin.from("users").update({ is_login_allowed: false }).eq("id", user.id);
      const c = anonClient();
      await c.auth.signInWithPassword({ email: user.email, password: PASSWORD });
      const { data } = await c.from("residents").select("id").eq("id", w.homes.A1.residentId);
      expect(data?.length ?? 0).toBe(0);
    }
  );
});

describe("rota self-approval", () => {
  it("BUG: a nurse cannot self-approve as 'manager approved nurse' to gain rota management", async () => {
    const { client, user } = await w.freshUser("A1", "nurse");
    await client.from("users").update({ is_manager_approved_nurse: true }).eq("id", user.id);
    const { data } = await w.admin.from("users").select("is_manager_approved_nurse").eq("id", user.id).single();
    expect(data?.is_manager_approved_nurse).not.toBe(true);
  });

  it("BUG: a manager cannot manage rotas of another organization's team", async () => {
    const mgr = await w.as("A1.manager");
    const { data } = await mgr
      .from("rotas")
      .insert({ team_id: w.homes.B1.teamId, start_date: "2026-11-02", end_date: "2026-11-08" })
      .select("id");
    expect(data ?? []).toEqual([]);
  });
});

describe("care home settings (owner-only)", () => {
  async function rename(key: string): Promise<boolean> {
    const c = await w.as(key);
    const name = `Renamed by ${key} ${Date.now()}`;
    await c.from("care_homes").update({ name }).eq("id", w.homes.A1.careHomeId);
    const { data } = await w.admin.from("care_homes").select("name").eq("id", w.homes.A1.careHomeId).single();
    return data?.name === name;
  }

  it("positive control: the owner can rename their care home", async () => {
    expect(await rename("A1.owner")).toBe(true);
  });

  it("BUG: a manager cannot delete another care home of the organisation (and its residents)", async () => {
    const mgr = await w.as("A1.manager");
    await mgr.from("care_homes").delete().eq("id", w.homes.A2.careHomeId);
    const { data } = await w.admin.from("care_homes").select("id").eq("id", w.homes.A2.careHomeId);
    expect(data).toHaveLength(1);
  });

  // Open: managers need UPDATE on their own care home for the agency link code, so the
  // right fix (owner-only columns, or an RPC) is for the team to decide. it.fails keeps
  // this documented; it will flag once the policy is tightened.
  it.fails("BUG (open): a manager cannot create care homes", async () => {
    const mgr = await w.as("A1.manager");
    const { data } = await mgr
      .from("care_homes")
      .insert({ organization_id: w.homes.A1.orgId, name: `Rogue home ${Date.now()}`, created_by: w.users["A1.manager"].id })
      .select("id");
    expect(data ?? []).toEqual([]);
  });

  it.fails("BUG (open): a manager cannot rename the care home (settings page is owner-only)", async () => {
    expect(await rename("A1.manager")).toBe(false);
  });

  it.each(["A1.nurse", "A1.care_assistant", "A1.kitchen_staff", "A1.rqia", "B1.owner"])(
    "%s cannot rename care home A1",
    async (key) => {
      expect(await rename(key)).toBe(false);
    }
  );
});

describe("staff training records", () => {
  const record = (name: string) => ({
    user_id: w.users["A1.nurse"].id,
    organization_id: w.homes.A1.orgId,
    training_type: "online",
    name,
    provider: "Care Skills Academy",
    status: "completed",
  });
  let seededId = "";

  beforeAll(async () => {
    const { data, error } = await w.admin.from("staff_trainings").insert(record("Seeded training")).select("id").single();
    if (error || !data) throw new Error(`seed staff_trainings: ${error?.message}`);
    seededId = data.id as string;
  });

  async function canRead(key: string): Promise<boolean> {
    const c = await w.as(key);
    const { data } = await c.from("staff_trainings").select("id").eq("id", seededId);
    return (data?.length ?? 0) > 0;
  }

  it.each(["A1.manager", "A1.owner", "A1.nurse"])("%s can read the nurse's training record", async (key) => {
    expect(await canRead(key)).toBe(true);
  });

  it.each(["A1.care_assistant", "A1.kitchen_staff", "A1.mdt", "A2.manager", "A2.nurse", "B1.owner"])(
    "%s cannot read the nurse's training record",
    async (key) => {
      expect(await canRead(key)).toBe(false);
    }
  );

  it("a manager can add a record for staff in their care home; scope comes from the staff member", async () => {
    const mgr = await w.as("A1.manager");
    const { data, error } = await mgr
      .from("staff_trainings")
      .insert({ ...record("Fire safety"), organization_id: w.homes.B1.orgId })
      .select("organization_id, care_home_id, created_by")
      .single();
    expect(error).toBeNull();
    expect(data).toEqual({
      organization_id: w.homes.A1.orgId,
      care_home_id: w.homes.A1.careHomeId,
      created_by: w.users["A1.manager"].id,
    });
  });

  it.each(["A1.nurse", "A1.care_assistant", "A2.manager", "B1.owner"])("%s cannot add a record for the A1 nurse", async (key) => {
    const c = await w.as(key);
    const { data } = await c.from("staff_trainings").insert(record(`By ${key}`)).select("id");
    expect(data ?? []).toEqual([]);
  });

  it("a nurse cannot edit their own training record", async () => {
    const nurse = await w.as("A1.nurse");
    await nurse.from("staff_trainings").update({ status: "expired" }).eq("id", seededId);
    const { data } = await w.admin.from("staff_trainings").select("status").eq("id", seededId).single();
    expect(data?.status).toBe("completed");
  });
});

describe("SQL helper functions", () => {
  it("can_access_resident respects care home for staff and org for owner", async () => {
    const check = async (key: string, residentId: string) => {
      const { data } = await (await w.as(key)).rpc("can_access_resident", { target_resident_id: residentId });
      return data as boolean;
    };
    expect(await check("A1.nurse", w.homes.A1.residentId)).toBe(true);
    expect(await check("A1.nurse", w.homes.A2.residentId)).toBe(false);
    expect(await check("A1.nurse", w.homes.B1.residentId)).toBe(false);
    expect(await check("A1.owner", w.homes.A2.residentId)).toBe(true);
    expect(await check("A1.owner", w.homes.B1.residentId)).toBe(false);
  });

  it("get_user_role returns the fixture role from the JWT", async () => {
    for (const k of ["A1.nurse", "A1.kitchen_staff", "A1.rqia"]) {
      const { data } = await (await w.as(k)).rpc("get_user_role");
      expect(data).toBe(w.users[k].role);
    }
  });
});
