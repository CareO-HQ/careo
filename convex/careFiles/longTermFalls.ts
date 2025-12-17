import { v } from "convex/values";
import {
  mutation,
  query,
  internalAction,
  internalMutation
} from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

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
    completionDate: v.string(),

    // Metadata
    savedAsDraft: v.optional(v.boolean())
  },
  returns: v.id("longTermFallsRiskAssessments"),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get the current user ID from auth
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("User not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Insert the assessment into the database
    const assessmentId = await ctx.db.insert("longTermFallsRiskAssessments", {
      ...args,
      createdAt: now,
      updatedAt: now,
      createdBy: user._id
    });

    // Schedule PDF generation after successful save if not a draft
    if (!args.savedAsDraft) {
      await ctx.scheduler.runAfter(
        0,
        internal.careFiles.longTermFalls.generatePDFAndUpdateRecord,
        {
          assessmentId: assessmentId
        }
      );
    }

    return assessmentId;
  }
});

/**
 * Get a long term falls assessment by ID
 */
export const getLongTermFallsAssessment = query({
  args: {
    id: v.id("longTermFallsRiskAssessments")
  },
  returns: v.union(
    v.object({
      _id: v.id("longTermFallsRiskAssessments"),
      _creationTime: v.number(),
      residentId: v.id("residents"),
      teamId: v.string(),
      organizationId: v.string(),
      userId: v.string(),
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
      createdAt: v.number(),
      createdBy: v.id("users"),
      updatedAt: v.optional(v.number()),
      updatedBy: v.optional(v.id("users")),
      savedAsDraft: v.optional(v.boolean()),
      pdfFileId: v.optional(v.id("_storage"))
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const result = await ctx.db.get(args.id);
    return result as any;
  }
});

/**
 * Internal action to generate PDF and update the assessment record
 */
export const generatePDFAndUpdateRecord = internalAction({
  args: {
    assessmentId: v.id("longTermFallsRiskAssessments")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Get the PDF API URL from environment variables
      const pdfApiUrl = process.env.PDF_API_URL;
      const pdfApiToken = process.env.PDF_API_TOKEN;

      // Check if PDF generation is properly configured
      if (!pdfApiUrl?.startsWith("https://")) {
        console.warn(
          "PDF generation disabled: PDF_API_URL not set or not HTTPS. Set PDF_API_URL=https://your-domain.com"
        );
        return null;
      }

      // Prepare headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };

      // Add authentication header if token is available
      if (pdfApiToken) {
        headers["Authorization"] = `Bearer ${pdfApiToken}`;
      }

      // Call the PDF generation API
      const response = await fetch(`${pdfApiUrl}/api/pdf/long-term-falls`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          assessmentId: args.assessmentId
        })
      });

      if (!response.ok) {
        throw new Error(`PDF API responded with status: ${response.status}`);
      }

      // Get the PDF as array buffer
      const pdfArrayBuffer = await response.arrayBuffer();

      // Store the PDF in Convex file storage
      const pdfBlob = new Blob([pdfArrayBuffer], { type: "application/pdf" });
      const pdfFileId = await ctx.storage.store(pdfBlob);

      // Update the assessment record with the PDF file ID
      await ctx.runMutation(
        internal.careFiles.longTermFalls.updateAssessmentPDF,
        {
          assessmentId: args.assessmentId,
          pdfFileId: pdfFileId
        }
      );

      console.log(
        `Successfully generated and stored PDF for long term falls assessment ${args.assessmentId}`
      );
    } catch (error) {
      console.error(
        `Failed to generate PDF for long term falls assessment ${args.assessmentId}:`,
        error
      );
      // Don't throw error to prevent retries - just log the failure
    }

    return null;
  }
});

/**
 * Internal mutation to update assessment with PDF file ID
 */
export const updateAssessmentPDF = internalMutation({
  args: {
    assessmentId: v.id("longTermFallsRiskAssessments"),
    pdfFileId: v.id("_storage")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assessmentId, {
      pdfFileId: args.pdfFileId,
      updatedAt: Date.now()
    });
    return null;
  }
});

/**
 * Get the latest long term falls assessment for a resident
 */
export const getLatestAssessmentByResident = query({
  args: {
    residentId: v.id("residents"),
    organizationId: v.string()
  },
  returns: v.union(
    v.object({
      _id: v.id("longTermFallsRiskAssessments"),
      _creationTime: v.number(),
      pdfFileId: v.optional(v.id("_storage")),
      savedAsDraft: v.optional(v.boolean()),
      completedBy: v.string(),
      completionDate: v.string(),
      createdAt: v.number()
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const assessment = await ctx.db
      .query("longTermFallsRiskAssessments")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .filter((q) => q.neq(q.field("savedAsDraft"), true))
      .order("desc")
      .first();

    if (!assessment) return null;

    return {
      _id: assessment._id,
      _creationTime: assessment._creationTime,
      pdfFileId: assessment.pdfFileId,
      savedAsDraft: assessment.savedAsDraft,
      completedBy: assessment.completedBy,
      completionDate: assessment.completionDate,
      createdAt: assessment.createdAt
    };
  }
});

/**
 * Delete a long term falls assessment
 */
export const deleteLongTermFallsAssessment = mutation({
  args: {
    assessmentId: v.id("longTermFallsRiskAssessments")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId);
    if (!assessment) {
      throw new Error("Assessment not found");
    }

    await ctx.db.delete(args.assessmentId);
    return null;
  }
});

/**
 * Get PDF URL for a long term falls assessment
 */
export const getPDFUrl = query({
  args: {
    assessmentId: v.id("longTermFallsRiskAssessments")
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
