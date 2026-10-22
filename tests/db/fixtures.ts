import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { authenticator } from "otplib";
import { requiresMfa } from "@/lib/mfa";
import type { UserRole } from "@/lib/permissions";

export const PASSWORD = "Test-Password-123!";

export interface Home {
  orgId: string;
  careHomeId: string;
  teamId: string;
  residentId: string;
}

export interface FixtureUser {
  id: string;
  email: string;
  role: UserRole;
  home: Home;
  /** TOTP secret of the user's enrolled authenticator; absent for MFA-exempt roles. */
  totpSecret?: string;
}

export interface World {
  runId: string;
  admin: SupabaseClient;
  /** Org A has two care homes (A1, A2); org B has one (B1). */
  homes: { A1: Home; A2: Home; B1: Home };
  users: Record<string, FixtureUser>;
  /** Signed-in client for a fixture user key, e.g. "A1.nurse", with MFA completed (aal2). */
  as(key: string): Promise<SupabaseClient>;
  /** New client signed in with the password only (aal1), for MFA enforcement tests. Not cached. */
  passwordOnly(key: string): Promise<SupabaseClient>;
  /**
   * Creates an extra, isolated user for tests that mutate the user itself. By default the
   * user has an enrolled authenticator; pass { enrollMfa: false } to test first-time setup.
   */
  freshUser(
    homeKey: keyof World["homes"],
    role: UserRole,
    options?: { enrollMfa?: boolean }
  ): Promise<{ client: SupabaseClient; user: FixtureUser }>;
  /** Fresh client that has signed up through the public signup endpoint (attacker model). */
  signUp(meta?: Record<string, unknown>): Promise<{ client: SupabaseClient; userId: string; email: string }>;
  cleanup(): Promise<void>;
}

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function anonClient(): SupabaseClient {
  return createClient(url(), anonKey(), { auth: { persistSession: false, autoRefreshToken: false } });
}

export function serviceClient(): SupabaseClient {
  return createClient(url(), process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function must<T>(
  p: PromiseLike<{ data: T; error: { message: string } | null }>,
  what: string
): Promise<NonNullable<T>> {
  const { data, error } = await p;
  if (error || data === null || data === undefined) {
    throw new Error(`fixture: ${what}: ${error?.message ?? "no data"}`);
  }
  return data as NonNullable<T>;
}

/** Ensures some saas_admin exists so new signups do not become the platform admin. */
async function ensurePlatformAdmin(admin: SupabaseClient): Promise<void> {
  const { data } = await admin.from("users").select("id").or("is_saas_admin.eq.true,role.eq.saas_admin").limit(1);
  if (data && data.length > 0) return;
  await createAuthUser(admin, "platform-admin@test.local");
}

export async function createAuthUser(admin: SupabaseClient, email: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: email },
  });
  if (error || !data.user) throw new Error(`fixture: create auth user ${email}: ${error?.message ?? "no user"}`);
  return data.user.id;
}

export async function placeUser(admin: SupabaseClient, id: string, role: UserRole, home: Home): Promise<void> {
  await must(
    admin
      .from("users")
      .update({
        role,
        is_saas_admin: role === "saas_admin",
        organization_id: home.orgId,
        active_organization_id: home.orgId,
        active_care_home_id: home.careHomeId,
        active_team_id: home.teamId,
        is_onboarding_complete: true,
        is_login_allowed: true,
      })
      .eq("id", id)
      .select("id")
      .single(),
    `place user ${id} as ${role}`
  );
}

/** A TOTP code that is valid now; waits for the next 30s step if `notThis` was just used. */
export async function freshTotp(secret: string, notThis?: string): Promise<string> {
  let code = authenticator.generate(secret);
  while (code === notThis) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    code = authenticator.generate(secret);
  }
  return code;
}

/** Completes the TOTP step on a password-signed-in client, raising it to aal2. */
export async function completeTotp(client: SupabaseClient, secret: string): Promise<void> {
  const { data, error } = await client.auth.mfa.listFactors();
  const factor = data?.totp[0];
  if (error || !factor) throw new Error(`fixture: no verified TOTP factor: ${error?.message ?? "none"}`);
  let code = await freshTotp(secret);
  let result = await client.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  // A code may be refused if it was already used in this 30s window; retry with the next one.
  if (result.error) {
    code = await freshTotp(secret, code);
    result = await client.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  }
  if (result.error) throw new Error(`fixture: TOTP verify: ${result.error.message}`);
}

