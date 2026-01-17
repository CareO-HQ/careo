import { v } from "convex/values";
import { mutation, query, internalMutation, internalAction } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

/**
 * Submit a new choking risk assessment or update an existing one
 */
export const submitChokingRiskAssessment = mutation({
  args: {
    // Administrative Information
    residentName: v.string(),
    dateOfBirth: v.string(),
    dateOfAssessment: v.string(),
    time: v.string(),

    // Respiratory Risks
    weakCough: v.optional(v.boolean()),
    chestInfections: v.optional(v.boolean()),
    breathingDifficulties: v.optional(v.boolean()),
    knownToAspirate: v.optional(v.boolean()),
    chokingHistory: v.optional(v.boolean()),
    gurgledVoice: v.optional(v.boolean()),

    // At Risk Groups
    epilepsy: v.optional(v.boolean()),
    cerebralPalsy: v.optional(v.boolean()),
    dementia: v.optional(v.boolean()),
    mentalHealth: v.optional(v.boolean()),
    neurologicalConditions: v.optional(v.boolean()),
    learningDisabilities: v.optional(v.boolean()),

    // Physical Risks
    posturalProblems: v.optional(v.boolean()),
    poorHeadControl: v.optional(v.boolean()),
    tongueThrust: v.optional(v.boolean()),
    chewingDifficulties: v.optional(v.boolean()),
    slurredSpeech: v.optional(v.boolean()),
    neckTrauma: v.optional(v.boolean()),
    poorDentition: v.optional(v.boolean()),

    // Eating Behaviours
    eatsRapidly: v.optional(v.boolean()),
    drinksRapidly: v.optional(v.boolean()),
    eatsWhileCoughing: v.optional(v.boolean()),
    drinksWhileCoughing: v.optional(v.boolean()),
    crammingFood: v.optional(v.boolean()),
    pocketingFood: v.optional(v.boolean()),
    swallowingWithoutChewing: v.optional(v.boolean()),
    wouldTakeFood: v.optional(v.boolean()),

    // Protective Factors
    drinksIndependently: v.optional(v.boolean()),
    eatsIndependently: v.optional(v.boolean()),

    // Additional fields
    completedBy: v.string(),
    signature: v.optional(v.string()),

    // System fields
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),
    savedAsDraft: v.optional(v.boolean()),
    assessmentId: v.optional(v.id("chokingRiskAssessments")),
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

    // Calculate total risk score
    let totalScore = 0;

    // Respiratory Risks (10 points each)
    if (args.weakCough) totalScore += 10;
    if (args.chestInfections) totalScore += 10;
    if (args.breathingDifficulties) totalScore += 10;
    if (args.knownToAspirate) totalScore += 10;
    if (args.chokingHistory) totalScore += 10;
    if (args.gurgledVoice) totalScore += 10;

    // At Risk Groups
    if (args.epilepsy) totalScore += 4;
    if (args.cerebralPalsy) totalScore += 10;
    if (args.dementia) totalScore += 4;
    if (args.mentalHealth) totalScore += 4;
    if (args.neurologicalConditions) totalScore += 10;
    if (args.learningDisabilities) totalScore += 10;

    // Physical Risks
    if (args.posturalProblems) totalScore += 10;
    if (args.poorHeadControl) totalScore += 10;
    if (args.tongueThrust) totalScore += 10;
    if (args.chewingDifficulties) totalScore += 10;
    if (args.slurredSpeech) totalScore += 8;
    if (args.neckTrauma) totalScore += 8;
    if (args.poorDentition) totalScore += 8;

    // Eating Behaviours
    if (args.eatsRapidly) totalScore += 10;
    if (args.drinksRapidly) totalScore += 10;
    if (args.eatsWhileCoughing) totalScore += 10;
    if (args.drinksWhileCoughing) totalScore += 10;
    if (args.crammingFood) totalScore += 10;
    if (args.pocketingFood) totalScore += 8;
    if (args.swallowingWithoutChewing) totalScore += 8;
    if (args.wouldTakeFood) totalScore += 4;

    // Protective Factors (2 points if NO)
    if (args.drinksIndependently === false) totalScore += 2;
    if (args.eatsIndependently === false) totalScore += 2;

    // Determine risk level
    let riskLevel = "No Risk";
    if (totalScore > 0 && totalScore <= 10) riskLevel = "Low Risk";
    else if (totalScore <= 30) riskLevel = "Medium Risk";
    else if (totalScore <= 50) riskLevel = "High Risk";
    else if (totalScore > 50) riskLevel = "Very High Risk";

    const assessmentData = {
      // Administrative
      residentName: args.residentName,
      dateOfBirth: args.dateOfBirth,
      dateOfAssessment: args.dateOfAssessment,
      time: args.time,

      // Respiratory Risks
      weakCough: args.weakCough,
      chestInfections: args.chestInfections,
      breathingDifficulties: args.breathingDifficulties,
      knownToAspirate: args.knownToAspirate,
      chokingHistory: args.chokingHistory,
      gurgledVoice: args.gurgledVoice,

      // At Risk Groups
      epilepsy: args.epilepsy,
      cerebralPalsy: args.cerebralPalsy,
      dementia: args.dementia,
      mentalHealth: args.mentalHealth,
      neurologicalConditions: args.neurologicalConditions,
      learningDisabilities: args.learningDisabilities,

      // Physical Risks
      posturalProblems: args.posturalProblems,
      poorHeadControl: args.poorHeadControl,
      tongueThrust: args.tongueThrust,
      chewingDifficulties: args.chewingDifficulties,
      slurredSpeech: args.slurredSpeech,
      neckTrauma: args.neckTrauma,
      poorDentition: args.poorDentition,

      // Eating Behaviours
      eatsRapidly: args.eatsRapidly,
      drinksRapidly: args.drinksRapidly,
      eatsWhileCoughing: args.eatsWhileCoughing,
      drinksWhileCoughing: args.drinksWhileCoughing,
      crammingFood: args.crammingFood,
      pocketingFood: args.pocketingFood,
      swallowingWithoutChewing: args.swallowingWithoutChewing,
      wouldTakeFood: args.wouldTakeFood,

      // Protective Factors
      drinksIndependently: args.drinksIndependently,
      eatsIndependently: args.eatsIndependently,

      // Additional
      completedBy: args.completedBy,
      signature: args.signature,

      // Calculated fields
      totalScore,
      riskLevel,

      // System
      residentId: args.residentId,
      teamId: args.teamId,
      organizationId: args.organizationId,
      userId: args.userId,
      createdBy: args.userId,
      status: args.savedAsDraft ? ("draft" as const) : ("submitted" as const),
    };

    let assessmentId: Id<"chokingRiskAssessments">;

    if (args.assessmentId) {
      // Update existing assessment
      await ctx.db.patch(args.assessmentId, assessmentData);
      assessmentId = args.assessmentId;
    } else {
      // Create new assessment
      assessmentId = await ctx.db.insert("chokingRiskAssessments", assessmentData);
    }

    // Schedule PDF generation if not a draft
    if (!args.savedAsDraft) {
      await ctx.scheduler.runAfter(0, internal.careFiles.chokingRiskAssessment.generatePDF, {
        assessmentId,
        organizationId: args.organizationId,
      });
    }

    return assessmentId;
  },
});

