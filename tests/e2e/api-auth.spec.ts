import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { serviceClient } from "../db/fixtures";
import { login, world } from "./helpers";

interface RouteCase {
  url: string;
  method: string;
  file: string;
}

/** Discovers every app/api route.ts and its exported HTTP methods. */
function discoverRoutes(): RouteCase[] {
  const root = path.resolve(__dirname, "../../app/api");
  const out: RouteCase[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "route.ts") {
        const src = fs.readFileSync(full, "utf8");
        const methods = [...src.matchAll(/export\s+(?:async\s+function|const)\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map(
          (m) => m[1]
        );
        const rel = path.relative(root, path.dirname(full)).split(path.sep).join("/");
        const url = `/api/${rel}`.replace(/\[[^\]]+\]/g, "00000000-0000-4000-8000-000000000000");
        for (const method of methods) out.push({ url, method, file: rel });
      }
    }
  };
  walk(root);
  return out;
}

const ROUTES = discoverRoutes();
// Intentionally public or harmless routes.
const PUBLIC = new Set(["pdf/get-url", "pdf/proxy-image"]);
// Minimal valid query strings so routes get past parameter validation to the auth check.
const QUERY: Record<string, string> = {
  "qwik-info/bowel-checks": "?teamId=00000000-0000-4000-8000-000000000000&organizationId=00000000-0000-4000-8000-000000000000",
  "qwik-info/fluid-checks": "?teamId=00000000-0000-4000-8000-000000000000&organizationId=00000000-0000-4000-8000-000000000000",
  "qwik-info/weight-checks": "?teamId=00000000-0000-4000-8000-000000000000&organizationId=00000000-0000-4000-8000-000000000000",
  "storage/object": "?bucket=resident-files&path=x/y.pdf",
};

test.describe("API routes reject anonymous callers", () => {
  for (const r of ROUTES.filter((x) => !PUBLIC.has(x.file))) {
    test(`${r.method} ${r.url} -> 401/403 without a session`, async ({ request }) => {
      const res = await request.fetch(r.url + (QUERY[r.file] ?? ""), {
        method: r.method,
        data: r.method === "GET" || r.method === "DELETE" ? undefined : {},
        failOnStatusCode: false,
      });
      // 500 means the handler crashed before authenticating; 2xx means data/actions are exposed.
      expect.soft(res.status(), await res.text().catch(() => "")).toBeGreaterThanOrEqual(400);
      expect([401, 403]).toContain(res.status());
    });
  }

  test("cron routes reject a wrong bearer secret", async ({ request }) => {
    for (const r of ROUTES.filter((x) => x.file.startsWith("cron/"))) {
      const res = await request.get(r.url, { headers: { authorization: "Bearer wrong" }, failOnStatusCode: false });
      expect({ url: r.url, status: res.status() }).toEqual({ url: r.url, status: 401 });
    }
  });

  test("cron routes accept the configured secret (positive control)", async ({ request }) => {
    const res = await request.get("/api/cron/night-check-cleanup", {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      failOnStatusCode: false,
    });
    expect(res.status()).not.toBe(401);
  });

  test("proxy-image refuses non-Supabase hosts (SSRF guard)", async ({ request }) => {
    for (const target of [
      "http://169.254.169.254/latest/meta-data/",
      "http://localhost:3100/api/cron/database-maintenance",
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}@evil.example/x.png`,
    ]) {
      const res = await request.get(`/api/pdf/proxy-image?url=${encodeURIComponent(target)}`, { failOnStatusCode: false });
      expect({ target, status: res.status() }).toEqual({ target, status: 403 });
    }
  });
});

test.describe("API routes enforce tenancy for signed-in users", () => {
  test("org A nurse cannot list appointments of an org B resident", async ({ page }) => {
    await login(page, "A1.nurse");
    const res = await page.request.get(`/api/appointments/resident/${world().homes.B1.residentId}`, {
      failOnStatusCode: false,
    });
    const body = res.ok() ? await res.json() : null;
    const rows = Array.isArray(body) ? body : ((body?.data ?? body?.appointments ?? []) as unknown[]);
    expect(rows).toEqual([]);
  });

  test("org A nurse cannot read progress notes of an org B resident", async ({ page }) => {
    await login(page, "A1.nurse");
    const res = await page.request.get(`/api/progress-notes?residentId=${world().homes.B1.residentId}`, {
      failOnStatusCode: false,
    });
    const body = res.ok() ? await res.json() : null;
    const rows = Array.isArray(body) ? body : ((body?.data ?? body?.notes ?? []) as unknown[]);
    expect(rows).toEqual([]);
  });

  test("BUG: org A nurse cannot resolve photo-refresh alerts of an org B resident", async ({ page }) => {
    const w = world();
    const admin = serviceClient();
    const { data: alert, error } = await admin
      .from("alerts")
      .insert({
        resident_id: w.homes.B1.residentId,
        organization_id: w.homes.B1.orgId,
        care_home_id: w.homes.B1.careHomeId,
        type: "resident_photo_refresh_required",
        title: "Photo refresh required",
        message: "Resident photo is out of date",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await login(page, "A1.nurse");
    const res = await page.request.post("/api/alerts/resolve-photo-refresh", {
      data: { residentId: w.homes.B1.residentId },
      failOnStatusCode: false,
    });
    expect(res.status()).toBe(404);
    const { data: after } = await admin.from("alerts").select("is_resolved").eq("id", alert!.id).single();
    expect(after?.is_resolved).toBe(false);
  });

  test("nurse resolves photo-refresh alerts of a resident in their own home (positive control)", async ({ page }) => {
    const w = world();
    const admin = serviceClient();
    const { data: alert, error } = await admin
      .from("alerts")
      .insert({
        resident_id: w.homes.A1.residentId,
        organization_id: w.homes.A1.orgId,
        care_home_id: w.homes.A1.careHomeId,
        type: "resident_photo_refresh_required",
        title: "Photo refresh required",
        message: "Resident photo is out of date",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await login(page, "A1.nurse");
    const res = await page.request.post("/api/alerts/resolve-photo-refresh", { data: { residentId: w.homes.A1.residentId } });
    expect(res.status()).toBe(200);
    const { data: after } = await admin.from("alerts").select("is_resolved, resolved_by").eq("id", alert!.id).single();
    expect(after).toEqual({ is_resolved: true, resolved_by: w.users["A1.nurse"].id });
  });
});
