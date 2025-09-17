import { z } from "zod";

export const longTermFallsRiskAssessmentSchema = z.object({
  // Metadata
  residentId: z.string(),
  teamId: z.string(),
  organizationId: z.string(),
  userId: z.string(),

  // 1
  age: z.enum(["65-80", "81-85", "86+"]),
  gender: z.enum(["MALE", "FEMALE"]),
  historyOfFalls: z.enum([
    "RECURRENT-LAST-12",
    "FALL-LAST-12",
    "FALL-MORE-THAN-12",
    "NEVER"
  ]),
  mobilityLevel: z.enum([
    "ASSISTANCE-1-AID",
    "ASSISTANCE-2-AID",
    "INDEPENDENT-WITH-AID",
    "INDEPENDENT-SAFE-UNAIDED",
    "IMMOBILE"
  ]),
  standUnsupported: z.boolean(),

  // 2.
  personalActivities: z.enum([
    "ASSISTANCE",
    "INDEPENDENT-EQUIPMENT",
    "INDEPENDENT-SAFE"
  ]),
  domesticActivities: z
    .enum(["ASSISTANCE", "INDEPENDENT-EQUIPMENT", "INDEPENDENT-SAFE"])
    .optional(),
  footwear: z.enum(["UNSAFE", "SAFE"]),
  visionProblems: z.boolean(),
  bladderBowelMovement: z.enum([
    "FREQUENCY",
    "IDENTIFIED-PROBLEMS",
    "NO-PROBLEMS"
  ]),
  residentEnvironmentalRisks: z.boolean(),
  socialRisks: z.enum(["LIVES-ALONE", "LIMITED-SUPPORT", "24H-CARE"]),
  medicalCondition: z.enum([
    "NEUROLOGICAL-PROBLEMS",
    "POSTURAL",
    "CARDIAC",
    "SKELETAL-CONDITION",
    "FRACTURES",
    "LISTED-CONDITIONS",
    "NO-IDENTIFIED"
  ]),

  // 3.
  medicines: z.enum(["4-OR-MORE", "LESS-4", "NO-MEDICATIONS"]),
  safetyAwarness: z.boolean(),
  mentalState: z.enum(["CONFUSED", "ORIENTATED"]),
  completedBy: z.string(),
  completionDate: z.string()
});

export type LongTermFallsRiskAssessment = z.infer<
  typeof longTermFallsRiskAssessmentSchema
>;

// Scoring system for Long Term Falls Risk Assessment
export const fallsRiskScoring = {
  age: {
    "65-80": 1,
    "81-85": 2,
    "86+": 3
  },
  gender: {
    MALE: 1,
    FEMALE: 3
  },
  historyOfFalls: {
    NEVER: 0,
    "FALL-MORE-THAN-12": 1,
    "FALL-LAST-12": 2,
    "RECURRENT-LAST-12": 3
  },
  mobilityLevel: {
    "INDEPENDENT-SAFE-UNAIDED": 0,
    "INDEPENDENT-WITH-AID": 1,
    "ASSISTANCE-1-AID": 3,
    "ASSISTANCE-2-AID": 2,
    IMMOBILE: 0
  },
  standUnsupported: {
    true: 0, // Can stand unsupported
    false: 3 // Cannot stand unsupported
  },
  personalActivities: {
    "INDEPENDENT-SAFE": 0,
    "INDEPENDENT-EQUIPMENT": 1,
    ASSISTANCE: 2
  },
  domesticActivities: {
    "INDEPENDENT-SAFE": 0,
    "INDEPENDENT-EQUIPMENT": 1,
    ASSISTANCE: 2
  },
  footwear: {
    SAFE: 0,
    UNSAFE: 3
  },
  visionProblems: {
    false: 0, // No vision problems
    true: 3 // Has vision problems
  },
  bladderBowelMovement: {
    "NO-PROBLEMS": 0,
    "IDENTIFIED-PROBLEMS": 2,
    FREQUENCY: 3
  },
  residentEnvironmentalRisks: {
    false: 0, // No environmental risks
    true: 3 // Has environmental risks
  },
  socialRisks: {
    "24H-CARE": 1,
    "LIMITED-SUPPORT": 2,
    "LIVES-ALONE": 3
  },
  medicalCondition: {
    "NO-IDENTIFIED": 0,
    POSTURAL: 2,
    CARDIAC: 2,
    "SKELETAL-CONDITION": 2,
    FRACTURES: 2,
    "NEUROLOGICAL-PROBLEMS": 2,
    "LISTED-CONDITIONS": 1
  },
  medicines: {
    "NO-MEDICATIONS": 0,
    "LESS-4": 1,
    "4-OR-MORE": 3
  },
  safetyAwarness: {
    true: 0, // Safety aware
    false: 3 // Not safety aware
  },
  mentalState: {
    ORIENTATED: 0,
    CONFUSED: 3
  }
} as const;

