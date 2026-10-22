import { createHmac, randomInt } from "node:crypto";

/**
 * One-time MFA backup codes (server only).
 *
 * Codes are 10 characters from an unambiguous base32 alphabet (~50 bits), shown as
 * "xxxxx-xxxxx". Only an HMAC-SHA256 of the normalised code is stored, keyed with the
 * MFA_BACKUP_CODE_PEPPER secret; the high entropy makes a slow hash unnecessary.
 */

export const BACKUP_CODE_COUNT = 10;
const CODE_LENGTH = 10;
// No 0/o, 1/i/l: easy to read back from paper.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function generateBackupCodes(count: number = BACKUP_CODE_COUNT): string[] {
  const codes = new Set<string>();
  while (codes.size < count) {
    let raw = "";
    for (let i = 0; i < CODE_LENGTH; i++) raw += ALPHABET[randomInt(ALPHABET.length)];
    codes.add(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return [...codes];
}

/** Lowercases and strips spaces and dashes so "ABCDE-FGHIJ" and "abcde fghij" match. */
export function normalizeBackupCode(code: string): string {
  return code.toLowerCase().replace(/[\s-]/g, "");
}

export function hashBackupCode(code: string, pepper: string = getPepper()): string {
  return createHmac("sha256", pepper).update(normalizeBackupCode(code)).digest("hex");
}

function getPepper(): string {
  const pepper = process.env.MFA_BACKUP_CODE_PEPPER;
  if (!pepper) throw new Error("MFA_BACKUP_CODE_PEPPER is not configured");
  return pepper;
}
