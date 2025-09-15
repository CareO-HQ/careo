import { z } from "zod";

const ToiletingPattern = z.enum(["TOILET", "COMMODE", "BED-PAN", "URINAL"]);

export const bladderBowelAssessmentSchema = z.object({
  residentId: z.string(),
  teamId: z.string(),
  organizationId: z.string(),
  userId: z.string(),

  // Section 1 - Resident info
  residentName: z.string(),
  dateOfBirth: z.number(),
  bedroomNumber: z.string(),
  informationObtainedFrom: z.string().min(1, { message: "Required" }),

  // Section 2 - Infections
  hepatitisAB: z.boolean().optional(),
  bloodBorneVirues: z.boolean().optional(),
  mrsa: z.boolean().optional(),
  esbl: z.boolean().optional(),
  other: z.string().optional(),

  // Section 3 - Urinalysis on Admission
  ph: z.boolean().optional(),
  nitrates: z.boolean().optional(),
  protein: z.boolean().optional(),
  leucocytes: z.boolean().optional(),
  glucose: z.boolean().optional(),
  bloodResult: z.boolean().optional(),
  mssuDate: z.number().optional(),

  // Section 4 - Prescribed medication
  antiHypertensives: z.boolean().optional(),
  antiParkinsonDrugs: z.boolean().optional(),
  ironSupplement: z.boolean().optional(),
  laxatives: z.boolean().optional(),
  diuretics: z.boolean().optional(),
  histamine: z.boolean().optional(),
  antiDepressants: z.boolean().optional(),
  cholinergic: z.boolean().optional(),
  sedativesHypnotic: z.boolean().optional(),
  antiPsychotic: z.boolean().optional(),
  antihistamines: z.boolean().optional(),
  narcoticAnalgesics: z.boolean().optional(),

  // Section 5 - Lifestyle
  caffeineMls24h: z.number().optional(),
  caffeineFrequency: z.string().optional(),
  caffeineTimeOfDay: z.string().optional(),
  excersiceType: z.string().optional(),
  excersiceFrequency: z.string().optional(),
  excersiceTimeOfDay: z.string().optional(),
  alcoholAmount24h: z.number().optional(),
  alcoholFrequency: z.string().optional(),
  alcoholTimeOfDay: z.string().optional(),
  smoking: z.enum(["SMOKER", "NON-SMOKER", "EX-SMOKER"]),
  weight: z.enum(["NORMAL", "OBESE", "UNDERWEIGHT"]),
  skinCondition: z.enum(["HEALTHY", "RED", "EXCORIATED", "BROKEN"]),
  constipationHistory: z.boolean().optional(),
  mentalState: z.enum([
    "ALERT",
    "CONFUSED",
    "LEARNING-DISABLED",
    "COGNITIVELY-IMPAIRED"
  ]),
  mobilityIssues: z.enum(["INDEPENDENT", "ASSISTANCE", "HOISTED"]),
  historyRecurrentUTIs: z.boolean().optional(),

  // Section 6 - Urinary continence
  incontinence: z.enum([
    "NONE",
    "ONE",
    "1-2DAY",
    "3DAY",
    "NIGHT",
    "DAYANDNIGHT"
  ]),
  volume: z.enum(["ENTIRE-BLADDER", "SMALL-VOL", "UNABLE-DETERMINE"]),
  onset: z.enum(["SUDDEN", "GRADUAL"]),
  duration: z.enum(["LESS-6M", "6M-1Y", "MORE-1Y"]),
  symptompsLastSix: z.enum(["STABLE", "WORSENING", "IMPROVING", "FLUCTUATING"]),
  physicianConsulted: z.boolean().optional(),

  // Section 7 - Bowel pattern
  bowelState: z.enum([
    "NORMAL",
    "CONSTIPATION",
    "DIARRHOEA",
    "STOMA",
    "FAECAL-INCONTINENCE",
    "IRRITABLE-BOWEL"
  ]),
  bowelFrequency: z.string(),
  usualTimeOfDat: z.string(),
  amountAndStoolType: z.string(),
  liquidFeeds: z.string(),
  otherFactors: z.string(),
  otherRemedies: z.string(),
  medicalOfficerConsulted: z.boolean().optional(),

  // Section 8 - Current toileting pattern and products in use
  dayPattern: ToiletingPattern,
  eveningPattern: ToiletingPattern,
  nightPattern: ToiletingPattern,
  typesOfPads: z.string(),

  // Section 9 - Symptoms
  // 9.A (9)
  leakCoughLaugh: z.boolean().optional(),
  leakStandingUp: z.boolean().optional(),
  leakUpstairsDownhill: z.boolean().optional(),
  passesUrineFrequently: z.boolean().optional(),
  desirePassUrine: z.boolean().optional(),
  leaksBeforeToilet: z.boolean().optional(),
  moreThanTwiceAtNight: z.boolean().optional(),
  anxiety: z.boolean().optional(),
  // 9.B (10)
  difficultyStarting: z.boolean().optional(),
  hesintancy: z.boolean().optional(),
  dribbles: z.boolean().optional(),
  feelsFull: z.boolean().optional(),
  recurrentTractInfections: z.boolean().optional(),
  // 9.C (11)
  limitedMobility: z.boolean().optional(),
  unableOnTime: z.boolean().optional(),
  notHoldUrinalOrSeat: z.boolean().optional(),
  notuseCallBell: z.boolean().optional(),
  poorVision: z.boolean().optional(),
  assistedTransfer: z.boolean().optional(),
  pain: z.boolean().optional(),

  // Section 12
  // Bladder
  bladderContinent: z.boolean().optional(),
  bladderIncontinent: z.boolean().optional(),
  bladderIncontinentType: z.enum(["STRESS", "URGE", "MIXED", "FUNCTIONAL"]),
  bladderPlanCommenced: z.boolean().optional(),
  bladderReferralRequired: z.enum([
    "DIETICIAN",
    "GP",
    "OT",
    "PHYSIOTHERAPIST",
    "CONTINENCE-NURSE",
    "NONE"
  ]),
  bladderPlanFollowed: z.enum([
    "STRESS",
    "URGE",
    "MIXED",
    "RETENTION-OVERFLOW"
  ]),
  // Bowel
  bowelContinent: z.boolean().optional(),
  bowelIncontinent: z.boolean().optional(),
  bowelPlanCommenced: z.boolean().optional(),
  bowelRecordCommenced: z.boolean().optional(),
  bowelReferralRequired: z.enum([
    "DIETICIAN",
    "GP",
    "OT",
    "PHYSIOTHERAPIST",
    "NONE"
  ]),

  // Section 13
  sigantureCompletingAssessment: z.string(),
  sigantureResident: z.string(),
  dateNextReview: z.number()
});

export type BladderBowelAssessment = z.infer<
  typeof bladderBowelAssessmentSchema
>;
