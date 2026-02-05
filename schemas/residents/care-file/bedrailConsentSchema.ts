import { z } from "zod";

/**
 * Bedrails Consent / Agreement Form Schema
 *
 * This form is used to document resident consent (or lack thereof) for bedrail usage.
 * It supports two scenarios:
 * 1. Residents who are able to consent themselves
 * 2. Residents who are unable to consent (requiring next of kin/advocate input)
 */

// Enum for consent type
export const ConsentType = z.enum(["ABLE_TO_CONSENT", "UNABLE_TO_CONSENT"]);

// Schema for residents able to consent
const AbleToConsentSection = z.object({
  // The resident's choice about bedrails
  consentChoice: z.enum([
    "CONSENT_TO_USE", // "I would like bed rails/bumpers to be used"
    "REFUSE_TO_USE"   // "I do NOT want bed rails or bumpers to be used"
  ]),

  // Resident's signature
  residentSignature: z.string().min(1, "Resident signature is required"),

  // Staff information
  staffMemberName: z.string().min(1, "Staff member name is required"),
  staffMemberSignature: z.string().min(1, "Staff member signature is required"),
  staffSignatureDate: z.string().min(1, "Date is required")
});

// Schema for residents unable to consent
const UnableToConsentSection = z.object({
  // Next of Kin / Advocate / MDT member details
  representativeName: z.string().min(1, "Representative name is required"),

  // Discussion acknowledgement (implicit - always true if this section is filled)
  discussionAcknowledged: z.boolean().default(true),

  // Resident's presumed preference
  residentPreference: z.enum([
    "WOULD_PREFER_USE",    // "Resident would have preferred to use bed rails/bumpers"
    "WOULD_NOT_PREFER_USE" // "Resident would not have preferred to use bed rails/bumpers"
  ]),

  // Representative signature
  representativeSignature: z.string().min(1, "Representative signature is required"),

  // Staff information
  staffMemberName: z.string().min(1, "Staff member name is required"),
  staffMemberSignature: z.string().min(1, "Staff member signature is required"),
  staffSignatureDate: z.string().min(1, "Date is required")
});

// Main schema - discriminated union based on consent type
export const bedrailConsentSchema = z.object({
  // Metadata
  residentId: z.string(),
  teamId: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  assessment_date: z.string().optional(),
  completed_by: z.string().optional(),

  // Header Information
  residentName: z.string().min(1, "Resident name is required"),
  bedroomNumber: z.string().min(1, "Bedroom number is required"),
  dateOfBirth: z.number(),

  // Consent Type - determines which section is active
  consentType: ConsentType,

  // Conditional sections (only one will be filled based on consentType)
  ableToConsentSection: AbleToConsentSection.optional(),
  unableToConsentSection: UnableToConsentSection.optional()
}).refine(
  (data) => {
    // Ensure the correct section is filled based on consent type
    if (data.consentType === "ABLE_TO_CONSENT") {
      return data.ableToConsentSection !== undefined;
    } else {
      return data.unableToConsentSection !== undefined;
    }
  },
  {
    message: "Please complete the required section for the selected consent type"
  }
).refine(
  (data) => {
    // Ensure only one section is filled
    if (data.consentType === "ABLE_TO_CONSENT") {
      return data.unableToConsentSection === undefined;
    } else {
      return data.ableToConsentSection === undefined;
    }
  },
  {
    message: "Only one consent section should be completed"
  }
);

export type BedrailConsent = z.infer<typeof bedrailConsentSchema>;

// Export sub-schemas for component use
export type AbleToConsentSectionType = z.infer<typeof AbleToConsentSection>;
export type UnableToConsentSectionType = z.infer<typeof UnableToConsentSection>;
