import { v } from "convex/values";
import { mutation, query, internalMutation, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

/**
 * Submit a bed rails risk assessment
 */
export const submitBedRailsRiskAssessment = mutation({
  args: {
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),
    residentName: v.string(),
    bedroomNumber: v.string(),
    dateOfBirth: v.float64(),
    assessmentCompletedBy: v.string(),
    jobRole: v.string(),
    dateOfAssessment: v.string(),
    alternativeEquipmentConsidered: v.string(),
    reasonsAlternativesNotSuccessful: v.string(),
    exclusionCriteria: v.object({
      residentRefuses: v.boolean(),
      climbingRisk: v.boolean(),
      entrapmentRisk: v.boolean(),
      abnormalBodySize: v.boolean(),
      restraintPurpose: v.boolean(),
      freedomLimitation: v.boolean()
    }),
    anyExclusionChecked: v.boolean(),
    authorizationRationale: v.object({
      residentRequests: v.boolean(),
      mdtMeetingCompleted: v.boolean(),
      riskOutweighsBenefit: v.boolean(),
      alternativesExplored: v.boolean(),
      bestInterestDecision: v.boolean()
    }),
    reasonExplainedToResident: v.union(v.literal("YES"), v.literal("NO")),
    typeOfBed: v.union(v.literal("DIVAN"), v.literal("PROFILING_BED")),
    typeOfMattress: v.union(
      v.literal("STANDARD"),
      v.literal("LIGHTWEIGHT_FOAM"),
      v.literal("STANDARD_WITH_OVERLAY"),
      v.literal("FULL_REPLACEMENT")
    ),
    typeOfBedrails: v.union(
      v.literal("INTEGRAL_FIXED"),
      v.literal("EXTENDED_HEIGHT_INTEGRAL"),
      v.literal("EXTENDED_HEIGHT_NON_INTEGRAL")
    ),
    safetyChecklist: v.object({
      gapBetweenRailAndMattress: v.union(v.literal("YES"), v.literal("NO")),
      mattressCompressesEasily: v.union(v.literal("YES"), v.literal("NO")),
      gapMoreThan60mm: v.union(v.literal("YES"), v.literal("NO")),
      bedRailInsecure: v.union(v.literal("YES"), v.literal("NO")),
      bedAgainstWall: v.union(v.literal("YES"), v.literal("NO"))
    }),
    anySafetyCheckFailed: v.boolean(),
    hasExtendedHeightRails: v.boolean(),
    extendedHeightChecks: v.optional(
      v.object({
        positionedCorrectly: v.union(v.literal("YES"), v.literal("NO")),
        securelyFastened: v.union(v.literal("YES"), v.literal("NO")),
        correctBumpersInstalled: v.union(v.literal("YES"), v.literal("NO")),
        mattressBelowPlimsollLine: v.union(v.literal("YES"), v.literal("NO")),
        staffTrained: v.union(v.literal("YES"), v.literal("NO")),
        checkedForDamage: v.union(v.literal("YES"), v.literal("NO"))
      })
    ),
    consentObtained: v.union(v.literal("YES"), v.literal("NO")),
    carePlanCompleted: v.union(v.literal("YES"), v.literal("NO")),
    signatureOfAssessor: v.string(),
    signatureDate: v.string(),
    savedAsDraft: v.optional(v.boolean()),
    createdAt: v.optional(v.string())
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const createdAt = args.createdAt || new Date().toISOString();

    // Archive any existing non-draft assessment for this resident
    const existingAssessments = await ctx.db
      .query("bedRailsRiskAssessments")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .filter((q) => q.neq(q.field("savedAsDraft"), true))
      .collect();

    // Archive all existing completed assessments
    for (const assessment of existingAssessments) {
      await ctx.db.patch(assessment._id, {
        isArchived: true,
        archivedAt: now
      });
    }

    // Create new assessment
    const assessmentId = await ctx.db.insert("bedRailsRiskAssessments", {
      residentId: args.residentId,
      teamId: args.teamId,
      organizationId: args.organizationId,
      userId: args.userId,
      residentName: args.residentName,
      bedroomNumber: args.bedroomNumber,
      dateOfBirth: args.dateOfBirth,
      assessmentCompletedBy: args.assessmentCompletedBy,
      jobRole: args.jobRole,
      dateOfAssessment: args.dateOfAssessment,
      alternativeEquipmentConsidered: args.alternativeEquipmentConsidered,
      reasonsAlternativesNotSuccessful: args.reasonsAlternativesNotSuccessful,
      exclusionCriteria: args.exclusionCriteria,
      anyExclusionChecked: args.anyExclusionChecked,
      authorizationRationale: args.authorizationRationale,
      reasonExplainedToResident: args.reasonExplainedToResident,
      typeOfBed: args.typeOfBed,
      typeOfMattress: args.typeOfMattress,
      typeOfBedrails: args.typeOfBedrails,
      safetyChecklist: args.safetyChecklist,
      anySafetyCheckFailed: args.anySafetyCheckFailed,
      hasExtendedHeightRails: args.hasExtendedHeightRails,
      extendedHeightChecks: args.extendedHeightChecks,
      consentObtained: args.consentObtained,
      carePlanCompleted: args.carePlanCompleted,
      signatureOfAssessor: args.signatureOfAssessor,
      signatureDate: args.signatureDate,
      savedAsDraft: args.savedAsDraft || false,
      isArchived: false,
      createdAt,
      updatedAt: now
    });

    // Generate PDF in the background if not a draft
    if (!args.savedAsDraft) {
      await ctx.scheduler.runAfter(
        0,
        internal.careFiles.bedRailsRiskAssessment.generatePDFAndUpdateRecord,
        {
          assessmentId,
          formData: args
        }
      );
    }

    return assessmentId;
  }
});

