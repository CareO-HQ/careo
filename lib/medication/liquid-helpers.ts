/**
 * Liquid Medication Helpers
 * 
 * Shared utilities for detecting and handling liquid dosage forms
 * (Drops, Syrup, Spray, Liquid). These forms use a bottles × ml-per-bottle
 * model for stock management instead of simple unit counts.
 */

/** Dosage forms that are considered "liquid" and use volume-based (ml) stock tracking */
export const LIQUID_DOSAGE_FORMS = ["Liquid", "Syrup", "Drops", "Spray"] as const;

/**
 * Check if a dosage form is a liquid type that requires volume-based stock tracking.
 * Performs a case-insensitive check against the known liquid dosage forms.
 */
export function isLiquidDosageForm(dosageForm: string | undefined | null): boolean {
  if (!dosageForm) return false;
  const lower = dosageForm.toLowerCase();
  return LIQUID_DOSAGE_FORMS.some((form) => form.toLowerCase() === lower);
}
