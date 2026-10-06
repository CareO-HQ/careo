import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

interface MockUser {
  id: string;
}

const auth = { user: null as MockUser | null };

vi.mock("@supabase/auth-helpers-nextjs", () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: auth.user } }) },
  }),
}));

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";

const { middleware, config } = await import("@/middleware");

const run = (path: string) => middleware(new NextRequest(new URL(path, "http://localhost:3000")));

function isLoginRedirect(res: Response): boolean {
  const loc = res.headers.get("location");
  return res.status === 307 && !!loc && new URL(loc).pathname === "/login";
}

describe("middleware: authentication gate", () => {
  beforeEach(() => {
    auth.user = null;
  });

  it.each(["/dashboard", "/dashboard/residents/123", "/onboarding", "/admin/organizations"])(
    "redirects anonymous users from %s to /login with redirectedFrom",
    async (path) => {
      const res = await run(path);
      expect(isLoginRedirect(res)).toBe(true);
      expect(new URL(res.headers.get("location")!).searchParams.get("redirectedFrom")).toBe(path);
    }
  );

  it.each(["/", "/login", "/signup", "/reset-password", "/privacy", "/terms", "/onboarding/agency"])(
    "lets anonymous users reach public page %s",
    async (path) => {
      expect(isLoginRedirect(await run(path))).toBe(false);
    }
  );

  it("lets authenticated users through to the dashboard", async () => {
    auth.user = { id: "u1" };
    expect(isLoginRedirect(await run("/dashboard/residents"))).toBe(false);
  });

  it.each(["/settings/profile", "/settings/members", "/settings/organization", "/settings/billing"])(
    "BUG: anonymous user is not redirected from %s (settings not in protectedPathPrefixes)",
    async (path) => {
      expect(isLoginRedirect(await run(path))).toBe(true);
    }
  );

  it.each(["/accept-invitation", "/new-password"])("%s stays public (token-based flows)", async (path) => {
    expect(isLoginRedirect(await run(path))).toBe(false);
  });

  it("public exception is prefix-matched: /onboarding/agency-anything is also public", async () => {
    // Documents current behaviour; only /onboarding/agency(/...) routes exist today.
    expect(isLoginRedirect(await run("/onboarding/agencyX"))).toBe(false);
  });

  it("matcher excludes /api entirely, so every API route must authenticate itself", () => {
    const source = config.matcher[0].source;
    expect(new RegExp(`^${source}$`).test("/api/cron/anything")).toBe(false);
    expect(new RegExp(`^${source}$`).test("/dashboard")).toBe(true);
  });
});

describe("middleware: security headers", () => {
  it("sets a nonce-based CSP that forbids framing and plugins", async () => {
    const res = await run("/login");
    const csp = res.headers.get("content-security-policy") ?? "";
    expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("connect-src 'self' http://127.0.0.1:54321 ws://127.0.0.1:54321");
  });

  it("BUG: lets the dashboard reach its location and weather APIs", async () => {
    const csp = (await run("/dashboard")).headers.get("content-security-policy") ?? "";
    const connectSrc = csp.split("; ").find((directive) => directive.startsWith("connect-src")) ?? "";
    expect(connectSrc).toContain("https://ipapi.co");
    expect(connectSrc).toContain("https://api.open-meteo.com");
  });

  it("uses a fresh nonce per request", async () => {
    const a = (await run("/login")).headers.get("content-security-policy");
    const b = (await run("/login")).headers.get("content-security-policy");
    expect(a).not.toBe(b);
  });

  it("redirect responses also carry the CSP", async () => {
    auth.user = null;
    const res = await run("/dashboard");
    expect(res.headers.get("content-security-policy")).toContain("default-src 'self'");
  });
});
