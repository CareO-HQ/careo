import { z } from "zod";

// Page 1: Resident & Initial Assessment
export const BedRailsExclusionCriteria = z.object({
  residentRefuses: z.boolean().default(false),
  climbingRisk: z.boolean().default(false),
  entrapmentRisk: z.boolean().default(false),
  abnormalBodySize: z.boolean().default(false),
  restraintPurpose: z.boolean().default(false),
  freedomLimitation: z.boolean().default(false)
});

// Page 2: Authorization Rationale
export const BedRailsAuthorizationRationale = z.object({
  residentRequests: z.boolean().default(false),
  mdtMeetingCompleted: z.boolean().default(false),
  riskOutweighsBenefit: z.boolean().default(false),
  alternativesExplored: z.boolean().default(false),
  bestInterestDecision: z.boolean().default(false)
});

// Page 2: Safety Checklist
export const BedRailsSafetyChecklist = z.object({
  gapBetweenRailAndMattress: z.enum(["YES", "NO"]),
  mattressCompressesEasily: z.enum(["YES", "NO"]),
  gapMoreThan60mm: z.enum(["YES", "NO"]),
  bedRailInsecure: z.enum(["YES", "NO"]),
  bedAgainstWall: z.enum(["YES", "NO"])
});

// Page 3: Extended Height Bed Rails
export const ExtendedHeightBedRails = z.object({
  positionedCorrectly: z.enum(["YES", "NO"]),
  securelyFastened: z.enum(["YES", "NO"]),
  correctBumpersInstalled: z.enum(["YES", "NO"]),
  mattressBelowPlimsollLine: z.enum(["YES", "NO"]),
  staffTrained: z.enum(["YES", "NO"]),
  checkedForDamage: z.enum(["YES", "NO"])
});

// Main schema
export const bedRailsRiskAssessmentSchema = z.object({
  // System fields
  residentId: z.string(),
  teamId: z.string(),
  organizationId: z.string(),
  userId: z.string(),

  // Page 1: Administrative Details
  residentName: z.string().min(1, "Resident name is required"),
  bedroomNumber: z.string().min(1, "Bedroom number is required"),
  dateOfBirth: z.number(),
  assessmentCompletedBy: z.string().min(1, "Assessor name is required"),
  jobRole: z.string().min(1, "Job role is required"),
  dateOfAssessment: z.string().min(1, "Date of assessment is required"),

  // Page 1: Trial & Rationale
  alternativeEquipmentConsidered: z.string().min(1, "Please describe alternative equipment considered"),
  reasonsAlternativesNotSuccessful: z.string().min(1, "Please describe why alternatives were not successful"),

  // Page 1: Exclusion Criteria
  exclusionCriteria: BedRailsExclusionCriteria,
  anyExclusionChecked: z.boolean(),

  // Page 2: Authorization Rationale
  authorizationRationale: BedRailsAuthorizationRationale,

  // Page 2: Communication
  reasonExplainedToResident: z.enum(["YES", "NO"]),

  // Page 2: Equipment Details
  typeOfBed: z.enum(["DIVAN", "PROFILING_BED"], {
    required_error: "Please select type of bed"
  }),
  typeOfMattress: z.enum([
    "STANDARD",
    "LIGHTWEIGHT_FOAM",
    "STANDARD_WITH_OVERLAY",
    "FULL_REPLACEMENT"
  ], {
    required_error: "Please select type of mattress"
  }),
  typeOfBedrails: z.enum([
    "INTEGRAL_FIXED",
    "EXTENDED_HEIGHT_INTEGRAL",
    "EXTENDED_HEIGHT_NON_INTEGRAL"
  ], {
    required_error: "Please select type of bedrails"
  }),

  // Page 2: Safety Checklist
  safetyChecklist: BedRailsSafetyChecklist,
  anySafetyCheckFailed: z.boolean(),

  // Page 3: Extended Height Bed Rails (conditional)
  hasExtendedHeightRails: z.boolean(),
  extendedHeightChecks: ExtendedHeightBedRails.optional(),

  // Page 3: General
  consentObtained: z.enum(["YES", "NO"]),
  carePlanCompleted: z.enum(["YES", "NO"]),

  // Signature
  signatureOfAssessor: z.string().min(1, "Signature is required"),
  signatureDate: z.string().min(1, "Signature date is required"),

  // Metadata
  savedAsDraft: z.boolean().optional(),
  createdAt: z.string().optional(),
  pdfFileId: z.string().optional()
}).refine(
  (data) => {
    // Calculate if any exclusion criteria is checked
    const exclusions = data.exclusionCriteria;
    return (
      exclusions.residentRefuses ||
      exclusions.climbingRisk ||
      exclusions.entrapmentRisk ||
      exclusions.abnormalBodySize ||
      exclusions.restraintPurpose ||
      exclusions.freedomLimitation
    ) === data.anyExclusionChecked;
  },
  {
    message: "Exclusion criteria mismatch",
    path: ["anyExclusionChecked"]
  }
).refine(
  (data) => {
    // Calculate if any safety check failed
    const checks = data.safetyChecklist;
    return (
      checks.gapBetweenRailAndMattress === "YES" ||
      checks.mattressCompressesEasily === "YES" ||
      checks.gapMoreThan60mm === "YES" ||
      checks.bedRailInsecure === "YES" ||
      checks.bedAgainstWall === "YES"
    ) === data.anySafetyCheckFailed;
  },
  {
    message: "Safety checklist mismatch",
    path: ["anySafetyCheckFailed"]
  }
).refine(
  (data) => {
    // If extended height rails are selected, extended checks must be provided
    if (data.hasExtendedHeightRails) {
      return data.extendedHeightChecks !== undefined;
    }
    return true;
  },
  {
    message: "Extended height rail checks are required when extended rails are used",
    path: ["extendedHeightChecks"]
  }
);

export type BedRailsRiskAssessmentFormData = z.infer<typeof bedRailsRiskAssessmentSchema>;
