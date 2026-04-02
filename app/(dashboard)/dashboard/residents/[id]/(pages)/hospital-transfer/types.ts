import { z } from "zod";

// Hospital Passport Schema
export const HospitalPassportSchema = z.object({
  // General & Transfer Details
  generalDetails: z.object({
    personName: z.string().min(1, "Name is required"),
    knownAs: z.string().min(1, "Preferred name is required"),
    dateOfBirth: z.string().min(1, "Date of birth is required"),
    nhsNumber: z.string().min(1, "NHS number is required"),
    religion: z.string().optional(),
    weightOnTransfer: z.string().optional(),
    careType: z.enum(["nursing", "residential", "ld", "mental_health"]).optional(),
    transferDateTime: z.string().min(1, "Transfer date and time is required"),
    accompaniedBy: z.string().optional(),
    englishFirstLanguage: z.enum(["yes", "no"]),
    firstLanguage: z.string().optional(),
    careHomeName: z.string().min(1, "Care home name is required"),
    careHomeAddress: z.string().min(1, "Care home address is required"),
    careHomePhone: z.string().min(1, "Care home phone is required"),
    hospitalName: z.string().min(1, "Hospital/facility name is required"),
    hospitalAddress: z.string().min(1, "Hospital/facility address is required"),
    hospitalPhone: z.string().optional(),
    nextOfKinName: z.string().min(1, "Next of kin name is required"),
    nextOfKinAddress: z.string().min(1, "Next of kin address is required"),
    nextOfKinPhone: z.string().min(1, "Next of kin phone is required"),
    gpName: z.string().min(1, "GP name is required"),
    gpAddress: z.string().min(1, "GP address is required"),
    gpPhone: z.string().min(1, "GP phone is required"),
    careManagerName: z.string().optional(),
    careManagerAddress: z.string().optional(),
    careManagerPhone: z.string().optional(),
  }),

  // Medical & Care Needs
  medicalCareNeeds: z.object({
    // SBAR Format
    situation: z.string().min(1, "Situation is required"),
    background: z.string().min(1, "Background is required"),
    assessment: z.string().min(1, "Assessment is required"),
    recommendations: z.string().min(1, "Recommendations are required"),

    // Medical History
    pastMedicalHistory: z.string().min(1, "Medical history is required"),
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
    skinStateOnTransfer: z.string().min(1, "Skin state is required"),
    currentSkinCareRegime: z.string().optional(),
    pressureRelievingEquipment: z.string().optional(),
    knownToTVN: z.boolean().default(false),
    tvnName: z.string().optional(),

    // Medication
    currentMedicationRegime: z.string().min(1, "Current medication is required"),
    lastMedicationDateTime: z.string().min(1, "Last medication time is required"),
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
    signature: z.string().min(1, "Signature is required"),
    printedName: z.string().min(1, "Name is required"),
    designation: z.string().min(1, "Designation is required"),
    contactPhone: z.string().min(1, "Contact phone is required"),
    completedDate: z.string().min(1, "Date is required"),
  }),
});

export type HospitalPassportFormData = z.infer<typeof HospitalPassportSchema>;