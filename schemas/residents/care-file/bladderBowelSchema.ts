import { z } from "zod";

const ToiletingPattern = z.enum(["TOILET", "COMMODE", "BED-PAN", "URINAL", "NONE"]);

export const bladderBowelAssessmentSchema = z.object({
  residentId: z.string(),
  teamId: z.string(),
  organizationId: z.string(),
  userId: z.string(),

  // Section 1 - Resident info
  residentName: z.string(),
  dateOfBirth: z.number(),
  bedroomNumber: z.string(),
  informationObtainedFrom: z.string().min(1, "Required"),
  assessmentDate: z.number(),
  completedBy: z.string(),

  // Section 2 - Infections
  hepatitisAB: z.enum(["Yes", "No"]).optional(),
  bloodBorneVirus: z.enum(["Yes", "No"]).optional(),
  mrsa: z.enum(["Yes", "No"]).optional(),
  esbl: z.enum(["Yes", "No"]).optional(),
  otherInfection: z.string().optional(),

  // Section 3 - Urinalysis on Admission
  ph: z.enum(["NORMAL", "ABNORMAL", "NOT-TESTED"]).optional(),
  nitrates: z.enum(["POSITIVE", "NEGATIVE", "NOT-TESTED"]).optional(),
  protein: z.enum(["POSITIVE", "NEGATIVE", "NOT-TESTED"]).optional(),
  leucocytes: z.enum(["POSITIVE", "NEGATIVE", "NOT-TESTED"]).optional(),
  glucose: z.enum(["POSITIVE", "NEGATIVE", "NOT-TESTED"]).optional(),
  bloodResult: z.enum(["POSITIVE", "NEGATIVE", "NOT-TESTED"]).optional(),
  urinalysisResult: z.string().optional(),
  mssuDate: z.number().optional(),

  // Section 4 - Prescribed medication
  antiHypertensives: z.enum(["Yes", "No"]).optional(),
  antiParkinsonDrugs: z.enum(["Yes", "No"]).optional(),
  ironSupplement: z.enum(["Yes", "No"]).optional(),
  laxatives: z.enum(["Yes", "No"]).optional(),
  diuretics: z.enum(["Yes", "No"]).optional(),
  histamine: z.enum(["Yes", "No"]).optional(),
  antiDepressants: z.enum(["Yes", "No"]).optional(),
  cholinergic: z.enum(["Yes", "No"]).optional(),
  sedativesHypnotic: z.enum(["Yes", "No"]).optional(),
  antiPsychotic: z.enum(["Yes", "No"]).optional(),
  antihistamines: z.enum(["Yes", "No"]).optional(),
  narcoticAnalgesics: z.enum(["Yes", "No"]).optional(),

  // Section 5 - Contributing Risk Factors
  caffeineMls24h: z.number().optional(),
  caffeineFrequency: z.string().optional(),
  caffeineTimeOfDay: z.string().optional(),
  exerciseType: z.string().optional(),
  exerciseFrequency: z.string().optional(),
  exerciseTimeOfDay: z.string().optional(),
  skinCondition: z.enum(["HEALTHY", "RED", "BROKEN", "EXCORIATED"]),
  alcoholAmount24h: z.number().optional(),
  alcoholFrequency: z.string().optional(),
  alcoholTimeOfDay: z.string().optional(),
  weight: z.enum(["NORMAL", "OBESE", "UNDERWEIGHT"]),
  smoking: z.enum(["NON-SMOKER", "EX-SMOKER", "SMOKER"]),
  constipationHistory: z.enum(["Yes", "No"]),
  mentalState: z.enum([
    "ALERT",
    "CONFUSED",
    "LEARNING-DISABLED",
    "COGNITIVELY-IMPAIRED"
  ]),
  mobilityIssues: z.enum(["INDEPENDENT", "ASSISTANCE", "HOISTED"]),
  historyRecurrentUTIs: z.enum(["Yes", "No"]),

  // Section 6 - Urinary Continence History
  incontinenceFrequency: z.enum([
    "NONE",
    "ONCE-A-DAY",
    "1-2-DAY",
    "3-DAY",
    "NIGHTTIME",
    "DAY-AND-NIGHT"
  ]),
  incontinenceVolume: z.enum(["ENTIRE-BLADDER", "SMALL-VOL-LEAKS", "UNABLE-DETERMINE"]),
  onset: z.enum(["SUDDEN", "GRADUAL"]),
  duration: z.enum(["LESS-6M", "6M-1Y", "MORE-1Y"]),
  symptomsPast6Months: z.enum(["STABLE", "WORSENING", "IMPROVING", "FLUCTUATING"]),
  physicianConsulted: z.enum(["Yes", "No"]),

  // Section 7 - Bowel Pattern
  bowelPattern: z.enum([
    "NORMAL",
    "CONSTIPATION",
    "DIARRHOEA",
    "IRRITABLE-BOWEL",
    "STOMA",
    "FAECAL-INCONTINENCE"
  ]),
  bowelFrequency: z.string().optional(),
  bowelUsualTimeOfDay: z.string().optional(),
  bowelAmountStoolType: z.string().optional(),
  bowelLiquidFeeds: z.string().optional(),
  bowelOtherFactors: z.string().optional(),
  bowelOtherRemedies: z.string().optional(),
  medicalOfficerConsulted: z.enum(["Yes", "No"]).optional(),
  medicalOfficerName: z.string().optional(),

  // Section 8 - Current toileting pattern and products
  dayPattern: ToiletingPattern,
  eveningPattern: ToiletingPattern,
  nightPattern: ToiletingPattern,
  typesOfPads: z.string().optional(),

  // Section 9 - Symptoms Associated with Urinary Incontinence
  leakCoughLaugh: z.enum(["Yes", "No"]).optional(),
  leakStandingUp: z.enum(["Yes", "No"]).optional(),
  leakUpstairsDownhill: z.enum(["Yes", "No"]).optional(),
  passesUrineFrequently: z.enum(["Yes", "No"]).optional(),
  desirePassUrineStrong: z.enum(["Yes", "No"]).optional(),
  leaksBeforeToilet: z.enum(["Yes", "No"]).optional(),
  getsUpMoreThanTwiceNight: z.enum(["Yes", "No"]).optional(),
  anxietyContributesFrequency: z.enum(["Yes", "No"]).optional(),
  difficultyBeginningUrine: z.enum(["Yes", "No"]).optional(),
  hesitancyStraining: z.enum(["Yes", "No"]).optional(),
  dribblesAfterUrine: z.enum(["Yes", "No"]).optional(),
  feelsBladderFullAfterUrine: z.enum(["Yes", "No"]).optional(),
  recurrentUTIs: z.enum(["Yes", "No"]).optional(),
  limitedMobility: z.enum(["Yes", "No"]).optional(),
  unableToiletOnTime: z.enum(["Yes", "No"]).optional(),
  cannotHoldUrinalOrSit: z.enum(["Yes", "No"]).optional(),
  cannotReachCallBell: z.enum(["Yes", "No"]).optional(),
  poorVision: z.enum(["Yes", "No"]).optional(),
  needsAssistedTransfer: z.enum(["Yes", "No"]).optional(),
  pain: z.enum(["Yes", "No"]).optional(),

  // Section 10 - Quality of Life
  qualityOfLife: z.string().optional(),

  // Section 11 - Summary of Continence Status
  bladderContinent: z.enum(["Yes", "No"]).optional(),
  bladderIncontinent: z.enum(["Yes", "No"]).optional(),
  bladderIncontinentType: z.enum(["STRESS", "URGE", "MIXED", "RETENTION-OVERFLOW", "FUNCTIONAL"]).optional(),
  bladderCarePlanCommenced: z.enum(["Yes", "No"]).optional(),
  bladderReferralRequired: z.enum([
    "DIETICIAN", "GP", "OT", "PHYSIOTHERAPIST", "CONTINENCE-NURSE", "NONE"
  ]).optional(),
  bladderTreatmentPlanFollowed: z.enum([
    "STRESS", "URGE", "MIXED", "RETENTION-OVERFLOW"
  ]).optional(),
  bowelContinent: z.enum(["Yes", "No"]).optional(),
  bowelIncontinent: z.enum(["Yes", "No"]).optional(),
  bowelCarePlanCommenced: z.enum(["Yes", "No"]).optional(),
  bowelRecordCommenced: z.enum(["Yes", "No"]).optional(),
  bowelReferralRequired: z.enum([
    "DIETICIAN", "GP", "OT", "PHYSIOTHERAPIST", "NONE"
  ]).optional(),

  // Section 12 - Final Sign-off
  sigantureCompletingAssessment: z.string().optional(),
  sigantureResident: z.string().optional(),
  dateNextReview: z.number().optional(),
  nextReviewDate: z.string().optional()
});

export type BladderBowelAssessment = z.infer<typeof bladderBowelAssessmentSchema>;

