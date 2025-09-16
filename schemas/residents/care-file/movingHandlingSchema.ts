import { z } from "zod";

// Enum schemas matching the Convex validators
const LimbMobility = z.enum(["FULLY", "PARTIALLY", "NONE"]);

const RiskState = z.enum(["ALWAYS", "SOMETIMES", "NEVER"]);

const WeightBearingCapacity = z.enum([
  "FULLY",
  "PARTIALLY",
  "WITH-AID",
  "NO-WEIGHTBEARING"
]);

export const movingHandlingAssessmentSchema = z.object({
  // Metadata
  residentId: z.string(),
  teamId: z.string(),
  organizationId: z.string(),
  userId: z.string(),

  // Section 1: Resident information
  residentName: z.string(),
  dateOfBirth: z.number(),
  bedroomNumber: z.string(),
  weight: z.number(),
  height: z.number(),
  historyOfFalls: z.boolean(),

  // Section 2: Mobility Assessment
  independentMobility: z.boolean(),
  canWeightBear: WeightBearingCapacity,
  limbUpperRight: LimbMobility,
  limbUpperLeft: LimbMobility,
  limbLowerRight: LimbMobility,
  limbLowerLeft: LimbMobility,
  equipmentUsed: z.string().optional(),
  needsRiskStaff: z.string().optional(),

  // Section 3: Sensory and Behavioral Risk Factors
  deafnessState: RiskState,
  deafnessComments: z.string().optional(),
  blindnessState: RiskState,
  blindnessComments: z.string().optional(),
  unpredictableBehaviourState: RiskState,
  unpredictableBehaviourComments: z.string().optional(),
  uncooperativeBehaviourState: RiskState,
  uncooperativeBehaviourComments: z.string().optional(),

  // Section 4: Cognitive and Emotional Risk Factors
  distressedReactionState: RiskState,
  distressedReactionComments: z.string().optional(),
  disorientatedState: RiskState,
  disorientatedComments: z.string().optional(),
  unconsciousState: RiskState,
  unconsciousComments: z.string().optional(),
  unbalanceState: RiskState,
  unbalanceComments: z.string().optional(),

  // Section 5: Physical Risk Factors
  spasmsState: RiskState,
  spasmsComments: z.string().optional(),
  stiffnessState: RiskState,
  stiffnessComments: z.string().optional(),
  cathetersState: RiskState,
  cathetersComments: z.string().optional(),
  incontinenceState: RiskState,
  incontinenceComments: z.string().optional(),

  // Section 6: Additional Risk Factors
  localisedPain: RiskState,
  localisedPainComments: z.string().optional(),
  otherState: RiskState,
  otherComments: z.string().optional(),

  // Section 7: Assessment Completion
  completedBy: z.string(),
  jobRole: z.string(),
  signature: z.string(),
  completionDate: z.string()
});

export type MovingHandlingAssessment = z.infer<
  typeof movingHandlingAssessmentSchema
>;

// Export individual enum schemas for use in components
export { LimbMobility, RiskState, WeightBearingCapacity };
