import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export const submitLongTermFallsAssessment = mutation({
  args: {
    // Metadata
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),

    // Assessment fields
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
    completionDate: v.string()
  },
  returns: v.id("longTermFallsRiskAssessments"),
  handler: async (ctx, args) => {
    // Insert the assessment into the database
    const assessmentId = await ctx.db.insert(
      "longTermFallsRiskAssessments",
      args
    );

    return assessmentId;
  }
});
