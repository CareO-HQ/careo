import { z } from "zod";

// IDDSI Food Consistency Levels
export const iddsiFoodConsistencySchema = z.object({
  level7EasyChew: z.boolean().optional(),
  level6SoftBiteSized: z.boolean().optional(),
  level5MincedMoist: z.boolean().optional(),
  level4Pureed: z.boolean().optional(),
  level3Liquidised: z.boolean().optional()
});

// IDDSI Fluid Consistency Levels
export const iddsiFluidConsistencySchema = z.object({
  level4ExtremelyThick: z.boolean().optional(),
  level3ModeratelyThick: z.boolean().optional(),
  level2MildlyThick: z.boolean().optional(),
  level1SlightlyThick: z.boolean().optional(),
  level0Thin: z.boolean().optional()
});

export const nutritionalAssessmentSchema = z.object({
  // Metadata
  residentId: z.string(),
  teamId: z.string(),
  organizationId: z.string(),
  userId: z.string(),

  // Section 1: Resident Information
  residentName: z.string().min(1, "Resident name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  bedroomNumber: z.string().min(1, "Bedroom number is required"),
  height: z.string().min(1, "Height is required"),
  weight: z.string().min(1, "Weight is required"),
  mustScore: z.string().min(1, "MUST score is required"),

  // Section 2: Clinical Involvement
  hasSaltInvolvement: z.boolean(),
  saltTherapistName: z.string().optional(),
  saltContactDetails: z.string().optional(),
  hasDietitianInvolvement: z.boolean(),
  dietitianName: z.string().optional(),
  dietitianContactDetails: z.string().optional(),

  // Section 3: Dietary Requirements & Supplements
  foodFortificationRequired: z.string().optional(),
  supplementsPrescribed: z.string().optional(),

  // Section 4: IDDSI Consistency Levels
  foodConsistency: iddsiFoodConsistencySchema,
  fluidConsistency: iddsiFluidConsistencySchema,

  // Section 5: Assistance & Administration
  assistanceRequired: z.string().min(1, "Assistance details are required"),
  completedBy: z.string().min(1, "Completed by is required"),
  jobRole: z.string().min(1, "Job role is required"),
  signature: z.string().min(1, "Signature is required"),
  assessmentDate: z.number().min(1, "Assessment date is required"),

  // Optional metadata fields for form state management
  savedAsDraft: z.boolean().optional()
});

export type IddsiFoodConsistency = z.infer<typeof iddsiFoodConsistencySchema>;
export type IddsiFluidConsistency = z.infer<typeof iddsiFluidConsistencySchema>;
export type NutritionalAssessment = z.infer<typeof nutritionalAssessmentSchema>;