/**
 * Get a bed rails risk assessment by ID
 */
export const getBedRailsRiskAssessment = query({
  args: { assessmentId: v.id("bedRailsRiskAssessments") },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.assessmentId);
  }
});

/**
 * Get all bed rails risk assessments for a resident
 */
export const getBedRailsRiskAssessmentsByResident = query({
  args: { residentId: v.id("residents") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bedRailsRiskAssessments")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .order("desc")
      .collect();
  }
});

/**
 * Get archived bed rails risk assessments for a resident
 */
export const getArchivedForResident = query({
  args: { residentId: v.id("residents") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bedRailsRiskAssessments")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .filter((q) => q.eq(q.field("isArchived"), true))
      .order("desc")
      .collect();
  }
});

/**
 * Update an existing bed rails risk assessment
 */
export const updateBedRailsRiskAssessment = mutation({
  args: {
    id: v.id("bedRailsRiskAssessments"),
    residentName: v.string(),
    bedroomNumber: v.string(),
    dateOfBirth: v.float64(),
    assessmentCompletedBy: v.string(),
    jobRole: v.string(),
    dateOfAssessment: v.string(),
    alternativeEquipmentConsidered: v.string(),
    reasonsAlternativesNotSuccessful: v.string(),
    exclusionCriteria: v.object({
      residentRefuses: v.boolean(),
      climbingRisk: v.boolean(),
      entrapmentRisk: v.boolean(),
      abnormalBodySize: v.boolean(),
      restraintPurpose: v.boolean(),
      freedomLimitation: v.boolean()
    }),
    anyExclusionChecked: v.boolean(),
    authorizationRationale: v.object({
      residentRequests: v.boolean(),
      mdtMeetingCompleted: v.boolean(),
      riskOutweighsBenefit: v.boolean(),
      alternativesExplored: v.boolean(),
      bestInterestDecision: v.boolean()
    }),
    reasonExplainedToResident: v.union(v.literal("YES"), v.literal("NO")),
    typeOfBed: v.union(v.literal("DIVAN"), v.literal("PROFILING_BED")),
    typeOfMattress: v.union(
      v.literal("STANDARD"),
      v.literal("LIGHTWEIGHT_FOAM"),
      v.literal("STANDARD_WITH_OVERLAY"),
      v.literal("FULL_REPLACEMENT")
    ),
    typeOfBedrails: v.union(
      v.literal("INTEGRAL_FIXED"),
      v.literal("EXTENDED_HEIGHT_INTEGRAL"),
      v.literal("EXTENDED_HEIGHT_NON_INTEGRAL")
    ),
    safetyChecklist: v.object({
      gapBetweenRailAndMattress: v.union(v.literal("YES"), v.literal("NO")),
      mattressCompressesEasily: v.union(v.literal("YES"), v.literal("NO")),
      gapMoreThan60mm: v.union(v.literal("YES"), v.literal("NO")),
      bedRailInsecure: v.union(v.literal("YES"), v.literal("NO")),
      bedAgainstWall: v.union(v.literal("YES"), v.literal("NO"))
    }),
    anySafetyCheckFailed: v.boolean(),
    hasExtendedHeightRails: v.boolean(),
    extendedHeightChecks: v.optional(
      v.object({
        positionedCorrectly: v.union(v.literal("YES"), v.literal("NO")),
        securelyFastened: v.union(v.literal("YES"), v.literal("NO")),
        correctBumpersInstalled: v.union(v.literal("YES"), v.literal("NO")),
        mattressBelowPlimsollLine: v.union(v.literal("YES"), v.literal("NO")),
        staffTrained: v.union(v.literal("YES"), v.literal("NO")),
        checkedForDamage: v.union(v.literal("YES"), v.literal("NO"))
      })
    ),
    consentObtained: v.union(v.literal("YES"), v.literal("NO")),
    carePlanCompleted: v.union(v.literal("YES"), v.literal("NO")),
    signatureOfAssessor: v.string(),
    signatureDate: v.string(),
    savedAsDraft: v.optional(v.boolean())
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const now = Date.now();

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: now
    });

    return null;
  }
});

