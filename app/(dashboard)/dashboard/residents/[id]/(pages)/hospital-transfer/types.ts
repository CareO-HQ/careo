import { z } from "zod";

// Hospital Passport Schema
export const HospitalPassportSchema = z.object({
  // General & Transfer Details
  generalDetails: z.object({
    personName: z.string(),
    knownAs: z.string(),
    dateOfBirth: z.string(),
    nhsNumber: z.string(),
    religion: z.string().optional(),
    weightOnTransfer: z.string().optional(),
    careType: z.enum(["nursing", "residential", "ld", "mental_health"]).optional(),
    transferDateTime: z.string(),
    accompaniedBy: z.string().optional(),
    englishFirstLanguage: z.enum(["yes", "no"]),
    firstLanguage: z.string().optional(),
    careHomeName: z.string(),
    careHomeAddress: z.string(),
    careHomePhone: z.string(),
    hospitalName: z.string(),
    hospitalAddress: z.string(),
    hospitalPhone: z.string().optional(),
    nextOfKinName: z.string(),
    nextOfKinAddress: z.string(),
    nextOfKinPhone: z.string(),
    gpName: z.string(),
    gpAddress: z.string(),
    gpPhone: z.string(),
    careManagerName: z.string().optional(),
    careManagerAddress: z.string().optional(),
    careManagerPhone: z.string().optional(),
  }),

  // Medical & Care Needs
  medicalCareNeeds: z.object({
    // SBAR Format
    situation: z.string(),
    background: z.string(),
    assessment: z.string(),
    recommendations: z.string(),

    // Medical History
    pastMedicalHistory: z.string(),
    knownAllergies: z.string().optional(),
    historyOfConfusion: z.enum(["yes", "no", "sometimes"]).optional(),
    learningDisabilityMentalHealth: z.string().optional(),

    // Communication & Aids
    communicationIssues: z.string().optional(),
    hearingAid: z.boolean().default(false),
    glasses: z.boolean().default(false),
    otherAids: z.string().optional(),

    // Mobility
    mobilityAssistance: z.enum(["independent", "minimum", "full"]),
    mobilityAids: z.string().optional(),
    historyOfFalls: z.boolean().default(false),
    dateOfLastFall: z.string().optional(),

    // Toileting
    toiletingAssistance: z.enum(["independent", "minimum", "full"]),
    continenceStatus: z.enum(["continent", "urine", "faeces", "both", "na"]).optional(),

    // Nutrition
    nutritionalAssistance: z.enum(["independent", "minimum", "full"]),
    dietType: z.string().optional(),
    swallowingDifficulties: z.boolean().default(false),
    enteralNutrition: z.boolean().default(false),
    mustScore: z.string().optional(),

    // Personal Care
    personalHygieneAssistance: z.enum(["independent", "minimum", "full"]),
    topDentures: z.boolean().default(false),
    bottomDentures: z.boolean().default(false),
    denturesAccompanying: z.boolean().default(false),
  }),

  // Skin, Medication & Attachments
  skinMedicationAttachments: z.object({
    // Skin Care
    skinIntegrityAssistance: z.enum(["independent", "minimum", "full"]),
    bradenScore: z.string().optional(),
    skinStateOnTransfer: z.string(),
    currentSkinCareRegime: z.string().optional(),
    pressureRelievingEquipment: z.string().optional(),
    knownToTVN: z.boolean().default(false),
    tvnName: z.string().optional(),

    // Medication
    currentMedicationRegime: z.string(),
    lastMedicationDateTime: z.string(),
    lastMealDrinkDateTime: z.string().optional(),

    // Attachments
    attachments: z.object({
      currentMedications: z.boolean().default(false),
      bodyMap: z.boolean().default(false),
      observations: z.boolean().default(false),
      dnacprForm: z.boolean().default(false),
      enteralFeedingRegime: z.boolean().default(false),
      other: z.boolean().default(false),
      otherSpecify: z.string().optional(),
    }),
  }),

  // Sign-off Section
  signOff: z.object({
    signature: z.string(),
    printedName: z.string(),
    designation: z.string(),
    contactPhone: z.string(),
    completedDate: z.string(),
  }),
});

export type HospitalPassportFormData = z.infer<typeof HospitalPassportSchema>;