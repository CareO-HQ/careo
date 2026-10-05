import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { anonClient, buildWorld, PASSWORD, type World } from "./fixtures";

/**
 * Server actions ("use server") are public POST endpoints: any client can invoke them
 * with arbitrary arguments. The session is simulated by mocking the cookie-based Supabase
 * server client; `session.userId = null` models an anonymous caller.
 */

const session = { userId: null as string | null };

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@supabase/auth-helpers-nextjs", () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: session.userId ? { id: session.userId } : null }, error: null }),
    },
  }),
}));

interface SentEmail {
  to: string[];
  subject: string;
  html: string;
}
const sent: SentEmail[] = [];
vi.mock("@/lib/resend", () => ({
  default: { emails: { send: async (e: SentEmail) => (sent.push(e), { data: { id: "x" }, error: null }) } },
}));

const rota = await import("@/app/actions/rota");
const agency = await import("@/app/actions/agency-onboarding");
const invitations = await import("@/app/actions/invitations");

let w: World;
const as = (key: string | null) => {
  session.userId = key ? w.users[key].id : null;
};

beforeAll(async () => {
  w = await buildWorld();
}, 300_000);
afterAll(async () => {
  await w?.cleanup();
});
beforeEach(() => {
  session.userId = null;
  sent.length = 0;
});

async function contractedHours(userId: string): Promise<number> {
  const { data } = await w.admin.from("users").select("contracted_weekly_hours").eq("id", userId).single();
  return Number(data?.contracted_weekly_hours ?? 0);
}

describe("rota actions verify the session instead of trusting actorId", () => {
  it("CRITICAL BUG: anonymous caller impersonating a manager cannot change contracted hours", async () => {
    const { user } = await w.freshUser("A1", "nurse");
    as(null);
    await rota.updateStaffWorkforceAction(w.users["A1.manager"].id, user.id, { contracted_weekly_hours: 1 });
    expect(await contractedHours(user.id)).not.toBe(1);
  });

  it("a signed-in user cannot act as someone else (actorId mismatch)", async () => {
    const { user } = await w.freshUser("A1", "nurse");
    as("A1.care_assistant");
    const res = await rota.updateStaffWorkforceAction(w.users["A1.manager"].id, user.id, { contracted_weekly_hours: 2 });
    expect(JSON.stringify(res)).toMatch(/Unauthorized/i);
    expect(await contractedHours(user.id)).not.toBe(2);
  });

  it("regression: a manager can still set contracted hours for staff in their organization", async () => {
    const { user } = await w.freshUser("A1", "nurse");
    as("A1.manager");
    const res = await rota.updateStaffWorkforceAction(w.users["A1.manager"].id, user.id, { contracted_weekly_hours: 30 });
    expect(res).toMatchObject({ success: true });
    expect(await contractedHours(user.id)).toBe(30);
  });

  it("CRITICAL BUG: a manager of org A cannot approve a nurse of org B as rota manager", async () => {
    const { user } = await w.freshUser("B1", "nurse");
    as("A1.manager");
    await rota.updateStaffWorkforceAction(w.users["A1.manager"].id, user.id, { is_manager_approved_nurse: true });
    const { data } = await w.admin.from("users").select("is_manager_approved_nurse").eq("id", user.id).single();
    expect(data?.is_manager_approved_nurse).not.toBe(true);
  });

  it("BUG (code review #6): a nurse cannot toggle login access of an RQIA user in another organization", async () => {
    const { user } = await w.freshUser("B1", "rqia");
    as("A1.nurse");
    await rota.updateStaffWorkforceAction(w.users["A1.nurse"].id, user.id, { is_login_allowed: false });
    const { data } = await w.admin.from("users").select("is_login_allowed").eq("id", user.id).single();
    expect(data?.is_login_allowed).toBe(true);
  });

  it("regression: a nurse can deactivate an RQIA user in their organization, which also blocks sign-in", async () => {
    const { user } = await w.freshUser("A1", "rqia");
    as("A1.nurse");
    const off = await rota.updateStaffWorkforceAction(w.users["A1.nurse"].id, user.id, { is_login_allowed: false });
    expect(off).toMatchObject({ success: true });
    const blocked = await anonClient().auth.signInWithPassword({ email: user.email, password: PASSWORD });
    expect(blocked.error).not.toBeNull();

    const on = await rota.updateStaffWorkforceAction(w.users["A1.nurse"].id, user.id, { is_login_allowed: true });
    expect(on).toMatchObject({ success: true });
    const allowed = await anonClient().auth.signInWithPassword({ email: user.email, password: PASSWORD });
    expect(allowed.error).toBeNull();
  });

  it("nurse cannot toggle login access of non-external staff", async () => {
    const { user } = await w.freshUser("A1", "care_assistant");
    as("A1.nurse");
    const res = await rota.updateStaffWorkforceAction(w.users["A1.nurse"].id, user.id, { is_login_allowed: false });
    expect(JSON.stringify(res)).toMatch(/only manage external|Unauthorized/i);
  });

  it("care assistant cannot edit staff workforce settings", async () => {
    const { user } = await w.freshUser("A1", "nurse");
    as("A1.care_assistant");
    const res = await rota.updateStaffWorkforceAction(w.users["A1.care_assistant"].id, user.id, {
      contracted_weekly_hours: 2,
    });
    expect(JSON.stringify(res)).toMatch(/Unauthorized/i);
  });

  it("CRITICAL BUG: a manager cannot create rotas for another organization's team", async () => {
    as("A1.manager");
    await rota.createRotaAction(w.users["A1.manager"].id, w.homes.B1.teamId, "2026-12-07", "2026-12-13");
    const { data } = await w.admin.from("rotas").select("id").eq("team_id", w.homes.B1.teamId).eq("start_date", "2026-12-07");
    expect(data ?? []).toEqual([]);
  });

  it("regression: a manager can still create a rota for their own team", async () => {
    as("A1.manager");
    const res = await rota.createRotaAction(w.users["A1.manager"].id, w.homes.A1.teamId, "2026-12-14", "2026-12-20");
    expect(JSON.stringify(res)).not.toMatch(/Unauthorized|outside/i);
    const { data } = await w.admin.from("rotas").select("id").eq("team_id", w.homes.A1.teamId).eq("start_date", "2026-12-14");
    expect(data ?? []).toHaveLength(1);
  });

  it("CRITICAL BUG: a manager cannot add temporary staff to another organization's team", async () => {
    as("A1.manager");
    await rota.createTemporaryStaffAction(w.users["A1.manager"].id, w.homes.B1.teamId, {
      name: `Intruder ${w.runId}`,
      role: "nurse",
      contracted_weekly_hours: 10,
    });
    const { data } = await w.admin.from("temporary_staff").select("id").eq("name", `Intruder ${w.runId}`);
    expect(data ?? []).toEqual([]);
  });
});

