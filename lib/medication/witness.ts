/** Staff shown in a medication witness picker. */
export interface WitnessCandidate {
  userId: string;
  role?: string | null;
}

/**
 * A witness is a second member of care staff: never the person administering, and
 * never the organisation owner.
 */
export function isEligibleWitness(member: WitnessCandidate, currentUserId?: string | null): boolean {
  if (currentUserId && member.userId === currentUserId) return false;
  return member.role !== "owner";
}
