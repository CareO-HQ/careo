import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildWorld, refreshClaims, type World } from "./fixtures";

/**
 * Regression tests: legitimate browser-side flows that write public.users (or call the
 * vetted RPCs) must keep working after the privilege guard was added.
 */

let w: World;

beforeAll(async () => {
  w = await buildWorld();
  // A second team inside care home A1, and one in A2, for team switching.
  for (const [key, home] of [["A1b", w.homes.A1], ["A2", w.homes.A2]] as const) {
    const { data, error } = await w.admin
      .from("teams")
      .insert({ organization_id: home.orgId, care_home_id: home.careHomeId, name: `Unit ${key}`, created_by: w.users["A1.owner"].id })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message);
    extraTeams[key] = data.id as string;
  }
}, 300_000);
afterAll(async () => {
  await w?.cleanup();
});

const extraTeams: Record<string, string> = {};

async function row(id: string) {
  const { data } = await w.admin
    .from("users")
    .select("role, name, phone, nmc_pin_number, active_organization_id, active_care_home_id, active_team_id, is_onboarding_complete")
    .eq("id", id)
    .single();
  return data;
}

describe("own profile edits", () => {
  it("any user can edit their name, phone and professional registration", async () => {
    const { client, user } = await w.freshUser("A1", "care_assistant");
    const { error } = await client
      .from("users")
      .update({ name: "New Name", phone: "07123", nmc_pin_number: "12A3456B", is_onboarding_complete: true })
      .eq("id", user.id);
    expect(error).toBeNull();
    expect(await row(user.id)).toMatchObject({ name: "New Name", phone: "07123", nmc_pin_number: "12A3456B" });
  });

  it("leaving the workspace (active organization -> null) still works", async () => {
    const { client, user } = await w.freshUser("A1", "nurse");
    const { error } = await client.from("users").update({ active_organization_id: null }).eq("id", user.id);
    expect(error).toBeNull();
    expect((await row(user.id))?.active_organization_id).toBeNull();
  });
});

describe("team / care home switching (TeamSwitcher)", () => {
  it("a nurse can switch to another team in their care home", async () => {
    const { client, user } = await w.freshUser("A1", "nurse");
    const { error } = await client
      .from("users")
      .update({ active_team_id: extraTeams.A1b, active_care_home_id: w.homes.A1.careHomeId })
      .eq("id", user.id);
    expect(error).toBeNull();
    expect((await row(user.id))?.active_team_id).toBe(extraTeams.A1b);
  });

  it("a nurse cannot switch to a team in another care home", async () => {
    const { client, user } = await w.freshUser("A1", "nurse");
    const { error } = await client.from("users").update({ active_team_id: extraTeams.A2 }).eq("id", user.id);
    expect(error).not.toBeNull();
  });

  it("an owner can switch care home and team within their organization", async () => {
    const { client, user } = await w.freshUser("A1", "owner");
    const r1 = await client.from("users").update({ active_care_home_id: w.homes.A2.careHomeId, active_team_id: null }).eq("id", user.id);
    expect(r1.error).toBeNull();
    const r2 = await client
      .from("users")
      .update({ active_team_id: extraTeams.A2, active_care_home_id: w.homes.A2.careHomeId })
      .eq("id", user.id);
    expect(r2.error).toBeNull();
    await refreshClaims(client);
    const { data } = await client.from("residents").select("id").eq("id", w.homes.A2.residentId);
    expect(data ?? []).toHaveLength(1);
  });

  it("an owner cannot switch to a care home of another organization", async () => {
    const { client, user } = await w.freshUser("A1", "owner");
    const { error } = await client.from("users").update({ active_care_home_id: w.homes.B1.careHomeId }).eq("id", user.id);
    expect(error).not.toBeNull();
  });
});

describe("managers editing staff", () => {
  it("a manager can edit a staff member's details", async () => {
    const mgr = await w.as("A1.manager");
    const { user } = await w.freshUser("A1", "care_assistant");
    const { error } = await mgr.from("users").update({ name: "Edited by manager", phone: "0800" }).eq("id", user.id);
    expect(error).toBeNull();
    expect((await row(user.id))?.name).toBe("Edited by manager");
  });

  it("a manager can remove a member from the organization (members page)", async () => {
    const mgr = await w.as("A1.manager");
    const { user } = await w.freshUser("A1", "care_assistant");
    const { data: removed, error } = await mgr.rpc("remove_organization_member", { p_member_id: user.id });
    expect(error).toBeNull();
    expect(removed).toBe(true);
    expect((await row(user.id))?.active_organization_id).toBeNull();
  });

  it("a manager cannot remove an owner or a member of another organization", async () => {
    const mgr = await w.as("A1.manager");
    const owner = await mgr.rpc("remove_organization_member", { p_member_id: w.users["A1.owner"].id });
    expect(owner.error).not.toBeNull();
    const other = await mgr.rpc("remove_organization_member", { p_member_id: w.users["B1.nurse"].id });
    expect(other.error).not.toBeNull();
  });

  it("a manager can change a care assistant's role to nurse (below manager)", async () => {
    const mgr = await w.as("A1.manager");
    const { user } = await w.freshUser("A1", "care_assistant");
    const { error } = await mgr.from("users").update({ role: "nurse" }).eq("id", user.id);
    expect(error).toBeNull();
    expect((await row(user.id))?.role).toBe("nurse");
  });
});

