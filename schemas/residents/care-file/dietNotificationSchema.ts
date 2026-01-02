import { z } from "zod";

export const dietNotificationSchema = z.object({
  // Header & Administrative Information
  residentName: z.string().min(1, "Resident name is required"),
  roomNumber: z.string().min(1, "Room number is required"),
  completedBy: z.string().min(1, "Completed by is required"),
  printName: z.string().min(1, "Print name is required"),
  jobRole: z.string().min(1, "Job role is required"),
  signature: z.string().min(1, "Signature is required"),
  dateCompleted: z.number(),
  reviewDate: z.number(),

  // Dietary Preferences & Risks
  likesFavouriteFoods: z.string().optional(),
  dislikes: z.string().optional(),
  foodsToBeAvoided: z.string().optional(),
  chokingRiskAssessment: z.enum(["Low Risk", "Medium Risk", "High Risk"]),

  // Meal & Fluid Specifications
  preferredMealSize: z.enum(["Small", "Standard", "Large"]),
  assistanceRequired: z.string().optional(),
  dietType: z.string().optional(),

  // Food Consistency (IDDSI Levels)
  foodConsistencyLevel7Regular: z.boolean().optional(),
  foodConsistencyLevel7EasyChew: z.boolean().optional(),
  foodConsistencyLevel6SoftBiteSized: z.boolean().optional(),
  foodConsistencyLevel5MincedMoist: z.boolean().optional(),
  foodConsistencyLevel4Pureed: z.boolean().optional(),
  foodConsistencyLevel3Liquidised: z.boolean().optional(),

  // Fluid Consistency (IDDSI Levels)
  fluidConsistencyLevel4ExtremelyThick: z.boolean().optional(),
  fluidConsistencyLevel3ModeratelyThick: z.boolean().optional(),
  fluidConsistencyLevel2MildlyThick: z.boolean().optional(),
  fluidConsistencyLevel1SlightlyThick: z.boolean().optional(),
  fluidConsistencyLevel0Thin: z.boolean().optional(),

  // Additional Requirements
  fluidRequirements: z.string().optional(),
  foodAllergyOrIntolerance: z.string().optional(),

  // Kitchen Review
  reviewedByCookChef: z.string().optional(),
  reviewerPrintName: z.string().optional(),
  reviewerJobTitle: z.string().optional(),
  reviewDate: z.number().optional()
});

export type DietNotificationFormData = z.infer<typeof dietNotificationSchema>;
