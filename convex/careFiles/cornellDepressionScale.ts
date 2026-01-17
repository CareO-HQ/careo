import { v } from "convex/values";
import { mutation, query, internalMutation, internalAction } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

const ratingValue = v.union(v.literal("0"), v.literal("1"), v.literal("2"));

/**
 * Submit a new Cornell Depression Scale assessment or update an existing one
 */
export const submitCornellDepressionScale = mutation({
  args: {
    // Administrative Information
    residentName: v.string(),
    dateOfBirth: v.string(),
    dateOfAssessment: v.string(),
    assessedBy: v.string(),

    // A. Mood-Related Signs
    anxiety: ratingValue,
    sadness: ratingValue,
    lackOfReactivity: ratingValue,
    irritability: ratingValue,

    // B. Behavioral Disturbance
    agitation: ratingValue,
    retardation: ratingValue,
    multiplePhysicalComplaints: ratingValue,
    lossOfInterest: ratingValue,

    // C. Physical Signs
    appetiteLoss: ratingValue,
    weightLoss: ratingValue,

    // D. Cyclic Functions
    diurnalVariation: ratingValue,
    sleepDisturbance: ratingValue,

    // E. Ideational Disturbance
    suicidalIdeation: ratingValue,
    lowSelfEsteem: ratingValue,
    pessimism: ratingValue,
    moodCongruentDelusions: ratingValue,

    // Completion fields
    signature: v.optional(v.string()),

    // System fields
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),
    savedAsDraft: v.optional(v.boolean()),
    assessmentId: v.optional(v.id("cornellDepressionScales")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Verify resident belongs to organization
    const resident = await ctx.db.get(args.residentId);
    if (!resident || resident.organizationId !== args.organizationId) {
      throw new Error("Resident not found or unauthorized");
    }

    // Calculate total score
    let totalScore = 0;

    // A. Mood-Related Signs
    totalScore += parseInt(args.anxiety);
    totalScore += parseInt(args.sadness);
    totalScore += parseInt(args.lackOfReactivity);
    totalScore += parseInt(args.irritability);

    // B. Behavioral Disturbance
    totalScore += parseInt(args.agitation);
    totalScore += parseInt(args.retardation);
    totalScore += parseInt(args.multiplePhysicalComplaints);
    totalScore += parseInt(args.lossOfInterest);

    // C. Physical Signs
    totalScore += parseInt(args.appetiteLoss);
    totalScore += parseInt(args.weightLoss);

    // D. Cyclic Functions
    totalScore += parseInt(args.diurnalVariation);
    totalScore += parseInt(args.sleepDisturbance);

    // E. Ideational Disturbance
    totalScore += parseInt(args.suicidalIdeation);
    totalScore += parseInt(args.lowSelfEsteem);
    totalScore += parseInt(args.pessimism);
    totalScore += parseInt(args.moodCongruentDelusions);

    // Determine severity
    let severity = "No Depression";
    if (totalScore > 7 && totalScore <= 12) severity = "Mild Depression";
    else if (totalScore > 12) severity = "Major Depression";

    const assessmentData = {
      // Administrative
      residentName: args.residentName,
      dateOfBirth: args.dateOfBirth,
      dateOfAssessment: args.dateOfAssessment,
      assessedBy: args.assessedBy,

      // A. Mood-Related Signs
      anxiety: args.anxiety,
      sadness: args.sadness,
      lackOfReactivity: args.lackOfReactivity,
      irritability: args.irritability,

      // B. Behavioral Disturbance
      agitation: args.agitation,
      retardation: args.retardation,
      multiplePhysicalComplaints: args.multiplePhysicalComplaints,
      lossOfInterest: args.lossOfInterest,

      // C. Physical Signs
      appetiteLoss: args.appetiteLoss,
      weightLoss: args.weightLoss,

      // D. Cyclic Functions
      diurnalVariation: args.diurnalVariation,
      sleepDisturbance: args.sleepDisturbance,

      // E. Ideational Disturbance
      suicidalIdeation: args.suicidalIdeation,
      lowSelfEsteem: args.lowSelfEsteem,
      pessimism: args.pessimism,
      moodCongruentDelusions: args.moodCongruentDelusions,

      // Completion
      signature: args.signature,

      // Calculated fields
      totalScore,
      severity,

      // System
      residentId: args.residentId,
      teamId: args.teamId,
      organizationId: args.organizationId,
      userId: args.userId,
      createdBy: args.userId,
      status: args.savedAsDraft ? ("draft" as const) : ("submitted" as const),
    };

    let assessmentId: Id<"cornellDepressionScales">;

    if (args.assessmentId) {
      // Update existing assessment
      await ctx.db.patch(args.assessmentId, assessmentData);
      assessmentId = args.assessmentId;
    } else {
      // Create new assessment
      assessmentId = await ctx.db.insert("cornellDepressionScales", assessmentData);
    }

    // Schedule PDF generation if not a draft
    if (!args.savedAsDraft) {
      await ctx.scheduler.runAfter(0, internal.careFiles.cornellDepressionScale.generatePDF, {
        assessmentId,
        organizationId: args.organizationId,
      });
    }

    return assessmentId;
  },
});

