import { z } from "zod";

/**
 * Choking Risk Assessment Schema
 *
 * Scoring System:
 * - Respiratory Risks: 10 points each if YES
 * - At Risk Groups: 4 or 10 points each if YES
 * - Physical Risks: 8 or 10 points each if YES
 * - Eating Behaviours: 4, 8, or 10 points each if YES
 * - Protective Factors: 2 points subtracted if NO (meaning lack of independence adds risk)
 * - Poor Dentition: 8 points if YES
 */

export const chokingRiskAssessmentSchema = z.object({
  // Administrative Information
  residentName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  dateOfAssessment: z.string().optional(),
  nextReviewDate: z.string().optional(),
  time: z.string().optional(),

  // 1. Respiratory Risks (10 points each if YES)
  weakCough: z.boolean().default(false),
  chestInfections: z.boolean().default(false),
  breathingDifficulties: z.boolean().default(false),
  knownToAspirate: z.boolean().default(false),
  chokingHistory: z.boolean().default(false),
  gurgledVoice: z.boolean().default(false),

  // 2. At Risk Groups
  epilepsy: z.boolean().default(false), // 4 points
  cerebralPalsy: z.boolean().default(false), // 4 points
  dementia: z.boolean().default(false), // 4 points
  mentalHealth: z.boolean().default(false), // 4 points
  neurologicalConditions: z.boolean().default(false), // 10 points
  learningDisabilities: z.boolean().default(false), // 10 points

  // 3. Physical Risks
  posturalProblems: z.boolean().default(false), // 8 points
  poorHeadControl: z.boolean().default(false), // 8 points
  tongueThrust: z.boolean().default(false), // 8 points
  chewingDifficulties: z.boolean().default(false), // 8 points
  slurredSpeech: z.boolean().default(false), // 10 points
  neckTrauma: z.boolean().default(false), // 10 points

  // 4. Risks Associated with Eating Behaviours
  eatsRapidly: z.boolean().default(false), // 8 points
  drinksRapidly: z.boolean().default(false), // 8 points
  eatsWhileCoughing: z.boolean().default(false), // 8 points
  drinksWhileCoughing: z.boolean().default(false), // 8 points
  crammingFood: z.boolean().default(false), // 10 points
  pocketingFood: z.boolean().default(false), // 10 points
  swallowingWithoutChewing: z.boolean().default(false), // 10 points
  wouldTakeFood: z.boolean().default(false), // 4 points

  // 5. Risks Associated with Eating
  drinksIndependentlySafely: z.boolean().default(false), // -2 points
  eatsIndependentlySafely: z.boolean().default(false), // -2 points
  poorDentition: z.boolean().default(false), // 8 points
  fatigueAtMealtimes: z.boolean().default(false), // 8 points
  needsFoodCutting: z.boolean().default(false), // 6 points
  texturedModifiedDiet: z.boolean().default(false), // 10 points
  thickenedFluids: z.boolean().default(false), // 10 points
  specialistFeedingAids: z.boolean().default(false), // 5 points
  specialistDrinkingAids: z.boolean().default(false), // 5 points

  // 6. Food Recognition
  acceptAnyItem: z.boolean().default(false), // 10 points
  acceptAnyItemAndSwallow: z.boolean().default(false), // 10 points

  // 7. Medication
  medicationAffectingSwallowing: z.boolean().default(false), // 10 points

  // Additional fields
  completedBy: z.string().optional(),
  signature: z.string().optional(),

  // System fields
  residentId: z.string().optional(),
  teamId: z.string().optional(),
  organizationId: z.string().optional(),
  userId: z.string().optional(),
  savedAsDraft: z.boolean().optional(),
});

export type ChokingRiskAssessmentFormData = z.infer<typeof chokingRiskAssessmentSchema>;

/**
 * Calculate total choking risk score based on assessment responses
 * @param data - The choking risk assessment form data
 * @returns Total risk score
 */
export function calculateChokingRiskScore(data: Partial<ChokingRiskAssessmentFormData>): number {
  let score = 0;

  // 1. Respiratory Risks (10 pts each)
  if (data.weakCough) score += 10;
  if (data.chestInfections) score += 10;
  if (data.breathingDifficulties) score += 10;
  if (data.knownToAspirate) score += 10;
  if (data.chokingHistory) score += 10;
  if (data.gurgledVoice) score += 10;

  // 2. At Risk Groups
  if (data.epilepsy) score += 4;
  if (data.cerebralPalsy) score += 4;
  if (data.dementia) score += 4;
  if (data.mentalHealth) score += 4;
  if (data.neurologicalConditions) score += 10;
  if (data.learningDisabilities) score += 10;

  // 3. Physical Risks
  if (data.posturalProblems) score += 8;
  if (data.poorHeadControl) score += 8;
  if (data.tongueThrust) score += 8;
  if (data.chewingDifficulties) score += 8;
  if (data.slurredSpeech) score += 10;
  if (data.neckTrauma) score += 10;

  // 4. Eating Behaviours
  if (data.eatsRapidly) score += 8;
  if (data.drinksRapidly) score += 8;
  if (data.eatsWhileCoughing) score += 8;
  if (data.drinksWhileCoughing) score += 8;
  if (data.crammingFood) score += 10;
  if (data.pocketingFood) score += 10;
  if (data.swallowingWithoutChewing) score += 10;
  if (data.wouldTakeFood) score += 4;

  // 5. Risks Associated with Eating
  if (data.drinksIndependentlySafely) score -= 2;
  if (data.eatsIndependentlySafely) score -= 2;
  if (data.poorDentition) score += 8;
  if (data.fatigueAtMealtimes) score += 8;
  if (data.needsFoodCutting) score += 6;
  if (data.texturedModifiedDiet) score += 10;
  if (data.thickenedFluids) score += 10;
  if (data.specialistFeedingAids) score += 5;
  if (data.specialistDrinkingAids) score += 5;

  // 6. Food Recognition
  if (data.acceptAnyItem) score += 10;
  if (data.acceptAnyItemAndSwallow) score += 10;

  // 7. Medication
  if (data.medicationAffectingSwallowing) score += 10;

  return score;
}

/**
 * Get risk level based on total score
 * @param score - Total choking risk score
 * @returns Risk level description
 */
export function getChokingRiskLevel(score: number): string {
  if (score <= 24) return "Low Risk";
  if (score <= 49) return "Medium Risk";
  return "High Risk";
}
