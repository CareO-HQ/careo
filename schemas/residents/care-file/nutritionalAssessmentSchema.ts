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
  residentName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  bedroomNumber: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  mustScore: z.string().optional(),

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
  assistanceRequired: z.string().optional(),
  completedBy: z.string().optional(),
  jobRole: z.string().optional(),
  signature: z.string().optional(),
  assessmentDate: z.number().optional(),

  // Optional metadata fields for form state management
  savedAsDraft: z.boolean().optional()
});

export type IddsiFoodConsistency = z.infer<typeof iddsiFoodConsistencySchema>;
export type IddsiFluidConsistency = z.infer<typeof iddsiFluidConsistencySchema>;
export type NutritionalAssessment = z.infer<typeof nutritionalAssessmentSchema>;