/** Enrols a TOTP authenticator for a user (removing any earlier ones) and returns its secret. */
export async function enrollTotp(admin: SupabaseClient, userId: string, email: string): Promise<string> {
  const { data: existing } = await admin.auth.admin.mfa.listFactors({ userId });
  for (const factor of existing?.factors ?? []) {
    await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId });
  }
  const c = anonClient();
  const { error: signInError } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInError) throw new Error(`fixture: sign in ${email} to enrol: ${signInError.message}`);
  const { data, error } = await c.auth.mfa.enroll({ factorType: "totp", friendlyName: "fixture" });
  if (error) throw new Error(`fixture: enrol TOTP for ${email}: ${error.message}`);
  const verify = await c.auth.mfa.challengeAndVerify({
    factorId: data.id,
    code: authenticator.generate(data.totp.secret),
  });
  if (verify.error) throw new Error(`fixture: verify TOTP for ${email}: ${verify.error.message}`);
  await c.auth.signOut({ scope: "local" });
  return data.totp.secret;
}

const ROLES_IN_A1: UserRole[] = [
  "owner",
  "manager",
  "nurse",
  "care_assistant",
  "agency_nurse",
  "mdt",
  "rqia",
  "kitchen_staff",
];

export async function buildWorld(): Promise<World> {
  const admin = serviceClient();
  const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await ensurePlatformAdmin(admin);

  // Bootstrap creator user (care_homes/teams/residents require created_by).
  const creatorId = await createAuthUser(admin, `creator-${runId}@test.local`);
  const createdAuthIds: string[] = [creatorId];

  const makeOrg = async (label: string) =>
    (await must(admin.from("organizations").insert({ name: `Org ${label} ${runId}` }).select("id").single(), "org")).id as string;

  const makeHome = async (orgId: string, label: string): Promise<Home> => {
    const careHomeId = (
      await must(
        admin.from("care_homes").insert({ organization_id: orgId, name: `Home ${label}`, created_by: creatorId }).select("id").single(),
        "care home"
      )
    ).id as string;
    const teamId = (
      await must(
        admin
          .from("teams")
          .insert({ organization_id: orgId, care_home_id: careHomeId, name: `Unit ${label}`, created_by: creatorId })
          .select("id")
          .single(),
        "team"
      )
    ).id as string;
    const residentId = (
      await must(
        admin
          .from("residents")
          .insert({
            first_name: `Res${label}`,
            last_name: runId,
            date_of_birth: "1940-01-01",
            organization_id: orgId,
            care_home_id: careHomeId,
            team_id: teamId,
            created_by: creatorId,
            nhs_health_number: "9434765919",
          })
          .select("id")
          .single(),
        "resident"
      )
    ).id as string;
    return { orgId, careHomeId, teamId, residentId };
  };

  const orgA = await makeOrg("A");
  const orgB = await makeOrg("B");
  const homes = {
    A1: await makeHome(orgA, "A1"),
    A2: await makeHome(orgA, "A2"),
    B1: await makeHome(orgB, "B1"),
  };

  const users: Record<string, FixtureUser> = {};
  const addUser = async (homeKey: keyof typeof homes, role: UserRole) => {
    const email = `${homeKey.toLowerCase()}-${role}-${runId}@test.local`;
    const id = await createAuthUser(admin, email);
    createdAuthIds.push(id);
    await placeUser(admin, id, role, homes[homeKey]);
    const totpSecret = requiresMfa(role) ? await enrollTotp(admin, id, email) : undefined;
    users[`${homeKey}.${role}`] = { id, email, role, home: homes[homeKey], totpSecret };
  };

  for (const role of ROLES_IN_A1) await addUser("A1", role);
  await addUser("A2", "nurse");
  await addUser("A2", "manager");
  await addUser("B1", "owner");
  await addUser("B1", "nurse");
  await addUser("B1", "mdt");
  await addUser("B1", "rqia");
  await addUser("A1", "agency_care_assistant");
  // Only one platform admin may exist (idx_single_saas_admin), so reuse the local one.
  const platformAdmin = await must(
    admin.from("users").select("id, email").or("is_saas_admin.eq.true,role.eq.saas_admin").limit(1).single(),
    "find platform admin"
  );
  const { error: resetError } = await admin.auth.admin.updateUserById(platformAdmin.id as string, {
    password: PASSWORD,
  });
  if (resetError) throw new Error(`fixture: reset platform admin password: ${resetError.message}`);
  await must(
    admin
      .from("users")
      .update({ is_onboarding_complete: true, is_login_allowed: true })
      .eq("id", platformAdmin.id as string)
      .select("id")
      .single(),
    "complete platform admin onboarding"
  );
  users["A1.saas_admin"] = {
    id: platformAdmin.id as string,
    email: platformAdmin.email as string,
    role: "saas_admin",
    home: homes.A1,
    totpSecret: await enrollTotp(admin, platformAdmin.id as string, platformAdmin.email as string),
  };

  const clientCache = new Map<string, SupabaseClient>();
  const as = async (key: string) => {
    const cached = clientCache.get(key);
    if (cached) return cached;
    const u = users[key];
    if (!u) throw new Error(`unknown fixture user ${key}`);
    const c = anonClient();
    const { error } = await c.auth.signInWithPassword({ email: u.email, password: PASSWORD });
    if (error) throw new Error(`sign in ${key}: ${error.message}`);
    if (u.totpSecret) await completeTotp(c, u.totpSecret);
    clientCache.set(key, c);
    return c;
  };

  const passwordOnly = async (key: string) => {
    const u = users[key];
    if (!u) throw new Error(`unknown fixture user ${key}`);
    const c = anonClient();
    const { error } = await c.auth.signInWithPassword({ email: u.email, password: PASSWORD });
    if (error) throw new Error(`sign in ${key}: ${error.message}`);
    return c;
  };

  const signUp = async (meta: Record<string, unknown> = {}) => {
    const email = `attacker-${Math.random().toString(36).slice(2, 8)}-${runId}@test.local`;
    const c = anonClient();
    const { data, error } = await c.auth.signUp({ email, password: PASSWORD, options: { data: meta } });
    if (error || !data.user) throw new Error(`signup: ${error?.message}`);
    createdAuthIds.push(data.user.id);
    if (!data.session) {
      const r = await c.auth.signInWithPassword({ email, password: PASSWORD });
      if (r.error) throw new Error(`signup sign-in: ${r.error.message}`);
    }
    return { client: c, userId: data.user.id, email };
  };

  let freshCount = 0;
  const freshUser = async (
    homeKey: keyof typeof homes,
    role: UserRole,
    { enrollMfa = true }: { enrollMfa?: boolean } = {}
  ) => {
    const key = `${homeKey}.${role}.fresh${freshCount++}`;
    const email = `${key.replace(/\./g, "-").toLowerCase()}-${runId}@test.local`;
    const id = await createAuthUser(admin, email);
    createdAuthIds.push(id);
    await placeUser(admin, id, role, homes[homeKey]);
    const totpSecret = enrollMfa && requiresMfa(role) ? await enrollTotp(admin, id, email) : undefined;
    users[key] = { id, email, role, home: homes[homeKey], totpSecret };
    return { client: await as(key), user: users[key] };
  };

  const cleanup = async () => {
    for (const c of clientCache.values()) await c.auth.signOut();
    // Data rows are left in the disposable local DB (`npx supabase db reset` wipes them);
    // auth users are removed so repeated runs stay fast.
    for (const id of createdAuthIds) await admin.auth.admin.deleteUser(id).catch(() => undefined);
  };

  return { runId, admin, homes, users, as, passwordOnly, freshUser, signUp, cleanup };
}

/** Re-authenticate to pick up app_metadata changes made by triggers. */
export async function refreshClaims(client: SupabaseClient): Promise<Record<string, unknown>> {
  const { data, error } = await client.auth.refreshSession();
  if (error) throw new Error(`refresh: ${error.message}`);
  return (data.session?.user.app_metadata ?? {}) as Record<string, unknown>;
}
