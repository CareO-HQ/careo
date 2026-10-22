"use server";

import resend from "@/lib/resend";
import { requiresMfa } from "@/lib/mfa";
import { BACKUP_CODE_COUNT, generateBackupCodes, hashBackupCode } from "@/lib/mfa-backup-codes";
import {
  AuthorizationError,
  assertCareHomeInScope,
  getPasswordSession,
  getServiceClient,
  isManagerLevel,
  loadProfile,
  requireSessionActor,
  type ActorProfile,
} from "@/lib/server-auth";

/**
 * Authenticator-app MFA server actions: backup codes, manager reset and the audit trail.
 * All writes go through the service role; mfa_backup_codes has no client access at all.
 */

type MfaEventType =
  | "manager_reset"
  | "backup_code_used"
  | "backup_code_failed"
  | "backup_codes_regenerated"
  | "device_replaced";

export type MfaActionResult<T = object> = ({ success: true } & T) | { success: false; error: string };

const FAILED_ATTEMPT_LIMIT = 5;
const FAILED_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof AuthorizationError ? error.message : fallback;
}

async function recordMfaEvent(
  profile: Pick<ActorProfile, "id" | "active_organization_id" | "active_care_home_id">,
  eventType: MfaEventType,
  actorId: string | null = profile.id
): Promise<void> {
  const { error } = await getServiceClient().from("mfa_events").insert({
    user_id: profile.id,
    actor_id: actorId,
    organization_id: profile.active_organization_id,
    care_home_id: profile.active_care_home_id,
    event_type: eventType,
  });
  if (error) throw new Error(`Failed to record MFA event: ${error.message}`);
}

/** Removes every authenticator factor and backup code a user has. */
async function clearUserMfa(userId: string): Promise<void> {
  const admin = getServiceClient();
  const { data, error } = await admin.auth.admin.mfa.listFactors({ userId });
  if (error) throw new Error(`Failed to list factors: ${error.message}`);
  // Deleting a verified factor also signs the user out of all sessions.
  for (const factor of data.factors) {
    const { error: deleteError } = await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId });
    if (deleteError) throw new Error(`Failed to delete factor: ${deleteError.message}`);
  }
  const { error: codesError } = await admin.from("mfa_backup_codes").delete().eq("user_id", userId);
  if (codesError) throw new Error(`Failed to delete backup codes: ${codesError.message}`);
}

/**
 * Issues a fresh set of backup codes for the signed-in (aal2) user, replacing any earlier set.
 * The plaintext codes are returned once and never stored.
 */
export async function createBackupCodes(
  reason: "enrolment" | "regenerate"
): Promise<MfaActionResult<{ codes: string[] }>> {
  try {
    const actor = await requireSessionActor();
    if (!requiresMfa(actor.role)) throw new AuthorizationError("Backup codes are not used for your role.");

    const admin = getServiceClient();
    const codes = generateBackupCodes();
    const { error: deleteError } = await admin.from("mfa_backup_codes").delete().eq("user_id", actor.id);
    if (deleteError) throw new Error(deleteError.message);
    const { error: insertError } = await admin
      .from("mfa_backup_codes")
      .insert(codes.map((code) => ({ user_id: actor.id, code_hash: hashBackupCode(code) })));
    if (insertError) throw new Error(insertError.message);

    if (reason === "regenerate") await recordMfaEvent(actor, "backup_codes_regenerated");
    return { success: true, codes };
  } catch (error) {
    console.error("createBackupCodes failed:", error);
    return { success: false, error: errorMessage(error, "Could not create backup codes.") };
  }
}

/** How many unused backup codes the signed-in user has left. */
export async function getBackupCodeStatus(): Promise<MfaActionResult<{ remaining: number; total: number }>> {
  try {
    const actor = await requireSessionActor();
    const { count, error } = await getServiceClient()
      .from("mfa_backup_codes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", actor.id)
      .is("used_at", null);
    if (error) throw new Error(error.message);
    return { success: true, remaining: count ?? 0, total: BACKUP_CODE_COUNT };
  } catch (error) {
    return { success: false, error: errorMessage(error, "Could not load backup codes.") };
  }
}

/**
 * Recovery when the authenticator is lost. Runs on the password-only (aal1) session.
 * A valid code removes the user's authenticator and remaining codes, which signs them out
 * everywhere; at their next login they set up a new authenticator and get new codes.
 */