/**
 * Get a Cornell Depression Scale assessment by ID
 */
export const getCornellDepressionScale = query({
  args: {
    assessmentId: v.id("cornellDepressionScales"),
  },
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId);
    if (!assessment) {
      throw new Error("Assessment not found");
    }
    return assessment;
  },
});

/**
 * Get all Cornell Depression Scale assessments for a resident
 */
export const getCornellDepressionScalesByResident = query({
  args: {
    residentId: v.id("residents"),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const assessments = await ctx.db
      .query("cornellDepressionScales")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .collect();

    return assessments.sort((a, b) => b._creationTime - a._creationTime);
  },
});

/**
 * Delete a Cornell Depression Scale assessment
 */
export const deleteCornellDepressionScale = mutation({
  args: {
    assessmentId: v.id("cornellDepressionScales"),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const assessment = await ctx.db.get(args.assessmentId);
    if (!assessment || assessment.organizationId !== args.organizationId) {
      throw new Error("Assessment not found or unauthorized");
    }

    // Delete associated PDF if exists
    if (assessment.pdfFileId) {
      await ctx.storage.delete(assessment.pdfFileId);
    }

    await ctx.db.delete(args.assessmentId);
  },
});

/**
 * Get archived assessments (all except the latest) for a resident
 */
export const getArchivedForResident = query({
  args: {
    residentId: v.id("residents"),
  },
  handler: async (ctx, args) => {
    const allAssessments = await ctx.db
      .query("cornellDepressionScales")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .collect();

    const sortedAssessments = allAssessments.sort((a, b) => b._creationTime - a._creationTime);

    // Return all except the latest one
    return sortedAssessments.length > 1 ? sortedAssessments.slice(1) : [];
  },
});

/**
 * Get PDF URL for a Cornell Depression Scale assessment
 */
export const getPDFUrl = query({
  args: {
    assessmentId: v.id("cornellDepressionScales"),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId);
    if (!assessment || assessment.organizationId !== args.organizationId) {
      return null;
    }

    if (!assessment.pdfFileId) {
      return null;
    }

    const url = await ctx.storage.getUrl(assessment.pdfFileId);
    return url;
  },
});

/**
 * Internal action to generate PDF for Cornell Depression Scale assessment
 */
export const generatePDF = internalAction({
  args: {
    assessmentId: v.id("cornellDepressionScales"),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    // This will be implemented with actual PDF generation logic
    console.log("PDF generation scheduled for Cornell Depression Scale assessment:", args.assessmentId);
  },
});

/**
 * Internal mutation to update PDF file ID
 */
export const updatePDFFileId = internalMutation({
  args: {
    assessmentId: v.id("cornellDepressionScales"),
    pdfFileId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assessmentId, {
      pdfFileId: args.pdfFileId,
    });
  },
});
