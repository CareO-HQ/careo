import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MFA_EXEMPT_ROLES } from "@/lib/mfa";
import postgres from "postgres";
import { completeTotp, PASSWORD, anonClient, buildWorld, type World } from "./fixtures";
import { DB_URL } from "./seed";

/**
 * Authenticator-app MFA enforcement (migration 20261014120000_mfa_enforcement.sql and
 * app/actions/mfa.ts). A password-only session is "aal1"; completing TOTP makes it "aal2".
 *
 * Server actions read the session through the mocked cookie client below, which forwards to
 * a real signed-in supabase-js client, so the aal claim and role are the genuine ones.
 */

const current = { client: null as SupabaseClient | null };

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@supabase/auth-helpers-nextjs", () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () =>
        current.client ? current.client.auth.getUser() : { data: { user: null }, error: null },
      getSession: async () =>
        current.client ? current.client.auth.getSession() : { data: { session: null }, error: null },
    },
  }),
}));

interface SentEmail {
  to: string[];
  subject: string;
}
const sent: SentEmail[] = [];
vi.mock("@/lib/resend", () => ({
  default: { emails: { send: async (e: SentEmail) => (sent.push(e), { data: { id: "x" }, error: null }) } },
}));

const mfa = await import("@/app/actions/mfa");

let w: World;

beforeAll(async () => {
  w = await buildWorld();
}, 300_000);
afterAll(async () => {
  await w?.cleanup();
});
beforeEach(() => {
  current.client = null;
  sent.length = 0;
});

async function residentRows(client: SupabaseClient, residentId: string): Promise<number> {
  const { data } = await client.from("residents").select("id").eq("id", residentId);
  return data?.length ?? 0;
}

async function factorCount(userId: string): Promise<number> {
  const { data } = await w.admin.auth.admin.mfa.listFactors({ userId });
  return data?.factors.length ?? 0;
}

async function events(userId: string, type: string): Promise<number> {
  const { count } = await w.admin
    .from("mfa_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", type);
  return count ?? 0;
}

async function signInPasswordOnly(email: string): Promise<SupabaseClient> {
  const c = anonClient();
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(error.message);
  return c;
}

describe("RLS: tenant data needs a completed MFA step", () => {
  it("a password-only (aal1) nurse cannot read their own home's resident", async () => {
    const c = await w.passwordOnly("A1.nurse");
    expect(await residentRows(c, w.homes.A1.residentId)).toBe(0);
  });

  it("the same nurse can read it after entering a TOTP code (aal2)", async () => {
    const c = await w.as("A1.nurse");
    expect(await residentRows(c, w.homes.A1.residentId)).toBe(1);
  });

  it("aal1 cannot write tenant data", async () => {
    const c = await w.passwordOnly("A1.manager");
    const { data } = await c
      .from("residents")
      .update({ first_name: "Hacked" })
      .eq("id", w.homes.A1.residentId)
      .select("id");
    expect(data ?? []).toHaveLength(0);
    const { data: row } = await w.admin.from("residents").select("first_name").eq("id", w.homes.A1.residentId).single();
    expect(row?.first_name).not.toBe("Hacked");
  });

  it("aal1 can read only its own users row (needed by the login form)", async () => {
    const c = await w.passwordOnly("A1.nurse");
    const { data: own } = await c.from("users").select("id, role").eq("id", w.users["A1.nurse"].id);
    expect(own).toHaveLength(1);
    const { data: others } = await c.from("users").select("id").eq("id", w.users["A1.manager"].id);
    expect(others ?? []).toHaveLength(0);
  });

  it("aal1 cannot update its own users row", async () => {
    const c = await w.passwordOnly("A1.care_assistant");
    const { data } = await c.from("users").update({ name: "aal1 edit" }).eq("id", w.users["A1.care_assistant"].id).select("id");
    expect(data ?? []).toHaveLength(0);
  });

  it.each(["A1.mdt", "A1.rqia", "A1.agency_nurse", "A1.agency_care_assistant"])(
    "exempt role %s keeps its access without MFA",
    async (key) => {
      const c = await w.passwordOnly(key);
      const { data: session } = await c.auth.getSession();
      expect(session.session?.user.app_metadata.role).toBe(w.users[key].role);
      // Same result as a fully signed-in client of that role: MFA adds no restriction.
      const full = await w.as(key);
      expect(await residentRows(c, w.homes.A1.residentId)).toBe(await residentRows(full, w.homes.A1.residentId));
    }
  );

  it("aal1 cannot list storage objects", async () => {
    const c = await w.passwordOnly("A1.manager");
    const { data } = await c.storage.from("resident-files").list();
    expect(data ?? []).toHaveLength(0);
  });

  it("guarded RPCs refuse aal1 sessions", async () => {
    const c = await w.passwordOnly("A1.nurse");
    const { error } = await c.rpc("get_paginated_daily_care_dates", {
      p_resident_id: w.homes.A1.residentId,
      p_limit: 10,
      p_offset: 0,
    });
    expect(error?.message ?? "").toMatch(/mfa_required/);
  });
});

