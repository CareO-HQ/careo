import { z } from "zod";

// Schema for individual pain assessment entry
export const painAssessmentEntrySchema = z.object({
  dateTime: z.string().min(1, "Date and time is required"),
  painLocation: z.string().min(1, "Pain location is required"),
  descriptionOfPain: z.string().min(1, "Description of pain is required"),
  residentBehaviour: z.string().min(1, "Resident behaviour is required"),
  interventionType: z.string().min(1, "Type of intervention is required"),
  interventionTime: z.string().min(1, "Intervention time is required"),
  painAfterIntervention: z.string().min(1, "Pain description after intervention is required"),
  comments: z.string().optional(),
  signature: z.string().min(1, "Signature is required")
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
