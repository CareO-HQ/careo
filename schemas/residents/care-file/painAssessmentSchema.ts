import { z } from "zod";

// Schema for individual pain assessment entry
export const painAssessmentEntrySchema = z.object({
  dateTime: z.string().optional(),
  painLocation: z.string().optional(),
  descriptionOfPain: z.string().optional(),
  residentBehaviour: z.string().optional(),
  interventionType: z.string().optional(),
  interventionTime: z.string().optional(),
  painAfterIntervention: z.string().optional(),
  comments: z.string().optional(),
  signature: z.string().optional()
});

export const painAssessmentSchema = z.object({
  // Metadata
  residentId: z.string(),
  teamId: z.string(),
  organizationId: z.string(),
  userId: z.string(),

  // Resident information & header
  residentName: z.string().min(1, "Resident name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  roomNumber: z.string().min(1, "Room number is required"),
  nameOfHome: z.string().min(1, "Name of home is required"),
  assessmentDate: z.number().min(1, "Assessment date is required"),

  // Array of assessment entries
  assessmentEntries: z.array(painAssessmentEntrySchema).min(1, "At least one assessment entry is required"),

  // Optional metadata fields for form state management
  savedAsDraft: z.boolean().optional()
});

export type PainAssessmentEntry = z.infer<typeof painAssessmentEntrySchema>;
export type PainAssessment = z.infer<typeof painAssessmentSchema>;
