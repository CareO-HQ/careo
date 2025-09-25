import { z } from "zod";

export const PhotographyConsentSchema = z.object({
  // Metadata
  residentId: z.string(),
  teamId: z.string(),
  organizationId: z.string(),
  userId: z.string(),

  // Resident information
  residentName: z.string().min(1, "Resident name is required"),
  bedroomNumber: z.string().min(1, "Bedroom number is required"),
  dateOfBirth: z.number().positive("Date of birth must be a valid timestamp"),

  // Consent
  healthcareRecords: z.boolean(),
  socialActivitiesInternal: z.boolean(),
  socialActivitiesExternal: z.boolean(),

  // Signature
  residentSignature: z.string().optional(),

  // Representative
  representativeName: z.string().optional(),
  representativeRelationship: z.string().optional(),
  representativeSignature: z.string().optional(),
  representativeDate: z.number().optional(),

  // Staff
  nameStaff: z.string().min(1, "Staff name is required"),
  staffSignature: z.string().min(1, "Staff signature is required"),
  date: z.number().positive("Date must be a valid timestamp")
});

export type PhotographyConsentFormData = z.infer<
  typeof PhotographyConsentSchema
>;
