import { v } from "convex/values";
import {
  mutation,
  query,
  internalAction,
  internalMutation
} from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

export const submitCarePlanAssessment = mutation({
  args: {
    // Metadata
    residentId: v.id("residents"),
    userId: v.string(),

    // Folder association
    folderKey: v.optional(v.string()),

    // Basic information
    nameOfCarePlan: v.string(),
    residentName: v.string(),
    dob: v.number(),
    bedroomNumber: v.string(),
    writtenBy: v.string(),
    dateWritten: v.number(),
    carePlanNumber: v.string(),

    // Care plan details
    identifiedNeeds: v.string(),
    aims: v.string(),

    // Planned care entries
    plannedCareDate: v.array(
      v.object({
        date: v.number(),
        time: v.optional(v.string()),
        details: v.string(),
        signature: v.string()
      })
    ),

    // Review of Patient or Representative
    discussedWith: v.optional(v.string()),
    signature: v.optional(v.string()),
    date: v.number(),
    staffSignature: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    // Verify resident exists
    const resident = await ctx.db.get(args.residentId);
    if (!resident) {
      throw new Error("Resident not found");
    }

    // Insert the care plan assessment
    const carePlanId = await ctx.db.insert("carePlanAssessments", {
      residentId: args.residentId,
      userId: args.userId,
      folderKey: args.folderKey,
      nameOfCarePlan: args.nameOfCarePlan,
      residentName: args.residentName,
      dob: args.dob,
      bedroomNumber: args.bedroomNumber,
      writtenBy: args.writtenBy,
      dateWritten: args.dateWritten,
      carePlanNumber: args.carePlanNumber,
      identifiedNeeds: args.identifiedNeeds,
      aims: args.aims,
      plannedCareDate: args.plannedCareDate,
      discussedWith: args.discussedWith,
      signature: args.signature,
      date: args.date,
      staffSignature: args.staffSignature,
      status: "submitted" as const,
      submittedAt: Date.now()
    });

    // Schedule PDF generation after successful save if not a draft
    await ctx.scheduler.runAfter(
      1000, // 1 second delay
      internal.careFiles.carePlan.generatePDFAndUpdateRecord,
      { assessmentId: carePlanId }
    );

    return carePlanId;
  }
});

export const getCarePlanAssessmentsByResident = query({
  args: {
    residentId: v.id("residents")
  },
  handler: async (ctx, args) => {
    const assessments = await ctx.db
      .query("carePlanAssessments")
      .withIndex("by_residentId", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    return assessments;
  }
});

export const getCarePlanAssessmentsByResidentAndFolder = query({
  args: {
    residentId: v.id("residents"),
    folderKey: v.string()
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const assessments = await ctx.db
      .query("carePlanAssessments")
      .withIndex("by_resident_and_folder", (q) =>
        q.eq("residentId", args.residentId).eq("folderKey", args.folderKey)
      )
      .collect();

    return assessments;
  }
});

export const getCarePlanAssessment = query({
  args: {
    assessmentId: v.id("carePlanAssessments")
  },
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId);
    return assessment;
  }
});

export const updateCarePlanAssessment = mutation({
  args: {
    assessmentId: v.id("carePlanAssessments"),

    // Folder association
    folderKey: v.optional(v.string()),

    // Basic information
    nameOfCarePlan: v.string(),
    residentName: v.string(),
    dob: v.number(),
    bedroomNumber: v.string(),
    writtenBy: v.string(),
    dateWritten: v.number(),
    carePlanNumber: v.string(),

    // Care plan details
    identifiedNeeds: v.string(),
    aims: v.string(),

    // Planned care entries
    plannedCareDate: v.array(
      v.object({
        date: v.number(),
        time: v.optional(v.string()),
        details: v.string(),
        signature: v.string()
      })
    ),

    // Review of Patient or Representative
    discussedWith: v.optional(v.string()),
    signature: v.optional(v.string()),
    date: v.number(),
    staffSignature: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { assessmentId, ...updateData } = args;

    const assessment = await ctx.db.get(assessmentId);
    if (!assessment) {
      throw new Error("Care plan assessment not found");
    }

    await ctx.db.patch(assessmentId, {
      ...updateData,
      updatedAt: Date.now()
    });

    return assessmentId;
  }
});

/**
 * Generate PDF and update the record with the file ID
 */
export const generatePDFAndUpdateRecord = internalAction({
  args: { assessmentId: v.id("carePlanAssessments") },
  handler: async (ctx, args) => {
    try {
      // Get the PDF API URL from environment variables
      const pdfApiUrl = process.env.PDF_API_URL;
      const pdfApiToken = process.env.PDF_API_TOKEN;

      // Check if PDF generation is properly configured
      if (!pdfApiUrl || !pdfApiUrl.startsWith("https://")) {
        console.warn(
          "PDF generation disabled: PDF_API_URL not set or not HTTPS. Set PDF_API_URL=https://your-domain.com"
        );
        return;
      }

      if (!pdfApiToken) {
        console.warn(
          "PDF generation disabled: PDF_API_TOKEN not set in environment variables"
        );
        return;
      }

      // Call the PDF generation API
      console.log("Calling PDF API at:", `${pdfApiUrl}/api/pdf/care-plan`);
      const pdfResponse = await fetch(`${pdfApiUrl}/api/pdf/care-plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pdfApiToken}`
        },
        body: JSON.stringify({ assessmentId: args.assessmentId })
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
      console.log("Received PDF buffer of size:", pdfBuffer.byteLength);

      // Store the PDF in Convex file storage
      const storageId = await ctx.storage.store(new Blob([pdfBuffer]));

      // Update the assessment record with the PDF file ID
      await ctx.runMutation(internal.careFiles.carePlan.updatePDFFileId, {
        assessmentId: args.assessmentId,
        storageId
      });

      console.log(
        `Successfully generated and stored PDF for care plan assessment ${args.assessmentId}`
      );
    } catch (error) {
      console.error("Error generating and saving PDF:", error);
    }
  }
});

/**
 * Update a care plan assessment with PDF file ID
 */
export const updatePDFFileId = internalMutation({
  args: {
    assessmentId: v.id("carePlanAssessments"),
    storageId: v.id("_storage")
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assessmentId, {
      pdfFileId: args.storageId
    });
  }
});

/**
 * Get PDF URL for a care plan assessment
 */
export const getPDFUrl = query({
  args: {
    assessmentId: v.id("carePlanAssessments")
  },
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId);
    if (!assessment) {
      return null;
    }

    // If we have a stored PDF file, return the file URL
    if (assessment.pdfFileId) {
      return await ctx.storage.getUrl(assessment.pdfFileId);
    }

    // Fallback to direct PDF generation via API route
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return `${baseUrl}/api/pdf/care-plan?assessmentId=${args.assessmentId}`;
  }
});
