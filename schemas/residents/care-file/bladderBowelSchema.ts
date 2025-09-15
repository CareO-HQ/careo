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
  informationObtainedFrom: z.string(),

  // Section 2 - Infections
  hepatitisAB: z.boolean(),
  bloodBorneVirues: z.boolean(),
  mrsa: z.boolean(),
  esbl: z.boolean(),
  other: z.string().optional(),

  // Section 3 - Urinalysis on Admission
  ph: z.boolean(),
  nitrates: z.boolean(),
  protein: z.boolean(),
  leucocytes: z.boolean(),
  glucose: z.boolean(),
  bloodResult: z.boolean(),
  mssuDate: z.number().optional(),

  // Section 4 - Prescribed medication
  antiHypertensives: z.boolean(),
  antiParkinsonDrugs: z.boolean(),
  ironSupplement: z.boolean(),
  laxatives: z.boolean(),
  diuretics: z.boolean(),
  histamine: z.boolean(),
  antiDepressants: z.boolean(),
  cholinergic: z.boolean(),
  sedativesHypnotic: z.boolean(),
  antiPsychotic: z.boolean(),
  antihistamines: z.boolean(),
  narcoticAnalgesics: z.boolean(),

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
  constipationHistory: z.boolean(),
  mentalState: z.enum([
    "ALERT",
    "CONFUSED",
    "LEARNING-DISABLED",
    "COGNITIVELY-IMPAIRED"
  ]),
  mobilityIssues: z.enum(["INDEPENDENT", "ASSISTANCE", "HOISTED"]),
  historyRecurrentUTIs: z.boolean(),

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
  physicianConsulted: z.boolean(),

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
  medicalOfficerConsulted: z.boolean(),

  // Section 8 - Current toileting pattern and products in use
  dayPattern: ToiletingPattern,
  eveningPattern: ToiletingPattern,
  nightPattern: ToiletingPattern,
  typesOfPads: z.string(),

  // Section 9 - Symptoms
  // 9.A
  leakCoughLaugh: z.boolean(),
  leakStandingUp: z.boolean(),
  leakUpstairsDownhill: z.boolean(),
  passesUrineFrequently: z.boolean(),
  desirePassUrine: z.boolean(),
  leaksBeforeToilet: z.boolean(),
  moreThanTwiceAtNight: z.boolean(),
  anxiety: z.boolean(),
  // 9.B
  difficultyStarting: z.boolean(),
  hesintancy: z.boolean(),
  dribbles: z.boolean(),
  feelsFull: z.boolean(),
  recurrentTractInfections: z.boolean(),
  // 9.C
  limitedMobility: z.boolean(),
  unableOnTime: z.boolean(),
  notHoldUrinalOrSeat: z.boolean(),
  notuseCallBell: z.boolean(),
  poorVision: z.boolean(),
  assistedTransfer: z.boolean(),
  pain: z.boolean(),

  // Section 10
  // Bladder
  bladderContinent: z.boolean(),
  bladderIncontinent: z.boolean(),
  bladderIncontinentType: z.enum(["STRESS", "URGE", "MIXED", "FUNCTIONAL"]),
  bladderPlanCommenced: z.boolean(),
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
  bowelContinent: z.boolean(),
  bowelIncontinent: z.boolean(),
  bowelPlanCommenced: z.boolean(),
  bowelRecordCommenced: z.boolean(),
  bowelReferralRequired: z.enum([
    "DIETICIAN",
    "GP",
    "OT",
    "PHYSIOTHERAPIST",
    "NONE"
  ]),

  // Section 11
  sigantureCompletingAssessment: z.string(),
  sigantureResident: z.string(),
  dateNextReview: z.number()
});

export type BladderBowelAssessment = z.infer<
  typeof bladderBowelAssessmentSchema
>;
