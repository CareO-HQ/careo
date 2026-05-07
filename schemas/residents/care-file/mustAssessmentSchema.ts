import { z } from "zod";

export const mustAssessmentSchema = z.object({
  residentId: z.string().min(1),
  teamId: z.string().optional(),
  organizationId: z.string().min(1),
  userId: z.string().min(1),
  residentName: z.string().min(1),
  bedroomNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  nextReviewDate: z.string().min(1, "Next review date is required"),
  assessmentDate: z.number(),
  weightKg: z
    .number({ invalid_type_error: "Weight must be a number" })
    .positive("Weight must be greater than 0"),
  heightCm: z
    .number({ invalid_type_error: "Height must be a number" })
    .positive("Height must be greater than 0"),
  bmi: z.number().positive(),
  step1Score: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  step2Score: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  step3Score: z.union([z.literal(0), z.literal(2)]),
  totalMustScore: z.number().int().min(0).max(6),
  signature: z.string().min(1, "Signature is required"),
  jobRole: z.string().min(1, "Job Role is required")
});

export type MustAssessmentFormValues = z.infer<typeof mustAssessmentSchema>;
