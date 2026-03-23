import { z } from "zod";

export const nightObservationSchema = z.object({
  // Base fields
  residentId: z.string(),
  teamId: z.string().optional(),
  organizationId: z.string(),
  userId: z.string(),

  // Section A - Resident Information
  residentName: z.string().min(1, "Resident Name is required"),
  dateOfBirth: z.string().optional(),
  nhsNumber: z.string().optional(),
  roomNumber: z.string().optional(),
  dateOfAdmission: z.string().optional(),

  // Section C - Type of Observation Required
  observationTypes: z.array(z.string()).default([]),
  otherObservationType: z.string().optional(),

  // Section D - Frequency of Observations
  frequency: z.array(z.string()).default([]),
  otherFrequency: z.string().optional(),

  // Section E - Resident Consent
  residentConsented: z.boolean().default(false),
  residentSignature: z.string().optional(),
  consentDate: z.string().optional(),

  // Section F - Capacity Consideration
  hasCapacity: z.enum(["Yes", "No"]).optional(),

  // Section G - Legal Representative / Family Involvement
  representativeConsulted: z.enum(["LPA", "Family", "Not Applicable"]).optional(),
  representativeName: z.string().optional(),
  relationshipToResident: z.string().optional(),
  contactDetails: z.string().optional(),

  // Section H - Risks Explained
  risksExplained: z.array(z.string()).default([]),
  otherRisk: z.string().optional(),

  // Section I - Staff Declaration
  staffName: z.string().min(1, "Staff Name is required"),
  staffRole: z.string().min(1, "Staff Role is required"),
  staffSignature: z.string().min(1, "Staff Signature is required"),
  declarationDate: z.string().min(1, "Declaration Date is required"),

  // Meta
  savedAsDraft: z.boolean().optional(),
  createdAt: z.string().optional()
});

export type NightObservationFormData = z.infer<typeof nightObservationSchema>;
