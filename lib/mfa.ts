import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Authenticator-app (TOTP) MFA rules shared by the login pages, middleware and server helpers.
 *
 * Every role must complete TOTP (session AAL "aal2") except external staff (MDT, RQIA) and
 * agency staff. The same list is mirrored in SQL by public.mfa_satisfied(), which RLS uses;
 * tests/db/mfa-enforcement.test.ts keeps the two in sync.
 */
export const MFA_EXEMPT_ROLES = ["mdt", "rqia", "agency_nurse", "agency_care_assistant"] as const;

export const MFA_VERIFY_PATH = "/login/two-factor";
export const MFA_ENROLL_PATH = "/login/setup-authenticator";

/** "none": nothing to do; "verify": enter a code from the enrolled app; "enroll": set up an app first. */
export type MfaStep = "none" | "enroll" | "verify";

export type AuthenticatorLevel = "aal1" | "aal2";

export function requiresMfa(role?: string | null): boolean {
  return !(MFA_EXEMPT_ROLES as readonly string[]).includes(role ?? "");
}

/** Decides the MFA step from the role and Supabase's current/next assurance levels. */
export function resolveMfaStep(
  role: string | null | undefined,
  currentLevel: AuthenticatorLevel | null,
  nextLevel: AuthenticatorLevel | null
): MfaStep {
  if (!requiresMfa(role)) return "none";
  if (currentLevel === "aal2") return "none";
  // nextLevel is aal2 only when the user has a verified factor to challenge.
  if (nextLevel === "aal2") return "verify";
  return "enroll";
}

export async function getMfaStep(
  supabase: Pick<SupabaseClient, "auth">,
  role: string | null | undefined
): Promise<MfaStep> {
  if (!requiresMfa(role)) return "none";
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  // Fail closed: when the level cannot be read, ask for a code rather than letting the user through.
  if (error || !data) return "verify";
  return resolveMfaStep(role, data.currentLevel, data.nextLevel);
}

export function mfaStepPath(step: Exclude<MfaStep, "none">): string {
  return step === "verify" ? MFA_VERIFY_PATH : MFA_ENROLL_PATH;
}

interface AccessTokenPayload {
  aal?: string;
}

/** Decodes a Supabase access token's payload without verifying it (the caller already did). */
function decodeAccessToken(accessToken: string | null | undefined): AccessTokenPayload | null {
  const payloadPart = accessToken?.split(".")[1];
  if (!payloadPart) return null;
  try {
    const json = atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/"));
    const payload: unknown = JSON.parse(json);
    return typeof payload === "object" && payload !== null ? (payload as AccessTokenPayload) : null;
  } catch {
    return null;
  }
}

export function getAalFromAccessToken(accessToken: string | null | undefined): AuthenticatorLevel | null {
  const aal = decodeAccessToken(accessToken)?.aal;
  return aal === "aal1" || aal === "aal2" ? aal : null;
}
