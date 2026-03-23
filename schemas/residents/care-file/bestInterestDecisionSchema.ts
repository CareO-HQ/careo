import { z } from "zod";

export const bestInterestDecisionSchema = z.object({
  // Section A - Resident Details
  residentId: z.string(),
  teamId: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  
  residentName: z.string().min(1, "Resident's Name is required"),
  dateOfBirth: z.number().min(8, "Date of Birth is required"),
  gpName: z.string().min(1, "GP is required"),
  staffMemberInvolved: z.string().min(1, "Staff member involved in Discussion is required"),

  // Details Section
  proposedTreatmentOf: z.string().min(1, "Resident's name in declaration is required"),
  treatmentDescription: z.string().min(1, "Explanation of treatment is required"),
  
  // Comments Section
  otherComments: z.string().optional(),

  // Sign-off Section
  signerName: z.string().min(1, "Name is required"),
  signerRelationship: z.string().min(1, "Relationship to Resident is required"),
  signerAddress: z.string().min(1, "Address is required"),
  signerSignature: z.string().min(1, "Signature is required"),
  signerDate: z.string().min(1, "Date is required"),

  // Meta
  savedAsDraft: z.boolean().optional(),
  createdAt: z.string().optional()
});

export type BestInterestDecisionFormData = z.infer<typeof bestInterestDecisionSchema>;
