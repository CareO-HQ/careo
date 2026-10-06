import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildWorld, refreshClaims, type World } from "./fixtures";

let w: World;

beforeAll(async () => {
  w = await buildWorld();
});
afterAll(async () => {
  await w?.cleanup();
});

// Every test that mutates a user uses an isolated fresh user so results are order-independent.
describe("self-service privilege escalation via public.users", () => {
  it("a care assistant cannot promote themselves to saas_admin", async () => {
    const { client, user } = await w.freshUser("A1", "care_assistant");
    await client.from("users").update({ is_saas_admin: true }).eq("id", user.id);
    const { data } = await w.admin.from("users").select("is_saas_admin").eq("id", user.id).single();
    expect(data?.is_saas_admin).toBe(false);
  });

  it.each(["care_assistant", "kitchen_staff", "mdt", "rqia", "nurse"] as const)(
    "CRITICAL BUG: %s can change their own role to owner (and gets it in their JWT)",
    async (role) => {
      const { client, user } = await w.freshUser("A1", role);
      await client.from("users").update({ role: "owner" }).eq("id", user.id);
      const { data } = await w.admin.from("users").select("role").eq("id", user.id).single();
      const claims = await refreshClaims(client);
      expect({ db: data?.role, jwt: claims.role }).toEqual({ db: role, jwt: role });
    }
  );

  it("CRITICAL BUG: a nurse can move themselves into another organization and read its residents", async () => {
    const { client, user } = await w.freshUser("A1", "nurse");
    const B1 = w.homes.B1;
    await client
      .from("users")
      .update({ active_organization_id: B1.orgId, active_care_home_id: B1.careHomeId, active_team_id: B1.teamId })
      .eq("id", user.id);
    await refreshClaims(client);
    const { data } = await client.from("residents").select("id, first_name, nhs_health_number").eq("id", B1.residentId);
    expect(data ?? []).toEqual([]);
  });

  it("CRITICAL BUG: a care assistant can switch to another care home in the same org and read its residents", async () => {
    const { client, user } = await w.freshUser("A1", "care_assistant");
    const A2 = w.homes.A2;
    await client.from("users").update({ active_care_home_id: A2.careHomeId, active_team_id: A2.teamId }).eq("id", user.id);
    await refreshClaims(client);
    const { data } = await client.from("residents").select("id").eq("id", A2.residentId);
    expect(data ?? []).toEqual([]);
  });

  it("a brand-new self-signup cannot grant itself saas_admin", async () => {
    const { client, userId } = await w.signUp({ name: "Mallory" });
    await client.from("users").update({ is_saas_admin: true }).eq("id", userId);
    const claims = await refreshClaims(client);
    expect(claims.is_saas_admin).not.toBe(true);
  });

  it("CRITICAL BUG: a brand-new self-signup can attach itself to any organization and read its residents", async () => {
    const { client, userId } = await w.signUp({ name: "Mallory" });
    const B1 = w.homes.B1;
    await client
      .from("users")
      .update({ role: "owner", active_organization_id: B1.orgId, active_care_home_id: B1.careHomeId })
      .eq("id", userId);
    await refreshClaims(client);
    const { data } = await client.from("residents").select("id").eq("id", B1.residentId);
    expect(data ?? []).toEqual([]);
  });

  it("CRITICAL BUG: agency-flagged self-signup can choose an elevated role via user metadata", async () => {
    const { client } = await w.signUp({ is_agency_staff: true, role: "owner" });
    const claims = await refreshClaims(client);
    expect(claims.role).not.toBe("owner");
  });

  it("a fresh self-signup without invitation is not made saas_admin when one already exists", async () => {
    const { client } = await w.signUp();
    const claims = await refreshClaims(client);
    expect(claims.is_saas_admin).not.toBe(true);
    expect(claims.role).not.toBe("saas_admin");
  });

  it("a fresh self-signup sees no organizations, residents or clinical data", async () => {
    const { client } = await w.signUp();
    for (const table of ["organizations", "care_homes", "residents", "incidents", "medications", "progress_notes"]) {
      const { data } = await client.from(table).select("id").limit(5);
      expect({ table, rows: data?.length ?? 0 }).toEqual({ table, rows: 0 });
    }
  });
});

describe("managers editing other users", () => {
  it("a manager cannot grant saas_admin to a colleague", async () => {
    const mgr = await w.as("A1.manager");
    const { user } = await w.freshUser("A1", "care_assistant");
    await mgr.from("users").update({ is_saas_admin: true }).eq("id", user.id);
    const { data } = await w.admin.from("users").select("is_saas_admin").eq("id", user.id).single();
    expect(data?.is_saas_admin).toBe(false);
  });

  it("BUG: a manager can promote a colleague to owner (above their own level)", async () => {
    const mgr = await w.as("A1.manager");
    const { user } = await w.freshUser("A1", "nurse");
    await mgr.from("users").update({ role: "owner" }).eq("id", user.id);
    const { data } = await w.admin.from("users").select("role").eq("id", user.id).single();
    expect(data?.role).toBe("nurse");
  });

  it("a manager cannot edit users in another organization", async () => {
    const mgr = await w.as("A1.manager");
    const target = w.users["B1.nurse"].id;
    await mgr.from("users").update({ name: "pwned" }).eq("id", target);
    const { data } = await w.admin.from("users").select("name").eq("id", target).single();
    expect(data?.name).not.toBe("pwned");
  });

  it("a nurse cannot edit a colleague's profile", async () => {
    const nurse = await w.as("A1.nurse");
    const target = w.users["A1.care_assistant"].id;
    await nurse.from("users").update({ name: "edited-by-nurse" }).eq("id", target);
    const { data } = await w.admin.from("users").select("name").eq("id", target).single();
    expect(data?.name).not.toBe("edited-by-nurse");
  });
});
