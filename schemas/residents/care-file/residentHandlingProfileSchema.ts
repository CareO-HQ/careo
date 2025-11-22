import { z } from "zod";

const handlingActivitySchema = z.object({
  nStaff: z.number().min(0, "Number of staff must be 0 or greater"),
  equipment: z.string().min(1, "Equipment is required"),
  handlingPlan: z.string().min(1, "Handling plan is required"),
  dateForReview: z.number()
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
  residentName: z.string().min(1, "Resident name is required"),
  bedroomNumber: z.string().min(1, "Bedroom number is required"),
  weight: z.number().min(0, "Weight must be 0 or greater"),
  weightBearing: z.string().min(1, "Weight bearing is required"),

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
