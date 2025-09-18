import { defineTable } from "convex/server";
import { v } from "convex/values";

const LimbMobility = v.union(
  v.literal("FULLY"),
  v.literal("PARTIALLY"),
  v.literal("NONE")
);

const RiskState = v.union(
  v.literal("ALWAYS"),
  v.literal("SOMETIMES"),
  v.literal("NEVER")
);

export const movingHandlingAssessments = defineTable({
  // Metadata
  residentId: v.id("residents"),
  teamId: v.string(),
  organizationId: v.string(),
  userId: v.string(),

  //   1. Resident information
  residentName: v.string(),
  dateOfBirth: v.number(),
  bedroomNumber: v.string(),
  weight: v.number(),
  height: v.number(),
  historyOfFalls: v.boolean(),

  //   2
  independentMobility: v.boolean(),
  canWeightBear: v.union(
    v.literal("FULLY"),
    v.literal("PARTIALLY"),
    v.literal("WITH-AID"),
    v.literal("NO-WEIGHTBEARING")
  ),
  limbUpperRight: LimbMobility,
  limbUpperLeft: LimbMobility,
  limbLowerRight: LimbMobility,
  limbLowerLeft: LimbMobility,
  equipmentUsed: v.optional(v.string()),
  needsRiskStaff: v.optional(v.string()),

  //  3
  deafnessState: RiskState,
  deafnessComments: v.optional(v.string()),
  blindnessState: RiskState,
  blindnessComments: v.optional(v.string()),
  unpredictableBehaviourState: RiskState,
  unpredictableBehaviourComments: v.optional(v.string()),
  uncooperativeBehaviourState: RiskState,
  uncooperativeBehaviourComments: v.optional(v.string()),

  //   4
  distressedReactionState: RiskState,
  distressedReactionComments: v.optional(v.string()),
  disorientatedState: RiskState,
  disorientatedComments: v.optional(v.string()),
  unconsciousState: RiskState,
  unconsciousComments: v.optional(v.string()),
  unbalanceState: RiskState,
  unbalanceComments: v.optional(v.string()),

  //   5
  spasmsState: RiskState,
  spasmsComments: v.optional(v.string()),
  stiffnessState: RiskState,
  stiffnessComments: v.optional(v.string()),
  cathetersState: RiskState,
  cathetersComments: v.optional(v.string()),
  incontinenceState: RiskState,
  incontinenceComments: v.optional(v.string()),

  //   6
  localisedPain: RiskState,
  localisedPainComments: v.optional(v.string()),
  otherState: RiskState,
  otherComments: v.optional(v.string()),

  // 7
  completedBy: v.string(),
  jobRole: v.string(),
  signature: v.string(),
  completionDate: v.string()
});

export const longTermFallsRiskAssessments = defineTable({
  // Metadata
  residentId: v.id("residents"),
  teamId: v.string(),
  organizationId: v.string(),
  userId: v.string(),

  // 1. Resident information
  age: v.union(v.literal("65-80"), v.literal("81-85"), v.literal("86+")),
  gender: v.union(v.literal("MALE"), v.literal("FEMALE")),
  historyOfFalls: v.union(
    v.literal("RECURRENT-LAST-12"),
    v.literal("FALL-LAST-12"),
    v.literal("FALL-MORE-THAN-12"),
    v.literal("NEVER")
  ),
  mobilityLevel: v.union(
    v.literal("ASSISTANCE-1-AID"),
    v.literal("ASSISTANCE-2-AID"),
    v.literal("INDEPENDENT-WITH-AID"),
    v.literal("INDEPENDENT-SAFE-UNAIDED"),
    v.literal("IMMOBILE")
  ),
  standUnsupported: v.boolean(),
  personalActivities: v.union(
    v.literal("ASSISTANCE"),
    v.literal("INDEPENDENT-EQUIPMENT"),
    v.literal("INDEPENDENT-SAFE")
  ),
  domesticActivities: v.optional(
    v.union(
      v.literal("ASSISTANCE"),
      v.literal("INDEPENDENT-EQUIPMENT"),
      v.literal("INDEPENDENT-SAFE")
    )
  ),
  footwear: v.union(v.literal("UNSAFE"), v.literal("SAFE")),
  visionProblems: v.boolean(),
  bladderBowelMovement: v.union(
    v.literal("FREQUENCY"),
    v.literal("IDENTIFIED-PROBLEMS"),
    v.literal("NO-PROBLEMS")
  ),
  residentEnvironmentalRisks: v.boolean(),
  socialRisks: v.union(
    v.literal("LIVES-ALONE"),
    v.literal("LIMITED-SUPPORT"),
    v.literal("24H-CARE")
  ),
  medicalCondition: v.union(
    v.literal("NEUROLOGICAL-PROBLEMS"),
    v.literal("POSTURAL"),
    v.literal("CARDIAC"),
    v.literal("SKELETAL-CONDITION"),
    v.literal("FRACTURES"),
    v.literal("LISTED-CONDITIONS"),
    v.literal("NO-IDENTIFIED")
  ),
  medicines: v.union(
    v.literal("4-OR-MORE"),
    v.literal("LESS-4"),
    v.literal("NO-MEDICATIONS")
  ),
  safetyAwarness: v.boolean(),
  mentalState: v.union(v.literal("CONFUSED"), v.literal("ORIENTATED")),
  completedBy: v.string(),
  completionDate: v.string(),

  // Metadata
  savedAsDraft: v.optional(v.boolean()),
  createdBy: v.string()
});
