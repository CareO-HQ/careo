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

export const submitSkinIntegrityAssessment = mutation({
  args: {
    // Metadata
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),

    // Resident information & date
    residentName: v.string(),
    bedroomNumber: v.string(),
    date: v.number(),

    // Assessment questions (scores 1-4 for most, 1-3 for friction/shear)
    sensoryPerception: v.union(
      v.literal(1),
      v.literal(2),
      v.literal(3),
      v.literal(4)
    ),
    moisture: v.union(v.literal(1), v.literal(2), v.literal(3), v.literal(4)),
    activity: v.union(v.literal(1), v.literal(2), v.literal(3), v.literal(4)),
    mobility: v.union(v.literal(1), v.literal(2), v.literal(3), v.literal(4)),
    nutrition: v.union(v.literal(1), v.literal(2), v.literal(3), v.literal(4)),
    frictionShear: v.union(v.literal(1), v.literal(2), v.literal(3)),

    // Metadata
    savedAsDraft: v.optional(v.boolean())
  },
  returns: v.id("skinIntegrityAssessments"),
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

    // Insert the skin integrity assessment
    const assessmentId = await ctx.db.insert("skinIntegrityAssessments", {
      residentId: args.residentId,
      teamId: args.teamId,
      organizationId: args.organizationId,
      userId: args.userId,

      // Resident information & date
      residentName: args.residentName,
      bedroomNumber: args.bedroomNumber,
      date: args.date,

      // Assessment scores
      sensoryPerception: args.sensoryPerception,
      moisture: args.moisture,
      activity: args.activity,
      mobility: args.mobility,
      nutrition: args.nutrition,
      frictionShear: args.frictionShear
    });

    // If not saved as draft, schedule PDF generation
    if (!args.savedAsDraft) {
      await ctx.scheduler.runAfter(
        0,
        internal.careFiles.skinIntegrity.generatePDFAndUpdateRecord,
        {
          assessmentId
        }
      );
    }

    return assessmentId;
  }
});

export const updateSkinIntegrityAssessment = mutation({
  args: {
    assessmentId: v.id("skinIntegrityAssessments"),

    // All the same fields as submitSkinIntegrityAssessment
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),

    // Resident information & date
    residentName: v.string(),
    bedroomNumber: v.string(),
    date: v.number(),

    // Assessment questions (scores 1-4 for most, 1-3 for friction/shear)
    sensoryPerception: v.union(
      v.literal(1),
      v.literal(2),
      v.literal(3),
      v.literal(4)
    ),
    moisture: v.union(v.literal(1), v.literal(2), v.literal(3), v.literal(4)),
    activity: v.union(v.literal(1), v.literal(2), v.literal(3), v.literal(4)),
    mobility: v.union(v.literal(1), v.literal(2), v.literal(3), v.literal(4)),
    nutrition: v.union(v.literal(1), v.literal(2), v.literal(3), v.literal(4)),
    frictionShear: v.union(v.literal(1), v.literal(2), v.literal(3)),

    // Metadata
    savedAsDraft: v.optional(v.boolean())
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify assessment exists
    const assessment = await ctx.db.get(args.assessmentId);
    if (!assessment) {
      throw new Error("Assessment not found");
    }

    // Verify resident exists
    const resident = await ctx.db.get(args.residentId);
    if (!resident) {
      throw new Error("Resident not found");
    }

    // Verify user has access to this resident's organization
    if (resident.organizationId !== args.organizationId) {
      throw new Error("Unauthorized access to resident");
    }

    // Update the assessment
    await ctx.db.patch(args.assessmentId, {
      residentId: args.residentId,
      teamId: args.teamId,
      organizationId: args.organizationId,
      userId: args.userId,

      // Resident information & date
      residentName: args.residentName,
      bedroomNumber: args.bedroomNumber,
      date: args.date,

      // Assessment scores
      sensoryPerception: args.sensoryPerception,
      moisture: args.moisture,
      activity: args.activity,
      mobility: args.mobility,
      nutrition: args.nutrition,
      frictionShear: args.frictionShear
    });

    // If not saved as draft, schedule PDF generation
    if (!args.savedAsDraft) {
      await ctx.scheduler.runAfter(
        0,
        internal.careFiles.skinIntegrity.generatePDFAndUpdateRecord,
        {
          assessmentId: args.assessmentId
        }
      );
    }

    return null;
  }
});

