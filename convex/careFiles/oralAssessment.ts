import { v } from "convex/values";
import {
  mutation,
  query,
  internalAction,
  internalMutation,
  internalQuery
} from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

export const submitOralAssessment = mutation({
  args: {
    // Metadata
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),

    // Section 1: Basic Resident Information
    residentName: v.string(),
    dateOfBirth: v.string(),
    weight: v.string(),
    height: v.string(),
    completedBy: v.string(),
    signature: v.string(),
    assessmentDate: v.number(),

    // Section 2: Dental History and Registration
    normalOralHygieneRoutine: v.string(),
    isRegisteredWithDentist: v.boolean(),
    lastSeenByDentist: v.optional(v.string()),
    dentistName: v.optional(v.string()),
    dentalPracticeAddress: v.optional(v.string()),
    contactTelephone: v.optional(v.string()),

    // Section 3: Physical Oral Examination
    lipsDryCracked: v.boolean(),
    lipsDryCrackedCare: v.optional(v.string()),
    tongueDryCracked: v.boolean(),
    tongueDryCrackedCare: v.optional(v.string()),
    tongueUlceration: v.boolean(),
    tongueUlcerationCare: v.optional(v.string()),
    hasTopDenture: v.boolean(),
    topDentureCare: v.optional(v.string()),
    hasLowerDenture: v.boolean(),
    lowerDentureCare: v.optional(v.string()),
    hasDenturesAndNaturalTeeth: v.boolean(),
    denturesAndNaturalTeethCare: v.optional(v.string()),
    hasNaturalTeeth: v.boolean(),
    naturalTeethCare: v.optional(v.string()),
    evidencePlaqueDebris: v.boolean(),
    plaqueDebrisCare: v.optional(v.string()),
    dryMouth: v.boolean(),
    dryMouthCare: v.optional(v.string()),

    // Section 4: Symptoms and Functional Assessment
    painWhenEating: v.boolean(),
    painWhenEatingCare: v.optional(v.string()),
    gumsUlceration: v.boolean(),
    gumsUlcerationCare: v.optional(v.string()),
    difficultySwallowing: v.boolean(),
    difficultySwallowingCare: v.optional(v.string()),
    poorFluidDietaryIntake: v.boolean(),
    poorFluidDietaryIntakeCare: v.optional(v.string()),
    dehydrated: v.boolean(),
    dehydratedCare: v.optional(v.string()),
    speechDifficultyDryMouth: v.boolean(),
    speechDifficultyDryMouthCare: v.optional(v.string()),
    speechDifficultyDenturesSlipping: v.boolean(),
    speechDifficultyDenturesSlippingCare: v.optional(v.string()),
    dexterityProblems: v.boolean(),
    dexterityProblemsCare: v.optional(v.string()),
    cognitiveImpairment: v.boolean(),
    cognitiveImpairmentCare: v.optional(v.string()),

    // Metadata
    savedAsDraft: v.optional(v.boolean())
  },
  returns: v.id("oralAssessments"),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Verify resident exists
    const resident = await ctx.db.get(args.residentId);
    if (!resident) {
      throw new Error("Resident not found");
    }

    // Verify user has access to this resident's organization
    if (resident.organizationId !== args.organizationId) {
      throw new Error("Unauthorized access to resident");
    }

    // Insert the oral assessment
    const assessmentId = await ctx.db.insert("oralAssessments", {
      residentId: args.residentId,
      teamId: args.teamId,
      organizationId: args.organizationId,
      userId: args.userId,

      // Basic information
      residentName: args.residentName,
      dateOfBirth: args.dateOfBirth,
      weight: args.weight,
      height: args.height,
      completedBy: args.completedBy,
      signature: args.signature,
      assessmentDate: args.assessmentDate,

      // Dental history
      normalOralHygieneRoutine: args.normalOralHygieneRoutine,
      isRegisteredWithDentist: args.isRegisteredWithDentist,
      lastSeenByDentist: args.lastSeenByDentist,
      dentistName: args.dentistName,
      dentalPracticeAddress: args.dentalPracticeAddress,
      contactTelephone: args.contactTelephone,

      // Physical oral examination
      lipsDryCracked: args.lipsDryCracked,
      lipsDryCrackedCare: args.lipsDryCrackedCare,
      tongueDryCracked: args.tongueDryCracked,
      tongueDryCrackedCare: args.tongueDryCrackedCare,
      tongueUlceration: args.tongueUlceration,
      tongueUlcerationCare: args.tongueUlcerationCare,
      hasTopDenture: args.hasTopDenture,
      topDentureCare: args.topDentureCare,
      hasLowerDenture: args.hasLowerDenture,
      lowerDentureCare: args.lowerDentureCare,
      hasDenturesAndNaturalTeeth: args.hasDenturesAndNaturalTeeth,
      denturesAndNaturalTeethCare: args.denturesAndNaturalTeethCare,
      hasNaturalTeeth: args.hasNaturalTeeth,
      naturalTeethCare: args.naturalTeethCare,
      evidencePlaqueDebris: args.evidencePlaqueDebris,
      plaqueDebrisCare: args.plaqueDebrisCare,
      dryMouth: args.dryMouth,
      dryMouthCare: args.dryMouthCare,

      // Symptoms and functional assessment
      painWhenEating: args.painWhenEating,
      painWhenEatingCare: args.painWhenEatingCare,
      gumsUlceration: args.gumsUlceration,
      gumsUlcerationCare: args.gumsUlcerationCare,
      difficultySwallowing: args.difficultySwallowing,
      difficultySwallowingCare: args.difficultySwallowingCare,
      poorFluidDietaryIntake: args.poorFluidDietaryIntake,
      poorFluidDietaryIntakeCare: args.poorFluidDietaryIntakeCare,
      dehydrated: args.dehydrated,
      dehydratedCare: args.dehydratedCare,
      speechDifficultyDryMouth: args.speechDifficultyDryMouth,
      speechDifficultyDryMouthCare: args.speechDifficultyDryMouthCare,
      speechDifficultyDenturesSlipping: args.speechDifficultyDenturesSlipping,
      speechDifficultyDenturesSlippingCare: args.speechDifficultyDenturesSlippingCare,
      dexterityProblems: args.dexterityProblems,
      dexterityProblemsCare: args.dexterityProblemsCare,
      cognitiveImpairment: args.cognitiveImpairment,
      cognitiveImpairmentCare: args.cognitiveImpairmentCare,

      // Metadata
      status: args.savedAsDraft ? ("draft" as const) : ("submitted" as const),
      submittedAt: args.savedAsDraft ? undefined : now,
      createdBy: args.userId
    });

    // If not saved as draft, schedule PDF generation
    if (!args.savedAsDraft) {
      await ctx.scheduler.runAfter(
        0,
        internal.careFiles.oralAssessment.generatePDFAndUpdateRecord,
        {
          assessmentId
        }
      );
    }

    return assessmentId;
  }
});

