import { z } from "zod";

export const skinIntegrityAssessmentSchema = z.object({
  // Metadata
  residentId: z.string(),
  teamId: z.string(),
  organizationId: z.string(),
  userId: z.string(),

  // Resident information & date
  residentName: z.string().min(1, "Resident name is required"),
  bedroomNumber: z.string().min(1, "Bedroom number is required"),
  date: z.number().min(1, "Date is required"),

  // Assessment questions (scores 1-4 for most, 1-3 for friction/shear)
  sensoryPerception: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4)
  ]),
  moisture: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  activity: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  mobility: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  nutrition: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  frictionShear: z.union([z.literal(1), z.literal(2), z.literal(3)]),

  // Optional metadata fields for form state management
  savedAsDraft: z.boolean().optional()
});

export type SkinIntegrityAssessment = z.infer<
  typeof skinIntegrityAssessmentSchema
>;