export const getSkinIntegrityAssessment = query({
  args: {
    assessmentId: v.id("skinIntegrityAssessments")
  },
  returns: v.union(
    v.object({
      _id: v.id("skinIntegrityAssessments"),
      _creationTime: v.number(),
      residentId: v.id("residents"),
      teamId: v.string(),
      organizationId: v.string(),
      userId: v.string(),
      residentName: v.string(),
      bedroomNumber: v.string(),
      date: v.number(),
      sensoryPerception: v.union(
        v.literal(1),
        v.literal(2),
        v.literal(3),
        v.literal(4)
      ),
      moisture: v.union(v.literal(1), v.literal(2), v.literal(3), v.literal(4)),
      activity: v.union(v.literal(1), v.literal(2), v.literal(3), v.literal(4)),
      mobility: v.union(v.literal(1), v.literal(2), v.literal(3), v.literal(4)),
      nutrition: v.union(
        v.literal(1),
        v.literal(2),
        v.literal(3),
        v.literal(4)
      ),
      frictionShear: v.union(v.literal(1), v.literal(2), v.literal(3)),
      status: v.optional(
        v.union(
          v.literal("draft"),
          v.literal("submitted"),
          v.literal("reviewed")
        )
      ),
      submittedAt: v.optional(v.number()),
      createdBy: v.optional(v.string()),
      lastModifiedAt: v.optional(v.number()),
      lastModifiedBy: v.optional(v.string()),
      pdfUrl: v.optional(v.string()),
      pdfFileId: v.optional(v.id("_storage")),
      pdfGeneratedAt: v.optional(v.number())
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId);
    return assessment || null;
  }
});

export const getSkinIntegrityAssessmentsByResident = query({
  args: {
    residentId: v.id("residents"),
    organizationId: v.string()
  },
  returns: v.array(
    v.object({
      _id: v.id("skinIntegrityAssessments"),
      _creationTime: v.number(),
      residentId: v.id("residents"),
      teamId: v.string(),
      organizationId: v.string(),
      userId: v.string(),
      residentName: v.string(),
      bedroomNumber: v.string(),
      date: v.number(),
      sensoryPerception: v.union(
        v.literal(1),
        v.literal(2),
        v.literal(3),
        v.literal(4)
      ),
      moisture: v.union(v.literal(1), v.literal(2), v.literal(3), v.literal(4)),
      activity: v.union(v.literal(1), v.literal(2), v.literal(3), v.literal(4)),
      mobility: v.union(v.literal(1), v.literal(2), v.literal(3), v.literal(4)),
      nutrition: v.union(
        v.literal(1),
        v.literal(2),
        v.literal(3),
        v.literal(4)
      ),
      frictionShear: v.union(v.literal(1), v.literal(2), v.literal(3)),
      status: v.optional(
        v.union(
          v.literal("draft"),
          v.literal("submitted"),
          v.literal("reviewed")
        )
      ),
      submittedAt: v.optional(v.number()),
      createdBy: v.optional(v.string()),
      lastModifiedAt: v.optional(v.number()),
      lastModifiedBy: v.optional(v.string()),
      pdfUrl: v.optional(v.string()),
      pdfFileId: v.optional(v.id("_storage")),
      pdfGeneratedAt: v.optional(v.number())
    })
  ),
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
      .query("skinIntegrityAssessments")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    return assessments;
  }
});

export const deleteSkinIntegrityAssessment = mutation({
  args: {
    assessmentId: v.id("skinIntegrityAssessments"),
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
    assessmentId: v.id("skinIntegrityAssessments")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Fetch the assessment data
      const assessment = await ctx.runQuery(
        internal.careFiles.skinIntegrity.getAssessmentForPDF,
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
      console.log("Calling PDF API at:", `${pdfApiUrl}/api/pdf/skin-integrity`);
      const pdfResponse = await fetch(`${pdfApiUrl}/api/pdf/skin-integrity`, {
        method: "POST",
        headers,
        body: JSON.stringify(assessment)
      });

      console.log("PDF API request details:", {
        url: `${pdfApiUrl}/api/pdf/skin-integrity`,
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
      await ctx.runMutation(internal.careFiles.skinIntegrity.updatePDFFileId, {
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
    assessmentId: v.id("skinIntegrityAssessments")
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
    assessmentId: v.id("skinIntegrityAssessments"),
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

export const updateAssessmentStatus = internalMutation({
  args: {
    assessmentId: v.id("skinIntegrityAssessments"),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("reviewed")
    ),
    submittedAt: v.optional(v.number()),
    pdfUrl: v.optional(v.string()),
    pdfFileId: v.optional(v.id("_storage")),
    pdfGeneratedAt: v.optional(v.number())
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assessmentId, {
      status: args.status,
      submittedAt: args.submittedAt,
      pdfUrl: args.pdfUrl,
      pdfFileId: args.pdfFileId,
      pdfGeneratedAt: args.pdfGeneratedAt
    });

    return null;
  }
});

export const getPDFUrl = query({
  args: {
    assessmentId: v.id("skinIntegrityAssessments"),
    organizationId: v.string()
  },
  returns: v.union(v.string(), v.null()),
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

    // Return PDF URL if available
    if (assessment.pdfFileId) {
      return await ctx.storage.getUrl(assessment.pdfFileId);
    }

    return assessment.pdfUrl || null;
  }
});