/**
 * Delete a bed rails risk assessment
 */
export const deleteBedRailsRiskAssessment = mutation({
  args: { id: v.id("bedRailsRiskAssessments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  }
});

/**
 * Generate PDF and update the record (Internal Action)
 */
export const generatePDFAndUpdateRecord = internalAction({
  args: {
    assessmentId: v.id("bedRailsRiskAssessments"),
    formData: v.any()
  },
  handler: async (ctx, args) => {
    // TODO: Implement PDF generation logic
    // This would typically call an external API to generate the PDF
    // For now, we'll just update the record to indicate PDF generation is complete

    await ctx.runMutation(
      internal.careFiles.bedRailsRiskAssessment.updatePdfFileId,
      {
        assessmentId: args.assessmentId,
        pdfFileId: "pending" // Replace with actual PDF generation
      }
    );
  }
});

/**
 * Update PDF file ID (Internal Mutation)
 */
export const updatePdfFileId = internalMutation({
  args: {
    assessmentId: v.id("bedRailsRiskAssessments"),
    pdfFileId: v.string()
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assessmentId, {
      pdfFileId: args.pdfFileId,
      pdfGenerated: true,
      pdfGeneratedAt: Date.now()
    });
  }
});

/**
 * Get PDF URL for an assessment
 */
export const getPdfUrl = query({
  args: {
    assessmentId: v.id("bedRailsRiskAssessments")
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId);

    if (!assessment || !assessment.pdfFileId) {
      return null;
    }

    // If PDF file ID exists, get the URL from storage
    if (assessment.pdfFileId !== "pending") {
      try {
        const url = await ctx.storage.getUrl(assessment.pdfFileId as Id<"_storage">);
        return url;
      } catch (error) {
        console.error("Error getting PDF URL:", error);
        return null;
      }
    }

    return null;
  }
});
