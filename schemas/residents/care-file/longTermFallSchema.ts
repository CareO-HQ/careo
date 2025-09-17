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