describe("schema guards (fail when a later migration forgets MFA)", () => {
  let sql: postgres.Sql;
  beforeAll(() => {
    sql = postgres(DB_URL, { max: 1 });
  });
  afterAll(async () => {
    await sql?.end();
  });

  it("every RLS-enabled public table has an MFA policy", async () => {
    const missing = await sql<{ name: string }[]>`
      select c.relname as name
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity
        and not exists (
          select 1 from pg_policies p
          where p.schemaname = 'public' and p.tablename = c.relname and p.policyname like 'zz_mfa_required%'
        )
      order by 1`;
    expect(missing.map((r) => r.name)).toEqual([]);
  });

  it("guarded RPC wrappers still call assert_mfa_satisfied()", async () => {
    const rows = await sql<{ name: string; guarded: boolean }[]>`
      select replace(p.proname, '_mfa_impl_', '') as name,
             coalesce(w.prosrc like '%assert_mfa_satisfied%', false) as guarded
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
      left join pg_proc w on w.pronamespace = p.pronamespace and w.proname = replace(p.proname, '_mfa_impl_', '')
      where starts_with(p.proname, '_mfa_impl_')`;
    expect(rows.length).toBeGreaterThanOrEqual(10);
    expect(rows.filter((r) => !r.guarded).map((r) => r.name)).toEqual([]);
  });

  it("the SQL exempt-role list matches lib/mfa.ts", async () => {
    const [fn] = await sql<{ src: string }[]>`select prosrc as src from pg_proc where proname = 'mfa_satisfied'`;
    const sqlRoles = [...fn.src.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).filter((r) => r !== "aal" && r !== "aal2");
    expect(sqlRoles.sort()).toEqual([...MFA_EXEMPT_ROLES].sort());
  });
});

