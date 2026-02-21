import { z } from "zod";

export const PRNConsentSchema = z.object({
  residentId: z.string(),
  teamId: z.string(),
  organizationId: z.string(),
  userId: z.string(),

  // Resident Information
  residentName: z.string().min(1, "Resident name is required"),
  bedroomNumber: z.string().optional(),
  dateOfBirth: z.number(),

  // Consent Details
  understandsPRN: z.boolean(),
  agreesToPRN: z.boolean(),
  medicationTypes: z.string().optional(),
  additionalNotes: z.string().optional(),

  // Representative (optional)
  representativeName: z.string().optional(),
  representativeRelationship: z.string().optional(),
  representativeSignature: z.string().optional(),
  representativeDate: z.number().optional(),

  // Resident Signature
  residentSignature: z.string().min(1, "Resident signature is required"),

  // Staff Information
  nameStaff: z.string().min(1, "Staff name is required"),
  staffSignature: z.string().min(1, "Staff signature is required"),
  date: z.number(),
});
