import { z } from "zod";

export const carePlanEvaluationSchema = z.object({
  carePlanId: z.string().min(1, "Care plan is required"),
  evaluationDate: z.number().positive("Evaluation date is required"),
  comments: z.string().min(1, "Comments are required")
});

export type CarePlanEvaluationFormData = z.infer<
  typeof carePlanEvaluationSchema
>;
