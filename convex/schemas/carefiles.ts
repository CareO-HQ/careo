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