export const getOralAssessment = query({
  args: {
    assessmentId: v.id("oralAssessments")
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId);
    return assessment || null;
  }
});

export const getOralAssessmentsByResident = query({
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
      .query("oralAssessments")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    return assessments;
  }
});

export const deleteOralAssessment = mutation({
  args: {
    assessmentId: v.id("oralAssessments"),
    organizationId: v.string()
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify assessment exists
    const assessment = await ctx.db.get(args.assessmentId);
    if (!assessment) {
      throw new Error("Assessment not found");
    }

    // Verify user has access to this assessment's organization
    if (assessment.organizationId !== args.organizationId) {
      throw new Error("Unauthorized access to assessment");
    }

    // Delete the assessment
    await ctx.db.delete(args.assessmentId);

    return null;
  }
});

// Internal action for PDF generation
export const generatePDFAndUpdateRecord = internalAction({
  args: {
    assessmentId: v.id("oralAssessments")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Fetch the assessment data
      const assessment = await ctx.runQuery(
        internal.careFiles.oralAssessment.getAssessmentForPDF,
        { assessmentId: args.assessmentId }
      );

      if (!assessment) {
        throw new Error("Assessment not found");
      }

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
      console.log("Calling PDF API at:", `${pdfApiUrl}/api/pdf/oral-assessment`);
      const pdfResponse = await fetch(`${pdfApiUrl}/api/pdf/oral-assessment`, {
        method: "POST",
        headers,
        body: JSON.stringify(assessment)
      });

      console.log("PDF API request details:", {
        url: `${pdfApiUrl}/api/pdf/oral-assessment`,
        hasToken: !!pdfApiToken,
        assessmentId: args.assessmentId
      });

      console.log(
        "PDF API response status:",
        pdfResponse.status,
        pdfResponse.statusText
      );

      if (!pdfResponse.ok) {
        const errorText = await pdfResponse.text();
        console.log("PDF API error response:", errorText);
        throw new Error(
          `PDF generation failed: ${pdfResponse.status} ${pdfResponse.statusText} - ${errorText}`
        );
      }

      // Get the PDF as a buffer
      const pdfBuffer = await pdfResponse.arrayBuffer();

      // Convert to Blob for Convex storage
      const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });

      // Store the PDF in Convex file storage
      const storageId = await ctx.storage.store(pdfBlob);

      // Update the assessment record with the PDF file ID
      await ctx.runMutation(internal.careFiles.oralAssessment.updatePDFFileId, {
        assessmentId: args.assessmentId,
        pdfFileId: storageId
      });
    } catch (error) {
      console.error("Error generating and saving PDF:", error);
      // Don't throw here to avoid crashing the entire form submission
    }

    return null;
  }
});

export const getAssessmentForPDF = internalQuery({
  args: {
    assessmentId: v.id("oralAssessments")
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId);

    if (!assessment) {
      return null;
    }

    return assessment;
  }
});

export const updatePDFFileId = internalMutation({
  args: {
    assessmentId: v.id("oralAssessments"),
    pdfFileId: v.id("_storage")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assessmentId, {
      pdfFileId: args.pdfFileId,
      status: "submitted",
      submittedAt: Date.now(),
      pdfGeneratedAt: Date.now()
    });

    return null;
  }
});

export const getPDFUrl = query({
  args: {
    assessmentId: v.id("oralAssessments"),
    organizationId: v.string()
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    // Verify assessment exists
    const assessment = await ctx.db.get(args.assessmentId);
    if (!assessment) {
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

    return assessment.pdfUrl || null;
  }
});

/**
 * Get archived (non-latest) oral assessments for a resident
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
      .query("oralAssessments")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    // Return all except the first one (the latest)
    return allAssessments.length > 1 ? allAssessments.slice(1) : [];
  }
});