describe("agency onboarding actions require a signed-in manager in scope", () => {
  const linkCode = async (homeId: string) =>
    (await w.admin.from("care_homes").select("agency_link_code").eq("id", homeId).single()).data?.agency_link_code;

  it("CRITICAL BUG: anonymous callers cannot regenerate a care home's agency link code", async () => {
    const before = await linkCode(w.homes.B1.careHomeId);
    as(null);
    await agency.regenerateAgencyLinkCode(w.homes.B1.careHomeId);
    expect(await linkCode(w.homes.B1.careHomeId)).toBe(before);
  });

  it("a manager cannot regenerate the code of another organization's care home", async () => {
    const before = await linkCode(w.homes.B1.careHomeId);
    as("A1.manager");
    await agency.regenerateAgencyLinkCode(w.homes.B1.careHomeId);
    expect(await linkCode(w.homes.B1.careHomeId)).toBe(before);
  });

  it("regression: a manager can regenerate their own care home's code", async () => {
    const before = await linkCode(w.homes.A1.careHomeId);
    as("A1.manager");
    await agency.regenerateAgencyLinkCode(w.homes.A1.careHomeId);
    const after = await linkCode(w.homes.A1.careHomeId);
    expect(after).toBeTruthy();
    expect(after).not.toBe(before);
  });
});

describe("invitation email action", () => {
  async function createInvitation(email: string, invitedBy: string): Promise<string> {
    const token = `tok-${Math.random().toString(36).slice(2)}`;
    const { error } = await w.admin.from("invitations").insert({
      organization_id: w.homes.A1.orgId,
      care_home_id: w.homes.A1.careHomeId,
      email,
      role: "nurse",
      invited_by: invitedBy,
      token,
      expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    });
    if (error) throw new Error(error.message);
    return token;
  }

  const args = (token: string, email = "victim@example.com") => ({
    email,
    organizationId: w.homes.A1.orgId,
    careHomeName: '<a href="https://evil.example">Reset your NHS password</a>',
    inviterName: "<b>IT</b>",
    token,
    role: "owner",
  });

  it("CRITICAL BUG: anonymous caller cannot send an email from care@careo.uk", async () => {
    as(null);
    await invitations.sendInvitationEmail(args("made-up-token"));
    expect(sent).toHaveLength(0);
  });

  it("a signed-in manager cannot send an email for a token that does not exist", async () => {
    as("A1.manager");
    await invitations.sendInvitationEmail(args("made-up-token"));
    expect(sent).toHaveLength(0);
  });

  it("regression: a manager can send their organization's invitation; recipient and role come from the stored invitation", async () => {
    const token = await createInvitation(`a+b-${w.runId}@example.com`, w.users["A1.manager"].id);
    as("A1.manager");
    const res = await invitations.sendInvitationEmail(args(token, "someone-else@example.com"));
    expect(res).toMatchObject({ success: true });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toEqual([`a+b-${w.runId}@example.com`]);
    expect(sent[0].html).toContain("as a nurse");
  });

  it("BUG: invitation HTML escapes caller-controlled fields (no phishing/HTML injection)", async () => {
    const token = await createInvitation(`x-${w.runId}@example.com`, w.users["A1.manager"].id);
    as("A1.manager");
    await invitations.sendInvitationEmail(args(token));
    expect(sent[0]?.html ?? "").not.toContain('<a href="https://evil.example">');
    expect(sent[0]?.html ?? "").toContain("&lt;a href=");
  });

  it("BUG: email query parameter in invite link is URL-encoded", async () => {
    const token = await createInvitation(`c+d-${w.runId}@example.com`, w.users["A1.manager"].id);
    as("A1.manager");
    await invitations.sendInvitationEmail(args(token));
    expect(sent[0]?.html ?? "").toContain(`email=c%2Bd-${w.runId}%40example.com`);
  });

  it("a manager of another organization cannot send this organization's invitation", async () => {
    const token = await createInvitation(`y-${w.runId}@example.com`, w.users["A1.manager"].id);
    as("B1.owner");
    await invitations.sendInvitationEmail(args(token));
    expect(sent).toHaveLength(0);
  });
});
