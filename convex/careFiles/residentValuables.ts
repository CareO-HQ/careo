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
      other: args.other
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
    )
  },
  returns: v.id("residentValuablesAssessments"),
  handler: async (ctx, args) => {
    // Verify assessment exists
    const assessment = await ctx.db.get(args.assessmentId);
    if (!assessment) {
      throw new Error("Assessment not found");
    }

    // Update the assessment
    await ctx.db.patch(args.assessmentId, {
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
      other: args.other
    });

    return args.assessmentId;
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
    assessmentId: v.id("residentValuablesAssessments")
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId);
    if (!assessment?.pdfFileId) {
      return null;
    }
    return await ctx.storage.getUrl(assessment.pdfFileId);
  }
});
