import { z } from "zod";

const plannedCareEntrySchema = z.object({
  date: z.number(),
  time: z.string().optional(),
  details: z.string(),
  signature: z.string()
});

export const carePlanAssessmentSchema = z.object({
  residentId: z.string(),
  userId: z.string(),

  // Basic information
  residentName: z.string(),
  dob: z.number(),
  bedroomNumber: z.string(),
  writtenBy: z.string(),
  dateWritten: z.number(),
  carePlanNumber: z.string(),

  // Care plan details
  identifiedNeeds: z.string(),
  aims: z.string(),

  // Planned care entries
  plannedCareDate: z.array(plannedCareEntrySchema),

  // Review of Patient or Representative
  discussedWith: z.string().optional(),
  signature: z.string().optional(),
  date: z.number(),
  staffSignature: z.string().optional()
});

export type CarePlanAssessment = z.infer<typeof carePlanAssessmentSchema>;
export type PlannedCareEntry = z.infer<typeof plannedCareEntrySchema>;
