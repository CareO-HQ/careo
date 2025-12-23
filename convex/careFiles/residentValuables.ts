import { internalMutation, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

/**
 * Submit a new resident valuables assessment
 */
export const submitResidentValuables = mutation({
  args: {
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),
    residentName: v.string(),
    bedroomNumber: v.string(),
    date: v.number(),
    completedBy: v.string(),
    witnessedBy: v.string(),
    valuables: v.array(v.object({ value: v.string() })),
    n50: v.optional(v.number()),
    n20: v.optional(v.number()),
    n10: v.optional(v.number()),
    n5: v.optional(v.number()),
    n2: v.optional(v.number()),
    n1: v.optional(v.number()),
    p50: v.optional(v.number()),
    p20: v.optional(v.number()),
    p10: v.optional(v.number()),
    p5: v.optional(v.number()),
    p2: v.optional(v.number()),
    p1: v.optional(v.number()),
    total: v.number(),
    clothing: v.array(v.object({ value: v.string() })),
    other: v.array(
      v.object({
        details: v.string(),
        receivedBy: v.string(),
        witnessedBy: v.string(),
        date: v.number(),
        time: v.string()
      })
    )
  },
  returns: v.id("residentValuablesAssessments"),
  handler: async (ctx, args) => {
    // Verify resident exists
    const resident = await ctx.db.get(args.residentId);
    if (!resident) {
      throw new Error("Resident not found");
    }

    // Create the assessment
    const assessmentId = await ctx.db.insert("residentValuablesAssessments", {
      residentId: args.residentId,
      teamId: args.teamId,
      organizationId: args.organizationId,
      userId: args.userId,
      residentName: args.residentName,
      bedroomNumber: args.bedroomNumber,
      date: args.date,
      completedBy: args.completedBy,
      witnessedBy: args.witnessedBy,
      valuables: args.valuables,
      n50: args.n50,
      n20: args.n20,
      n10: args.n10,
      n5: args.n5,
      n2: args.n2,
      n1: args.n1,
      p50: args.p50,
      p20: args.p20,
      p10: args.p10,
      p5: args.p5,
      p2: args.p2,
      p1: args.p1,
      total: args.total,
      clothing: args.clothing,
      other: args.other,
      createdBy: args.userId
    });

    return assessmentId;
  }
});

/**
 * Update an existing resident valuables assessment
 */
export const updateResidentValuables = mutation({
  args: {
    assessmentId: v.id("residentValuablesAssessments"),
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),
    residentName: v.string(),
    bedroomNumber: v.string(),
    date: v.number(),
    completedBy: v.string(),
    witnessedBy: v.string(),
    valuables: v.array(v.object({ value: v.string() })),
    n50: v.optional(v.number()),
    n20: v.optional(v.number()),
    n10: v.optional(v.number()),
    n5: v.optional(v.number()),
    n2: v.optional(v.number()),
    n1: v.optional(v.number()),
    p50: v.optional(v.number()),
    p20: v.optional(v.number()),
    p10: v.optional(v.number()),
    p5: v.optional(v.number()),
    p2: v.optional(v.number()),
    p1: v.optional(v.number()),
    total: v.number(),
    clothing: v.array(v.object({ value: v.string() })),
    other: v.array(
      v.object({
        details: v.string(),
        receivedBy: v.string(),
        witnessedBy: v.string(),
        date: v.number(),
        time: v.string()
      })
    ),
    savedAsDraft: v.optional(v.boolean())
  },
  returns: v.id("residentValuablesAssessments"),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Verify assessment exists
    const assessment = await ctx.db.get(args.assessmentId);
    if (!assessment) {
      throw new Error("Assessment not found");
    }

    // Create a NEW version instead of patching the old one
    const newAssessmentId = await ctx.db.insert("residentValuablesAssessments", {
      residentId: args.residentId,
      teamId: args.teamId,
      organizationId: args.organizationId,
      userId: args.userId,
      residentName: args.residentName,
      bedroomNumber: args.bedroomNumber,
      date: args.date,
      completedBy: args.completedBy,
      witnessedBy: args.witnessedBy,
      valuables: args.valuables,
      n50: args.n50,
      n20: args.n20,
      n10: args.n10,
      n5: args.n5,
      n2: args.n2,
      n1: args.n1,
      p50: args.p50,
      p20: args.p20,
      p10: args.p10,
      p5: args.p5,
      p2: args.p2,
      p1: args.p1,
      total: args.total,
      clothing: args.clothing,
      other: args.other,

      // Metadata
      status: args.savedAsDraft ? ("draft" as const) : ("submitted" as const),
      submittedAt: args.savedAsDraft ? undefined : now,
      createdBy: args.userId
    });

    return newAssessmentId;
  }
});

/**
 * Get a resident valuables assessment by ID
 */
export const getResidentValuablesById = query({
  args: {
    assessmentId: v.id("residentValuablesAssessments")
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.assessmentId);
  }
});

/**
 * Get all resident valuables assessments for a resident
 */
export const getResidentValuablesByResidentId = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const assessments = await ctx.db
      .query("residentValuablesAssessments")
      .filter((q) => q.eq(q.field("residentId"), args.residentId))
      .collect();

    return assessments;
  }
});

/**
 * Get all resident valuables assessments for a resident (with organization check)
 */
export const getResidentValuablesByResident = query({
  args: {
    residentId: v.id("residents"),
    organizationId: v.string()
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Verify resident exists and user has access
    const resident = await ctx.db.get(args.residentId);
    if (!resident) {
      throw new Error("Resident not found");
    }

    if (resident.organizationId !== args.organizationId) {
      throw new Error("Unauthorized access to resident");
    }

    const assessments = await ctx.db
      .query("residentValuablesAssessments")
      .filter((q) => q.eq(q.field("residentId"), args.residentId))
      .collect();

    return assessments;
  }
});

/**
 * Delete a resident valuables assessment
 */
export const deleteResidentValuables = mutation({
  args: {
    assessmentId: v.id("residentValuablesAssessments")
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Verify assessment exists
    const assessment = await ctx.db.get(args.assessmentId);
    if (!assessment) {
      throw new Error("Assessment not found");
    }

    await ctx.db.delete(args.assessmentId);
    return true;
  }
});

/**
 * Get PDF URL for a resident valuables assessment
 */
export const getPDFUrl = query({
  args: {
    assessmentId: v.id("residentValuablesAssessments"),
    organizationId: v.string()
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    // Verify assessment exists
    const assessment = await ctx.db.get(args.assessmentId);
    if (!assessment) {
      // Return null if assessment was deleted instead of throwing error
      return null;
    }

    // Verify user has access to this assessment's organization
    if (assessment.organizationId !== args.organizationId) {
      throw new Error("Unauthorized access to assessment");
    }

    // Return PDF URL if available
    if (assessment.pdfFileId) {
      return await ctx.storage.getUrl(assessment.pdfFileId);
    }

    return null;
  }
});

/**
 * Get archived (non-latest) resident valuables assessments for a resident
 * Returns all assessments except the most recent one
 */
export const getArchivedForResident = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Get all assessments for this resident, ordered by creation time (newest first)
    const allAssessments = await ctx.db
      .query("residentValuablesAssessments")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    // Return all except the first one (the latest)
    return allAssessments.length > 1 ? allAssessments.slice(1) : [];
  }
});
