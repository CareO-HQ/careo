import { z } from "zod";

export const capacityConsentSchema = z.object({
  // Base fields
  residentId: z.string(),
  teamId: z.string().optional(),
  organizationId: z.string(),
  userId: z.string(),

  // Section A - Resident Details
  residentName: z.string().min(1, "Resident Name is required"),
  dateOfBirth: z.number().optional(),
  nhsNumber: z.string().optional(),
  dateOfAdmission: z.string().optional(),

  // Section B - Details of Decision
  decisionToBeMade: z.string().optional(),
  admissionToCareHome: z.boolean().optional(),
  consentToCarePlanning: z.boolean().optional(),
  consentToMedication: z.boolean().optional(),
  consentToSharingInfo: z.boolean().optional(),
  otherDecision: z.boolean().optional(),
  otherDecisionDetails: z.string().optional(),

  // Section C - Stage 1 (Diagnostic Test)
  hasImpairment: z.string().min(1, "Please specify if there is an impairment"),
  impairmentDetails: z.string().optional(),

  // Section D - Stage 2 (Functional Test)
  understandInformation: z.string().min(1, "Please select an option"),
  understandNotes: z.string().optional(),
  
  retainInformation: z.string().min(1, "Please select an option"),
  retainNotes: z.string().optional(),
  
  useWeighInformation: z.string().min(1, "Please select an option"),
  useWeighNotes: z.string().optional(),
  
  communicateDecision: z.string().min(1, "Please select an option"),
  communicateNotes: z.string().optional(),

  // Section E — Outcome of Capacity Assessment
  hasCapacity: z.enum(["Yes", "No"], { required_error: "Please select capacity outcome" }),

  // Section F — Resident Consent (Complete only if capacity is present)
  residentSignature: z.string().optional(),
  residentConsentDate: z.string().optional(),

  // Section G — Assessor Details
  assessorName: z.string().min(1, "Assessor name is required"),
  assessorRole: z.string().min(1, "Assessor role is required"),
  assessorSignature: z.string().min(1, "Assessor signature is required"),
  assessmentDate: z.string().min(1, "Assessment date is required"),

  // Section H — Legal Representative (if applicable)
  legalRepresentativeType: z.string().optional(), 
  representativeName: z.string().optional(),
  relationshipToResident: z.string().optional(),
  contactDetails: z.string().optional(),

  // Section I — Review and Reassessment
  nextReviewDate: z.string().optional(),
  reasonForReassessment: z.string().optional(),
  careHomeName: z.string().optional(),
  address: z.string().optional(),
  formVersion: z.string().optional(),
  reviewDate: z.string().optional(),

  // Meta
  savedAsDraft: z.boolean().optional(),
  createdAt: z.string().optional()
});

export type CapacityConsentFormData = z.infer<typeof capacityConsentSchema>;