/**
 * Get a choking risk assessment by ID
 */
export const getChokingRiskAssessment = query({
  args: {
    assessmentId: v.id("chokingRiskAssessments"),
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
 * Get all choking risk assessments for a resident
 */
export const getChokingRiskAssessmentsByResident = query({
  args: {
    residentId: v.id("residents"),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const assessments = await ctx.db
      .query("chokingRiskAssessments")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .collect();

    return assessments.sort((a, b) => b._creationTime - a._creationTime);
  },
});

/**
 * Delete a choking risk assessment
 */
export const deleteChokingRiskAssessment = mutation({
  args: {
    assessmentId: v.id("chokingRiskAssessments"),
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
      .query("chokingRiskAssessments")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .collect();

    const sortedAssessments = allAssessments.sort((a, b) => b._creationTime - a._creationTime);

    // Return all except the latest one
    return sortedAssessments.length > 1 ? sortedAssessments.slice(1) : [];
  },
});

/**
 * Get PDF URL for a choking risk assessment
 */
export const getPDFUrl = query({
  args: {
    assessmentId: v.id("chokingRiskAssessments"),
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
 * Internal action to generate PDF for choking risk assessment
 */
export const generatePDF = internalAction({
  args: {
    assessmentId: v.id("chokingRiskAssessments"),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    // This will be implemented with actual PDF generation logic
    // For now, we'll create a placeholder implementation
    console.log("PDF generation scheduled for assessment:", args.assessmentId);
  },
});

/**
 * Internal mutation to update PDF file ID
 */
export const updatePDFFileId = internalMutation({
  args: {
    assessmentId: v.id("chokingRiskAssessments"),
    pdfFileId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assessmentId, {
      pdfFileId: args.pdfFileId,
    });
  },
});