/**
 * Calculate the total falls risk score for an assessment
 * @param assessment The falls risk assessment data
 * @returns Object containing the total score and breakdown by category
 */
export function calculateFallsRiskScore(
  assessment: LongTermFallsRiskAssessment
) {
  const scores = {
    age: fallsRiskScoring.age[assessment.age],
    gender: fallsRiskScoring.gender[assessment.gender],
    historyOfFalls: fallsRiskScoring.historyOfFalls[assessment.historyOfFalls],
    mobilityLevel: fallsRiskScoring.mobilityLevel[assessment.mobilityLevel],
    standUnsupported:
      fallsRiskScoring.standUnsupported[assessment.standUnsupported.toString()],
    personalActivities:
      fallsRiskScoring.personalActivities[assessment.personalActivities],
    domesticActivities: assessment.domesticActivities
      ? fallsRiskScoring.domesticActivities[assessment.domesticActivities]
      : 0,
    footwear: fallsRiskScoring.footwear[assessment.footwear],
    visionProblems:
      fallsRiskScoring.visionProblems[assessment.visionProblems.toString()],
    bladderBowelMovement:
      fallsRiskScoring.bladderBowelMovement[assessment.bladderBowelMovement],
    residentEnvironmentalRisks:
      fallsRiskScoring.residentEnvironmentalRisks[
        assessment.residentEnvironmentalRisks.toString()
      ],
    socialRisks: fallsRiskScoring.socialRisks[assessment.socialRisks],
    medicalCondition:
      fallsRiskScoring.medicalCondition[assessment.medicalCondition],
    medicines: fallsRiskScoring.medicines[assessment.medicines],
    safetyAwarness:
      fallsRiskScoring.safetyAwarness[assessment.safetyAwarness.toString()],
    mentalState: fallsRiskScoring.mentalState[assessment.mentalState]
  };

  const totalScore = Object.values(scores).reduce(
    (sum, score) => sum + score,
    0
  );

  return {
    totalScore,
    breakdown: scores,
    riskLevel: getRiskLevel(totalScore)
  };
}

/**
 * Determine the risk level based on total score
 * @param score The total falls risk score
 * @returns Risk level classification
 */
export function getRiskLevel(
  score: number
): "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH" {
  if (score <= 10) return "LOW";
  if (score <= 20) return "MODERATE";
  if (score <= 35) return "HIGH";
  return "VERY_HIGH";
}

/**
 * Get risk level with description
 * @param score The total falls risk score
 * @returns Object with risk level and description
 */
export function getRiskLevelWithDescription(score: number) {
  const level = getRiskLevel(score);
  const descriptions = {
    LOW: "Low risk - Standard precautions",
    MODERATE: "Moderate risk - Increased monitoring and interventions",
    HIGH: "High risk - Comprehensive interventions required",
    VERY_HIGH: "Very high risk - Immediate and intensive interventions required"
  };

  return {
    level,
    description: descriptions[level],
    score
  };
}
