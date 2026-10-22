import { describe, expect, it } from "vitest";
import {
  MFA_EXEMPT_ROLES,
  getAalFromAccessToken,
  getMfaStep,
  requiresMfa,
  resolveMfaStep,
} from "@/lib/mfa";
import {
  BACKUP_CODE_COUNT,
  generateBackupCodes,
  hashBackupCode,
  normalizeBackupCode,
} from "@/lib/mfa-backup-codes";
import { getPostLoginPath, withLoginParams } from "@/lib/post-login-route";
import { BackupCodeSchema } from "@/schemas/auth/TwoFactorSchema";

describe("requiresMfa", () => {
  it.each(["owner", "manager", "nurse", "care_assistant", "kitchen_staff", "saas_admin"])(
    "requires MFA for %s",
    (role) => {
      expect(requiresMfa(role)).toBe(true);
    }
  );

  it.each(["mdt", "rqia", "agency_nurse", "agency_care_assistant"])("exempts %s", (role) => {
    expect(requiresMfa(role)).toBe(false);
  });

  it("requires MFA when the role is unknown or missing (fail closed)", () => {
    expect(requiresMfa(undefined)).toBe(true);
    expect(requiresMfa(null)).toBe(true);
    expect(requiresMfa("")).toBe(true);
    expect(requiresMfa("MDT")).toBe(true);
  });

  it("exempt list is exactly external + agency staff", () => {
    expect([...MFA_EXEMPT_ROLES].sort()).toEqual(["agency_care_assistant", "agency_nurse", "mdt", "rqia"]);
  });
});

describe("resolveMfaStep", () => {
  it.each([
    ["aal2", "aal2", "none"],
    ["aal1", "aal2", "verify"],
    ["aal1", "aal1", "enroll"],
    [null, null, "enroll"],
  ] as const)("current=%s next=%s -> %s", (current, next, step) => {
    expect(resolveMfaStep("nurse", current, next)).toBe(step);
  });

  it("is always none for an exempt role", () => {
    expect(resolveMfaStep("agency_nurse", "aal1", "aal1")).toBe("none");
  });
});

describe("getMfaStep", () => {
  const client = (result: { data: { currentLevel: "aal1" | "aal2"; nextLevel: "aal1" | "aal2" } | null; error: Error | null }) =>
    ({ auth: { mfa: { getAuthenticatorAssuranceLevel: async () => result } } }) as unknown as Parameters<typeof getMfaStep>[0];

  it("asks for a code when the level cannot be read (fail closed)", async () => {
    expect(await getMfaStep(client({ data: null, error: new Error("boom") }), "nurse")).toBe("verify");
  });

  it("does not call Supabase for exempt roles", async () => {
    const throwing = { auth: { mfa: { getAuthenticatorAssuranceLevel: () => { throw new Error("called"); } } } } as unknown as Parameters<typeof getMfaStep>[0];
    expect(await getMfaStep(throwing, "mdt")).toBe("none");
  });

  it("maps Supabase levels", async () => {
    expect(await getMfaStep(client({ data: { currentLevel: "aal1", nextLevel: "aal2" }, error: null }), "nurse")).toBe("verify");
  });
});

describe("getAalFromAccessToken", () => {
  const token = (payload: object) =>
    `h.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.sig`;

  it("reads aal1 / aal2", () => {
    expect(getAalFromAccessToken(token({ aal: "aal1" }))).toBe("aal1");
    expect(getAalFromAccessToken(token({ aal: "aal2", sub: "x" }))).toBe("aal2");
  });

  it("returns null for missing, unknown or malformed tokens", () => {
    expect(getAalFromAccessToken(undefined)).toBeNull();
    expect(getAalFromAccessToken("not-a-jwt")).toBeNull();
    expect(getAalFromAccessToken("a.%%%.c")).toBeNull();
    expect(getAalFromAccessToken(token({ aal: "aal3" }))).toBeNull();
    expect(getAalFromAccessToken(token({}))).toBeNull();
  });
});

describe("backup codes", () => {
  it("generates 10 unique codes in xxxxx-xxxxx format without ambiguous characters", () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(BACKUP_CODE_COUNT);
    expect(new Set(codes).size).toBe(BACKUP_CODE_COUNT);
    for (const code of codes) {
      expect(code).toMatch(/^[a-hjkmnp-z2-9]{5}-[a-hjkmnp-z2-9]{5}$/);
    }
  });

  it("normalises case, dashes and spaces", () => {
    expect(normalizeBackupCode("ABCDE-FGHJK")).toBe("abcdefghjk");
    expect(normalizeBackupCode(" abcde fghjk ")).toBe("abcdefghjk");
  });

  it("hashes equivalent spellings the same and depends on the pepper", () => {
    const a = hashBackupCode("ABCDE-FGHJK", "pepper-1");
    expect(hashBackupCode("abcdefghjk", "pepper-1")).toBe(a);
    expect(hashBackupCode("abcde fghjk", "pepper-1")).toBe(a);
    expect(hashBackupCode("abcdefghjk", "pepper-2")).not.toBe(a);
    expect(hashBackupCode("abcdefghjm", "pepper-1")).not.toBe(a);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("refuses to hash without a configured pepper", () => {
    const saved = process.env.MFA_BACKUP_CODE_PEPPER;
    delete process.env.MFA_BACKUP_CODE_PEPPER;
    try {
      expect(() => hashBackupCode("abcdefghjk")).toThrow(/MFA_BACKUP_CODE_PEPPER/);
    } finally {
      if (saved !== undefined) process.env.MFA_BACKUP_CODE_PEPPER = saved;
    }
  });

  it("BackupCodeSchema accepts typed variations and rejects junk", () => {
    expect(BackupCodeSchema.parse({ code: "ABCDE-fghjk" }).code).toBe("ABCDEfghjk");
    expect(BackupCodeSchema.safeParse({ code: "abc" }).success).toBe(false);
    expect(BackupCodeSchema.safeParse({ code: "abcde-fgh!k" }).success).toBe(false);
  });
});

describe("post-login routing", () => {
  it("routes by onboarding state and admin flag", () => {
    expect(getPostLoginPath({ is_onboarding_complete: true }, {})).toBe("/dashboard");
    expect(getPostLoginPath({ is_onboarding_complete: true, is_saas_admin: true }, {})).toBe("/admin");
    expect(getPostLoginPath({}, {})).toBe("/onboarding");
    expect(getPostLoginPath({}, { redirect: "accept-invitation", token: "t1" })).toBe("/accept-invitation?token=t1");
  });

  it("sends first-time agency activation to the agency onboarding page", () => {
    expect(
      getPostLoginPath({}, { redirect: "onboarding-agency", token: "tok", email: "a@b.c" })
    ).toBe("/onboarding/agency?token=tok&email=a%40b.c");
  });

  it("carries login params through the MFA pages", () => {
    expect(withLoginParams("/login/two-factor", {})).toBe("/login/two-factor");
    expect(withLoginParams("/login/two-factor", { redirect: "accept-invitation", token: "t", email: null })).toBe(
      "/login/two-factor?redirect=accept-invitation&token=t"
    );
  });
});
