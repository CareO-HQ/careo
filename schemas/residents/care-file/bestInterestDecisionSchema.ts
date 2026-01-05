import { z } from "zod";

export const bestInterestDecisionSchema = z.object({
  // Section A - Resident Information
  residentId: z.string(),
  teamId: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  residentFullName: z.string().min(1, "Resident name is required"),
  dateOfBirth: z.number(),
  residentIdNumber: z.string().min(1, "Resident ID is required"),
  dateOfDecision: z.string().min(1, "Date of decision is required"),

  // Section B - Decision Being Made
  typeOfDecision: z.array(z.string()).min(1, "At least one decision type is required"),
  otherDecisionType: z.string().optional(),
  detailsOfDecision: z.string().min(10, "Please provide details of the decision required"),

  // Section C - Capacity Assessment
  ableToUnderstand: z.enum(["YES", "NO"]),
  reasonsForLackOfCapacity: z.object({
    cognitiveImpairment: z.boolean(),
    communicationDifficulty: z.boolean(),
    fluctuatingCapacity: z.boolean(),
    other: z.boolean(),
    otherDetails: z.string().optional()
  }).optional(),
  assessorName: z.string().min(1, "Assessor name is required"),
  assessorRole: z.string().min(1, "Assessor role is required"),
  assessorSignature: z.string().min(1, "Assessor signature is required"),
  assessmentDate: z.string().min(1, "Assessment date is required"),

  // Section D - Best Interest Considerations
  discussionWith: z.array(z.string()).min(1, "At least one person must be consulted"),
  viewsExpressed: z.array(z.object({
    personConsulted: z.string().min(1, "Person consulted is required"),
    relationship: z.string().min(1, "Relationship is required"),
    viewPreference: z.string().min(1, "View/preference is required"),
    notes: z.string().optional()
  })).min(1, "At least one view must be recorded"),

  // Section E - Options & Risks
  optionsConsidered: z.array(z.object({
    option: z.string().min(1, "Option description is required"),
    benefits: z.string().min(1, "Benefits are required"),
    risks: z.string().min(1, "Risks are required"),
    preferred: z.boolean()
  })).min(1, "At least one option must be considered"),
  reasonForPreferredOption: z.string().min(10, "Reason for preferred option is required"),
  risksIfNotFollowed: z.string().min(10, "Risks if decision not followed are required"),

  // Section F - Best Interest Decision
  decisionOutcome: z.enum(["PROCEED", "DO_NOT_PROCEED"]),
  summaryRationale: z.string().min(20, "Summary rationale is required"),

  // Section G - Signatures
  decisionMakerName: z.string().min(1, "Decision maker name is required"),
  decisionMakerRole: z.string().min(1, "Decision maker role is required"),
  decisionMakerSignature: z.string().min(1, "Decision maker signature is required"),
  decisionMakerDate: z.string().min(1, "Decision maker date is required"),

  witnessName: z.string().optional(),
  witnessRole: z.string().optional(),
  witnessSignature: z.string().optional(),
  witnessDate: z.string().optional(),

  nextOfKinName: z.string().optional(),
  nextOfKinRelationship: z.string().optional(),
  nextOfKinSignature: z.string().optional(),
  nextOfKinDate: z.string().optional(),

  // Meta
  savedAsDraft: z.boolean().optional(),
  createdAt: z.string().optional()
});

export type BestInterestDecisionFormData = z.infer<typeof bestInterestDecisionSchema>;
