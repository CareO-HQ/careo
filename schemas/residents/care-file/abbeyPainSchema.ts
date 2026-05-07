import { z } from "zod";

export const AbbeyPainSchema = z.object({
  // Metadata
  residentId: z.string(),
  teamId: z.string().optional(),
  organizationId: z.string(),
  userId: z.string(),

  // Vocalization
  vocalization: z.number().min(0).max(3),
  // Facial expression
  facialExpression: z.number().min(0).max(3),
  // Body language
  bodyLanguage: z.number().min(0).max(3),
  // Physiological changes
  physiologicalChanges: z.number().min(0).max(3),
  // Physical changes
  physicalChanges: z.number().min(0).max(3),

  // Type of pain
  typeOfPain: z.enum(["Chronic", "Acute", "Acute on chronic", "N/A"]).optional(),

  // Totals & Classification (calculated on submit or stored for convenience)
  totalScore: z.number().min(0).max(15),
  painClassification: z.string(),

  // Completed By (Staff)
  completedByName: z.string(),
  completedByDesignation: z.string().optional(),
  completedByDate: z.number(),
  completedBySignature: z.string(),

  // Form Metadata
  assessmentDate: z.number(),
  nextReviewDate: z.string().optional(),
  status: z.string().optional(),
});

export type AbbeyPainData = z.infer<typeof AbbeyPainSchema>;
