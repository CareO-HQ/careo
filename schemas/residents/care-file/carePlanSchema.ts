import { z } from "zod";

const plannedCareEntrySchema = z.object({
  date: z.number(),
  time: z.string().optional(),
  details: z.string().min(1, "Details are required"),
  signature: z.string().min(1, "Signature is required")
});

export const carePlanAssessmentSchema = z.object({
  residentId: z.string(),
  userId: z.string(),

  // Basic information
  nameOfCarePlan: z.string().min(1, "Name of care plan is required"),
  residentName: z.string().min(1, "Resident name is required"),
  dob: z.number(),
  bedroomNumber: z.string().min(1, "Bedroom number is required"),
  writtenBy: z.string().min(1, "Written by is required"),
  dateWritten: z.number(),
  carePlanNumber: z.string().min(1, "Care plan number is required"),

  // Care plan details
  identifiedNeeds: z.string().min(1, "Identified needs are required"),
  aims: z.string().min(1, "Aims are required"),

  // Planned care entries
  plannedCareDate: z
    .array(plannedCareEntrySchema)
    .min(1, "At least one planned care entry is required"),

  // Review of Patient or Representative
  discussedWith: z.string().optional(),
  signature: z.string().optional(),
  date: z.number(),
  staffSignature: z.string().optional()
});

export type CarePlanAssessment = z.infer<typeof carePlanAssessmentSchema>;
export type PlannedCareEntry = z.infer<typeof plannedCareEntrySchema>;
