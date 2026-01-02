import { z } from "zod";

// Schema for oral assessment form
export const oralAssessmentSchema = z.object({
  // Metadata
  residentId: z.string(),
  teamId: z.string(),
  organizationId: z.string(),
  userId: z.string(),

  // Section 1: Basic Resident Information
  residentName: z.string().min(1, "Resident name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  weight: z.string().min(1, "Weight is required"),
  height: z.string().min(1, "Height is required"),
  completedBy: z.string().min(1, "Name of person completing assessment is required"),
  signature: z.string().min(1, "Signature is required"),
  assessmentDate: z.number().min(1, "Assessment date is required"),

  // Section 2: Dental History and Registration
  normalOralHygieneRoutine: z.string().min(1, "Oral hygiene routine is required"),
  isRegisteredWithDentist: z.boolean(),
  lastSeenByDentist: z.string().optional(),
  dentistName: z.string().optional(),
  dentalPracticeAddress: z.string().optional(),
  contactTelephone: z.string().optional(),

  // Section 3: Physical Oral Examination (Yes/No with suggested care)
  lipsDryCracked: z.boolean(),
  lipsDryCrackedCare: z.string().optional(),

  tongueDryCracked: z.boolean(),
  tongueDryCrackedCare: z.string().optional(),

  tongueUlceration: z.boolean(),
  tongueUlcerationCare: z.string().optional(),

  hasTopDenture: z.boolean(),
  topDentureCare: z.string().optional(),

  hasLowerDenture: z.boolean(),
  lowerDentureCare: z.string().optional(),

  hasDenturesAndNaturalTeeth: z.boolean(),
  denturesAndNaturalTeethCare: z.string().optional(),

  hasNaturalTeeth: z.boolean(),
  naturalTeethCare: z.string().optional(),

  evidencePlaqueDebris: z.boolean(),
  plaqueDebrisCare: z.string().optional(),

  dryMouth: z.boolean(),
  dryMouthCare: z.string().optional(),

  // Section 4: Symptoms and Functional Assessment (Yes/No with suggested care)
  painWhenEating: z.boolean(),
  painWhenEatingCare: z.string().optional(),

  gumsUlceration: z.boolean(),
  gumsUlcerationCare: z.string().optional(),

  difficultySwallowing: z.boolean(),
  difficultySwallowingCare: z.string().optional(),

  poorFluidDietaryIntake: z.boolean(),
  poorFluidDietaryIntakeCare: z.string().optional(),

  dehydrated: z.boolean(),
  dehydratedCare: z.string().optional(),

  speechDifficultyDryMouth: z.boolean(),
  speechDifficultyDryMouthCare: z.string().optional(),

  speechDifficultyDenturesSlipping: z.boolean(),
  speechDifficultyDenturesSlippingCare: z.string().optional(),

  dexterityProblems: z.boolean(),
  dexterityProblemsCare: z.string().optional(),

  cognitiveImpairment: z.boolean(),
  cognitiveImpairmentCare: z.string().optional(),

  // Optional metadata fields for form state management
  savedAsDraft: z.boolean().optional()
});

export type OralAssessment = z.infer<typeof oralAssessmentSchema>;
