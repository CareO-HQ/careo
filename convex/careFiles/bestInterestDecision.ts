import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Submit a best interest decision form
 */
export const submitBestInterestDecision = mutation({
  args: {
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),
    residentFullName: v.string(),
    dateOfBirth: v.float64(),
    residentIdNumber: v.string(),
    dateOfDecision: v.string(),
    typeOfDecision: v.array(v.string()),
    otherDecisionType: v.optional(v.string()),
    detailsOfDecision: v.string(),
    ableToUnderstand: v.union(v.literal("YES"), v.literal("NO")),
    reasonsForLackOfCapacity: v.optional(v.object({
      cognitiveImpairment: v.boolean(),
      communicationDifficulty: v.boolean(),
      fluctuatingCapacity: v.boolean(),
      other: v.boolean(),
      otherDetails: v.optional(v.string())
    })),
    assessorName: v.string(),
    assessorRole: v.string(),
    assessorSignature: v.string(),
    assessmentDate: v.string(),
    discussionWith: v.array(v.string()),
    viewsExpressed: v.array(v.object({
      personConsulted: v.string(),
      relationship: v.string(),
      viewPreference: v.string(),
      notes: v.optional(v.string())
    })),
    optionsConsidered: v.array(v.object({
      option: v.string(),
      benefits: v.string(),
      risks: v.string(),
      preferred: v.boolean()
    })),
    reasonForPreferredOption: v.string(),
    risksIfNotFollowed: v.string(),
    decisionOutcome: v.union(v.literal("PROCEED"), v.literal("DO_NOT_PROCEED")),
    summaryRationale: v.string(),
    decisionMakerName: v.string(),
    decisionMakerRole: v.string(),
    decisionMakerSignature: v.string(),
    decisionMakerDate: v.string(),
    witnessName: v.optional(v.string()),
    witnessRole: v.optional(v.string()),
    witnessSignature: v.optional(v.string()),
    witnessDate: v.optional(v.string()),
    nextOfKinName: v.optional(v.string()),
    nextOfKinRelationship: v.optional(v.string()),
    nextOfKinSignature: v.optional(v.string()),
    nextOfKinDate: v.optional(v.string()),
    savedAsDraft: v.optional(v.boolean()),
    createdAt: v.optional(v.string())
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const formId = await ctx.db.insert("bestInterestDecisions", {
      ...args,
      createdAt: args.createdAt || new Date().toISOString(),
      pdfFileId: "pending" as Id<"_storage">,
      pdfGenerated: false,
      isArchived: false
    });

    // TODO: Implement PDF generation
    // await ctx.scheduler.runAfter(
    //   1000,
    //   internal.careFiles.bestInterestDecision.generatePDFAndUpdateRecord,
    //   { formId }
    // );

    return formId;
  }
});

/**
 * Get a specific best interest decision by ID
 */
export const getBestInterestDecision = query({
  args: { assessmentId: v.id("bestInterestDecisions") },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.assessmentId);
  }
});

/**
 * Get all best interest decisions for a resident
 */
export const getBestInterestDecisionsByResident = query({
  args: { residentId: v.id("residents") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const decisions = await ctx.db
      .query("bestInterestDecisions")
      .filter((q) =>
        q.and(
          q.eq(q.field("residentId"), args.residentId),
          q.eq(q.field("isArchived"), false)
        )
      )
      .collect();

    return decisions.sort((a, b) => b._creationTime - a._creationTime);
  }
});

/**
 * Get archived best interest decisions for a resident
 */
export const getArchivedForResident = query({
  args: { residentId: v.id("residents") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const decisions = await ctx.db
      .query("bestInterestDecisions")
      .filter((q) =>
        q.and(
          q.eq(q.field("residentId"), args.residentId),
          q.eq(q.field("isArchived"), true)
        )
      )
      .collect();

    return decisions.sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0));
  }
});

/**
 * Delete a best interest decision
 */
export const deleteBestInterestDecision = mutation({
  args: { id: v.id("bestInterestDecisions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    await ctx.db.delete(args.id);
  }
});

/**
 * Get PDF URL for a best interest decision
 */
export const getPdfUrl = query({
  args: { assessmentId: v.id("bestInterestDecisions") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const decision = await ctx.db.get(args.assessmentId);
    if (!decision || !decision.pdfFileId || decision.pdfFileId === "pending") {
      return null;
    }

    try {
      const url = await ctx.storage.getUrl(decision.pdfFileId as Id<"_storage">);
      return url;
    } catch {
      return null;
    }
  }
});

/**
 * Archive old best interest decisions when a new one is created
 */
export const archiveOldDecisions = mutation({
  args: {
    residentId: v.id("residents"),
    currentDecisionId: v.id("bestInterestDecisions")
  },
  handler: async (ctx, args) => {
    const decisions = await ctx.db
      .query("bestInterestDecisions")
      .filter((q) =>
        q.and(
          q.eq(q.field("residentId"), args.residentId),
          q.neq(q.field("_id"), args.currentDecisionId),
          q.eq(q.field("isArchived"), false)
        )
      )
      .collect();

    for (const decision of decisions) {
      await ctx.db.patch(decision._id, {
        isArchived: true,
        archivedAt: Date.now()
      });
    }
  }
});
