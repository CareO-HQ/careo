/**
 * Shared validators for clinical data entered in forms.
 */

/** NHS / H&C number: 10 digits (spaces allowed) with a valid Modulus 11 check digit. */
export function isValidNhsNumber(value: string): boolean {
  const digits = value.replace(/\s+/g, "");
  if (!/^\d{10}$/.test(digits)) return false;
  const sum = digits
    .slice(0, 9)
    .split("")
    .reduce((acc, d, i) => acc + Number(d) * (10 - i), 0);
  const check = 11 - (sum % 11);
  if (check === 10) return false;
  return (check === 11 ? 0 : check) === Number(digits[9]);
}

/** A real calendar date in YYYY-MM-DD form (rejects "yesterday", 2026-02-30, ...). */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** True when the YYYY-MM-DD date is after today (UTC calendar day). */
export function isFutureIsoDate(value: string): boolean {
  return value > new Date().toISOString().slice(0, 10);
}

/** 24-hour "HH:mm" time. */
export function isHHmm(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