export async function redeemBackupCode(code: string): Promise<MfaActionResult> {
  const genericError = "That backup code is not valid.";
  try {
    const session = await getPasswordSession();
    if (!session) throw new AuthorizationError();
    if (!requiresMfa(session.role)) throw new AuthorizationError(genericError);
    const profile = await loadProfile(session.userId);
    const admin = getServiceClient();

    const since = new Date(Date.now() - FAILED_ATTEMPT_WINDOW_MS).toISOString();
    const { count: failures, error: countError } = await admin
      .from("mfa_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.userId)
      .eq("event_type", "backup_code_failed")
      .gte("created_at", since);
    if (countError) throw new Error(countError.message);
    if ((failures ?? 0) >= FAILED_ATTEMPT_LIMIT) {
      return { success: false, error: "Too many attempts. Try again in 15 minutes or ask your manager." };
    }

    // Consume atomically: only one request can flip used_at from null.
    const { data: consumed, error: consumeError } = await admin
      .from("mfa_backup_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("user_id", session.userId)
      .eq("code_hash", hashBackupCode(code))
      .is("used_at", null)
      .select("id");
    if (consumeError) throw new Error(consumeError.message);

    if (!consumed || consumed.length === 0) {
      await recordMfaEvent(profile, "backup_code_failed");
      return { success: false, error: genericError };
    }

    await clearUserMfa(session.userId);
    await recordMfaEvent(profile, "backup_code_used");
    if (session.email) await sendBackupCodeUsedEmail(session.email);
    return { success: true };
  } catch (error) {
    console.error("redeemBackupCode failed:", error);
    return { success: false, error: errorMessage(error, "Could not check the backup code.") };
  }
}

async function sendBackupCodeUsedEmail(email: string): Promise<void> {
  const result = await resend.emails.send({
    from: "CareO <care@careo.uk>",
    to: [email],
    subject: "A backup code was used to sign in to CareO",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Security notice</h2>
        <p>A backup code was just used to sign in to your CareO account, and your authenticator app was removed.
        You will be asked to set up a new authenticator the next time you sign in.</p>
        <p><strong>If this wasn't you</strong>, contact your manager straight away so they can secure your account.</p>
      </div>
    `,
  });
  // The reset itself succeeded; a failed notice is logged, not surfaced to the user.
  if (result.error) console.error("Backup code notice email failed:", result.error);
}

/** Records that the signed-in user moved their authenticator to a new device. */
export async function recordDeviceReplaced(): Promise<MfaActionResult> {
  try {
    const actor = await requireSessionActor();
    await recordMfaEvent(actor, "device_replaced");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error, "Could not record the change.") };
  }
}

const SENIOR_ROLES = new Set(["owner", "saas_admin"]);

/**
 * A manager removes a staff member's authenticator and backup codes (lost phone, no codes).
 * The staff member is signed out and sets up a new authenticator at their next login.
 */
export async function resetUserMfa(targetUserId: string): Promise<MfaActionResult> {
  try {
    const actor = await requireSessionActor();
    if (!isManagerLevel(actor)) throw new AuthorizationError("Only managers can reset an authenticator.");
    if (targetUserId === actor.id) {
      throw new AuthorizationError("You cannot reset your own authenticator. Use a backup code or ask another manager.");
    }

    const target = await loadProfile(targetUserId);
    if (!requiresMfa(target.role)) throw new AuthorizationError("This staff member does not use an authenticator.");

    if (!actor.is_saas_admin) {
      if (!target.active_organization_id || target.active_organization_id !== actor.active_organization_id) {
        throw new AuthorizationError("This staff member is outside your organization.");
      }
      if (actor.role !== "owner") {
        if (!target.active_care_home_id) throw new AuthorizationError("This staff member is outside your care home.");
        await assertCareHomeInScope(actor, target.active_care_home_id);
      }
    }
    const targetIsSenior = target.is_saas_admin || SENIOR_ROLES.has(target.role);
    const actorIsSenior = actor.is_saas_admin || SENIOR_ROLES.has(actor.role);
    if (targetIsSenior && !actorIsSenior) {
      throw new AuthorizationError("Only an owner can reset this account's authenticator.");
    }

    await clearUserMfa(targetUserId);
    const { error: revokeError } = await getServiceClient().rpc("revoke_user_sessions", {
      p_user_id: targetUserId,
    });
    if (revokeError) throw new Error(revokeError.message);
    await recordMfaEvent(target, "manager_reset", actor.id);
    return { success: true };
  } catch (error) {
    console.error("resetUserMfa failed:", error);
    return { success: false, error: errorMessage(error, "Could not reset the authenticator.") };
  }
}
