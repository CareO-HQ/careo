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
  residentName: z.string().min(1, "Resident name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  dateOfAssessment: z.string().min(1, "Date of assessment is required"),
  time: z.string().min(1, "Time is required"),

  // Respiratory Risks (10 points each if YES)
  weakCough: z.boolean().optional(),
  chestInfections: z.boolean().optional(),
  breathingDifficulties: z.boolean().optional(),
  knownToAspirate: z.boolean().optional(),
  chokingHistory: z.boolean().optional(),
  gurgledVoice: z.boolean().optional(),

  // At Risk Groups
  epilepsy: z.boolean().optional(), // 4 points
  cerebralPalsy: z.boolean().optional(), // 10 points
  dementia: z.boolean().optional(), // 4 points
  mentalHealth: z.boolean().optional(), // 4 points
  neurologicalConditions: z.boolean().optional(), // 10 points
  learningDisabilities: z.boolean().optional(), // 10 points

  // Physical Risks
  posturalProblems: z.boolean().optional(), // 10 points
  poorHeadControl: z.boolean().optional(), // 10 points
  tongueThrust: z.boolean().optional(), // 10 points
  chewingDifficulties: z.boolean().optional(), // 10 points
  slurredSpeech: z.boolean().optional(), // 8 points
  neckTrauma: z.boolean().optional(), // 8 points
  poorDentition: z.boolean().optional(), // 8 points

  // Eating Behaviours
  eatsRapidly: z.boolean().optional(), // 10 points
  drinksRapidly: z.boolean().optional(), // 10 points
  eatsWhileCoughing: z.boolean().optional(), // 10 points
  drinksWhileCoughing: z.boolean().optional(), // 10 points
  crammingFood: z.boolean().optional(), // 10 points
  pocketingFood: z.boolean().optional(), // 8 points
  swallowingWithoutChewing: z.boolean().optional(), // 8 points
  wouldTakeFood: z.boolean().optional(), // 4 points

  // Protective Factors (2 points if NO - meaning lack of independence adds risk)
  drinksIndependently: z.boolean().optional(),
  eatsIndependently: z.boolean().optional(),

  // Additional fields
  completedBy: z.string().min(1, "Completed by is required"),
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

  // Respiratory Risks (10 points each if YES)
  if (data.weakCough) score += 10;
  if (data.chestInfections) score += 10;
  if (data.breathingDifficulties) score += 10;
  if (data.knownToAspirate) score += 10;
  if (data.chokingHistory) score += 10;
  if (data.gurgledVoice) score += 10;

  // At Risk Groups (varying points)
  if (data.epilepsy) score += 4;
  if (data.cerebralPalsy) score += 10;
  if (data.dementia) score += 4;
  if (data.mentalHealth) score += 4;
  if (data.neurologicalConditions) score += 10;
  if (data.learningDisabilities) score += 10;

  // Physical Risks (8 or 10 points)
  if (data.posturalProblems) score += 10;
  if (data.poorHeadControl) score += 10;
  if (data.tongueThrust) score += 10;
  if (data.chewingDifficulties) score += 10;
  if (data.slurredSpeech) score += 8;
  if (data.neckTrauma) score += 8;
  if (data.poorDentition) score += 8;

  // Eating Behaviours (4, 8, or 10 points)
  if (data.eatsRapidly) score += 10;
  if (data.drinksRapidly) score += 10;
  if (data.eatsWhileCoughing) score += 10;
  if (data.drinksWhileCoughing) score += 10;
  if (data.crammingFood) score += 10;
  if (data.pocketingFood) score += 8;
  if (data.swallowingWithoutChewing) score += 8;
  if (data.wouldTakeFood) score += 4;

  // Protective Factors (2 points if NO - meaning lack of independence adds risk)
  if (data.drinksIndependently === false) score += 2;
  if (data.eatsIndependently === false) score += 2;

  return score;
}

/**
 * Get risk level based on total score
 * @param score - Total choking risk score
 * @returns Risk level description
 */
export function getChokingRiskLevel(score: number): string {
  if (score === 0) return "No Risk";
  if (score <= 10) return "Low Risk";
  if (score <= 30) return "Medium Risk";
  if (score <= 50) return "High Risk";
  return "Very High Risk";
}