describe("invitation acceptance (accept_invitation RPC)", () => {
  it("assigns the invited role, organization, care home and team", async () => {
    const { client, userId, email } = await w.signUp({ name: "Invitee" });
    const token = `inv-${Math.random().toString(36).slice(2)}`;
    const { error: invErr } = await w.admin.from("invitations").insert({
      organization_id: w.homes.A1.orgId,
      care_home_id: w.homes.A1.careHomeId,
      team_id: w.homes.A1.teamId,
      email,
      role: "nurse",
      invited_by: w.users["A1.manager"].id,
      token,
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    });
    expect(invErr).toBeNull();

    const { data: ok, error } = await client.rpc("accept_invitation", { p_token: token });
    expect(error).toBeNull();
    expect(ok).toBe(true);
    expect(await row(userId)).toMatchObject({
      role: "nurse",
      active_organization_id: w.homes.A1.orgId,
      active_care_home_id: w.homes.A1.careHomeId,
      active_team_id: w.homes.A1.teamId,
    });
    const claims = await refreshClaims(client);
    expect(claims.role).toBe("nurse");
    const { data: res } = await client.from("residents").select("id").eq("id", w.homes.A1.residentId);
    expect(res ?? []).toHaveLength(1);
  });

  it("rejects a token issued to another email", async () => {
    const { client } = await w.signUp();
    const token = `inv-${Math.random().toString(36).slice(2)}`;
    await w.admin.from("invitations").insert({
      organization_id: w.homes.A1.orgId,
      email: "someone-else@example.com",
      role: "manager",
      invited_by: w.users["A1.owner"].id,
      token,
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    });
    const { data } = await client.rpc("accept_invitation", { p_token: token });
    expect(data).toBe(false);
  });
});

describe("owner onboarding", () => {
  it("an owner can create an organization and care home and make them active", async () => {
    const { client, user } = await w.freshUser("A1", "owner");
    // Owner starts without an organization (e.g. platform-created owner).
    await w.admin.from("users").update({ organization_id: null, active_organization_id: null, active_care_home_id: null, active_team_id: null }).eq("id", user.id);
    await refreshClaims(client);

    const { data: org, error: orgErr } = await w.admin.from("organizations").insert({ name: `New Org ${w.runId}` }).select("id").single();
    expect(orgErr).toBeNull();
    const r1 = await client.from("users").update({ active_organization_id: org!.id }).eq("id", user.id);
    expect(r1.error).toBeNull();

    const { data: home } = await w.admin
      .from("care_homes")
      .insert({ organization_id: org!.id, name: "First Home", created_by: user.id })
      .select("id")
      .single();
    const r2 = await client.from("users").update({ active_care_home_id: home!.id }).eq("id", user.id);
    expect(r2.error).toBeNull();
    expect(await row(user.id)).toMatchObject({ active_organization_id: org!.id, active_care_home_id: home!.id });
  });

  it("an owner cannot attach themselves to an existing organization with members", async () => {
    const { client, user } = await w.freshUser("A1", "owner");
    const { error } = await client.from("users").update({ active_organization_id: w.homes.B1.orgId }).eq("id", user.id);
    expect(error).not.toBeNull();
  });
});

describe("agency onboarding (complete_agency_onboarding RPC)", () => {
  it("activates an agency nurse into the requested team", async () => {
    const { client, userId, email } = await w.signUp({ name: "Agency Nurse" });
    const { data: staff, error: staffErr } = await w.admin
      .from("agency_staff")
      .insert({ email, name: "Agency Nurse", role: "nurse", status: "available" })
      .select("id")
      .single();
    expect(staffErr).toBeNull();
    const token = crypto.randomUUID();
    const { error: reqErr } = await w.admin.from("agency_requests").insert({
      agency_staff_id: staff!.id,
      organization_id: w.homes.A1.orgId,
      care_home_id: w.homes.A1.careHomeId,
      team_id: w.homes.A1.teamId,
      status: "approved",
      activation_token: token,
    });
    expect(reqErr).toBeNull();

    const { error } = await client.rpc("complete_agency_onboarding", { p_token: token });
    expect(error).toBeNull();
    expect(await row(userId)).toMatchObject({
      role: "agency_nurse",
      active_care_home_id: w.homes.A1.careHomeId,
      active_team_id: w.homes.A1.teamId,
      is_onboarding_complete: true,
    });
  });

  it("rejects an activation token that belongs to another email", async () => {
    const { client } = await w.signUp();
    const { data: staff } = await w.admin
      .from("agency_staff")
      .insert({ email: `other-${w.runId}@example.com`, name: "Other", role: "nurse", status: "available" })
      .select("id")
      .single();
    const token = crypto.randomUUID();
    await w.admin.from("agency_requests").insert({
      agency_staff_id: staff!.id,
      organization_id: w.homes.A1.orgId,
      care_home_id: w.homes.A1.careHomeId,
      status: "approved",
      activation_token: token,
    });
    const { error } = await client.rpc("complete_agency_onboarding", { p_token: token });
    expect(error).not.toBeNull();
  });
});
