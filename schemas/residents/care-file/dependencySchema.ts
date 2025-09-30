import { z } from "zod";

export const DependencyAssessmentSchema = z.object({
  // Resident information
  dependencyLevel: z.enum(["A", "B", "C", "D"]),

  // Completed by
  completedBy: z.string().min(1, "Completed by is required"),
  completedBySignature: z.string().min(1, "Signature is required"),
  date: z.number().positive("Date is required"),

  // Metadata (optional fields for form handling)
  status: z.enum(["draft", "submitted", "reviewed"]).optional()
});

export type DependencyAssessmentFormData = z.infer<
  typeof DependencyAssessmentSchema
>;
