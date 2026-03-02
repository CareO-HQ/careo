import { z } from "zod";

const handlingActivitySchema = z.object({
  nStaff: z.number().min(0, "Number of staff must be 0 or greater").optional().default(0),
  equipment: z.string().optional(),
  handlingPlan: z.string().optional(),
  dateForReview: z.number().optional()
});

export const residentHandlingProfileSchema = z.object({
  // Metadata
  residentId: z.string(),
  teamId: z.string(),
  organizationId: z.string(),

  // Completed by
  completedBy: z.string().min(1, "Completed by is required"),
  jobRole: z.string().min(1, "Job role is required"),
  date: z.number(),

  // Resident information
  residentName: z.string().optional(),
  bedroomNumber: z.string().optional(),
  weight: z.number().min(0, "Weight must be 0 or greater").optional(),
  weightBearing: z.string().optional(),

  // Transfer to or from bed
  transferBed: handlingActivitySchema,

  // Transfer to or from chair
  transferChair: handlingActivitySchema,

  // Walking
  walking: handlingActivitySchema,

  // Toileting
  toileting: handlingActivitySchema,

  // Movement in bed
  movementInBed: handlingActivitySchema,

  // Bathing
  bath: handlingActivitySchema,

  // Outdoor mobility
  outdoorMobility: handlingActivitySchema
});

export type ResidentHandlingProfile = z.infer<
  typeof residentHandlingProfileSchema
>;