describe("mfa_backup_codes is never visible to clients", () => {
  it("an aal2 user cannot read, insert or delete backup codes", async () => {
    const { user, client } = await w.freshUser("A1", "nurse");
    current.client = client;
    const created = await mfa.createBackupCodes("enrolment");
    expect(created.success).toBe(true);

    const { data: read } = await client.from("mfa_backup_codes").select("*");
    expect(read ?? []).toHaveLength(0);
    const { error: insertError } = await client
      .from("mfa_backup_codes")
      .insert({ user_id: user.id, code_hash: "x" });
    expect(insertError).not.toBeNull();
    await client.from("mfa_backup_codes").delete().eq("user_id", user.id);
    const { count } = await w.admin
      .from("mfa_backup_codes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    expect(count).toBe(10);
  });
});

describe("createBackupCodes", () => {
  it("is refused on a password-only session", async () => {
    current.client = await w.passwordOnly("A1.care_assistant");
    const res = await mfa.createBackupCodes("enrolment");
    expect(res.success).toBe(false);
  });

  it("returns 10 unique codes, stores only hashes and replaces the previous set", async () => {
    const { user, client } = await w.freshUser("A1", "care_assistant");
    current.client = client;
    const first = await mfa.createBackupCodes("enrolment");
    const second = await mfa.createBackupCodes("regenerate");
    if (!first.success || !second.success) throw new Error("expected codes");
    expect(new Set(second.codes).size).toBe(10);

    const { data } = await w.admin.from("mfa_backup_codes").select("code_hash").eq("user_id", user.id);
    expect(data).toHaveLength(10);
    const stored = (data ?? []).map((r) => r.code_hash as string);
    for (const code of [...first.codes, ...second.codes]) expect(stored).not.toContain(code);
    expect(await events(user.id, "backup_codes_regenerated")).toBe(1);
  });

  it("is refused for an MFA-exempt role", async () => {
    current.client = await w.as("A1.agency_nurse");
    expect((await mfa.createBackupCodes("enrolment")).success).toBe(false);
  });
});

describe("redeemBackupCode (lost authenticator)", () => {
  async function userWithCodes() {
    const fresh = await w.freshUser("A1", "nurse");
    current.client = fresh.client;
    const res = await mfa.createBackupCodes("enrolment");
    if (!res.success) throw new Error(res.error);
    // Redemption happens before the TOTP step, on a password-only session.
    current.client = await signInPasswordOnly(fresh.user.email);
    return { ...fresh, codes: res.codes };
  }

  it("a valid code removes the authenticator and all codes, logs it and emails the user", async () => {
    const { user, codes } = await userWithCodes();
    expect(await factorCount(user.id)).toBe(1);

    const res = await mfa.redeemBackupCode(codes[3].toUpperCase());
    expect(res).toEqual({ success: true });
    expect(await factorCount(user.id)).toBe(0);
    const { count } = await w.admin
      .from("mfa_backup_codes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    expect(count).toBe(0);
    expect(await events(user.id, "backup_code_used")).toBe(1);
    expect(sent.map((e) => e.to[0])).toEqual([user.email]);
  });

  it("a code can be used only once, even by two simultaneous requests", async () => {
    const { codes } = await userWithCodes();
    const results = await Promise.all([mfa.redeemBackupCode(codes[0]), mfa.redeemBackupCode(codes[0])]);
    expect(results.filter((r) => r.success)).toHaveLength(1);
  });

  it("a used code is rejected afterwards", async () => {
    const { user, codes } = await userWithCodes();
    await mfa.redeemBackupCode(codes[0]);
    // The user signs in again (new password session) and tries the same code.
    current.client = await signInPasswordOnly(user.email);
    expect((await mfa.redeemBackupCode(codes[0])).success).toBe(false);
  });

  it("a wrong code fails and is recorded; the 6th attempt in 15 minutes is refused even with a valid code", async () => {
    const { user, codes } = await userWithCodes();
    for (let i = 0; i < 5; i++) {
      const res = await mfa.redeemBackupCode("aaaaa-aaaaa");
      expect(res.success).toBe(false);
    }
    expect(await events(user.id, "backup_code_failed")).toBe(5);
    const blocked = await mfa.redeemBackupCode(codes[0]);
    expect(blocked).toMatchObject({ success: false, error: expect.stringMatching(/Too many attempts/) });
    expect(await factorCount(user.id)).toBe(1);
  });

  it("is refused for anonymous callers", async () => {
    current.client = null;
    expect((await mfa.redeemBackupCode("aaaaa-aaaaa")).success).toBe(false);
  });

  it("is refused for exempt roles", async () => {
    current.client = await w.passwordOnly("A1.mdt");
    expect((await mfa.redeemBackupCode("aaaaa-aaaaa")).success).toBe(false);
  });
});

describe("resetUserMfa (manager reset)", () => {
  it("a manager resets a nurse in their care home: factor and codes removed, event logged", async () => {
    const { user, client } = await w.freshUser("A1", "nurse");
    current.client = client;
    await mfa.createBackupCodes("enrolment");

    current.client = await w.as("A1.manager");
    expect(await mfa.resetUserMfa(user.id)).toEqual({ success: true });
    expect(await factorCount(user.id)).toBe(0);
    const { count } = await w.admin
      .from("mfa_backup_codes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    expect(count).toBe(0);
    const { data: event } = await w.admin
      .from("mfa_events")
      .select("actor_id, care_home_id")
      .eq("user_id", user.id)
      .eq("event_type", "manager_reset")
      .single();
    expect(event).toEqual({ actor_id: w.users["A1.manager"].id, care_home_id: w.homes.A1.careHomeId });
  });

  it("the reset user's existing session can no longer refresh", async () => {
    const { user, client } = await w.freshUser("A1", "care_assistant");
    current.client = await w.as("A1.manager");
    await mfa.resetUserMfa(user.id);
    const { error } = await client.auth.refreshSession();
    expect(error).not.toBeNull();
  });

  it("an owner can reset a manager", async () => {
    const { user } = await w.freshUser("A1", "manager");
    current.client = await w.as("A1.owner");
    expect((await mfa.resetUserMfa(user.id)).success).toBe(true);
  });

  it.each([
    ["a manager of another care home", "A2.manager", "A1"],
    ["a manager of another organization", "B1.owner", "A1"],
  ] as const)("refuses %s", async (_label, actorKey, homeKey) => {
    const { user } = await w.freshUser(homeKey, "nurse");
    current.client = await w.as(actorKey);
    expect((await mfa.resetUserMfa(user.id)).success).toBe(false);
    expect(await factorCount(user.id)).toBe(1);
  });

  it("refuses a manager resetting an owner", async () => {
    current.client = await w.as("A1.manager");
    expect((await mfa.resetUserMfa(w.users["A1.owner"].id)).success).toBe(false);
  });

  it("refuses self-reset", async () => {
    current.client = await w.as("A1.manager");
    expect((await mfa.resetUserMfa(w.users["A1.manager"].id)).success).toBe(false);
  });

  it("refuses a care assistant", async () => {
    const { user } = await w.freshUser("A1", "nurse");
    current.client = await w.as("A1.care_assistant");
    expect((await mfa.resetUserMfa(user.id)).success).toBe(false);
  });

  it("refuses a manager whose own session has not completed MFA", async () => {
    const { user } = await w.freshUser("A1", "nurse");
    current.client = await w.passwordOnly("A1.manager");
    expect((await mfa.resetUserMfa(user.id)).success).toBe(false);
    expect(await factorCount(user.id)).toBe(1);
  });
});

describe("fixtures", () => {
  it("a fixture client re-verifies TOTP when signing in again", async () => {
    const u = w.users["A1.owner"];
    const c = await signInPasswordOnly(u.email);
    await completeTotp(c, u.totpSecret!);
    const { data } = await c.auth.mfa.getAuthenticatorAssuranceLevel();
    expect(data?.currentLevel).toBe("aal2");
  });
});
