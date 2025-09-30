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

export const submitDependencyAssessment = mutation({
  args: {
    // Metadata
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),

    // Assessment data
    dependencyLevel: v.union(
      v.literal("A"),
      v.literal("B"),
      v.literal("C"),
      v.literal("D")
    ),

    // Completed by
    completedBy: v.string(),
    completedBySignature: v.string(),
    date: v.number(),

    // Metadata
    savedAsDraft: v.optional(v.boolean())
  },
  returns: v.id("dependencyAssessments"),
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

    // Insert the dependency assessment
    const assessmentId = await ctx.db.insert("dependencyAssessments", {
      residentId: args.residentId,
      teamId: args.teamId,
      organizationId: args.organizationId,
      userId: args.userId,

      // Assessment data
      dependencyLevel: args.dependencyLevel,

      // Completed by
      completedBy: args.completedBy,
      completedBySignature: args.completedBySignature,
      date: args.date,

      // Metadata
      status: args.savedAsDraft ? ("draft" as const) : ("submitted" as const),
      submittedAt: args.savedAsDraft ? undefined : now,
      createdBy: args.userId
    });

    // Schedule PDF generation after successful save if not a draft
    if (!args.savedAsDraft) {
      await ctx.scheduler.runAfter(
        1000, // 1 second delay
        internal.careFiles.dependency.generatePDFAndUpdateRecord,
        { assessmentId }
      );
    }

    return assessmentId;
  }
});

export const getDependencyAssessmentsByResident = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.array(
    v.object({
      _id: v.id("dependencyAssessments"),
      _creationTime: v.number(),
      residentId: v.id("residents"),
      teamId: v.string(),
      organizationId: v.string(),
      userId: v.string(),
      dependencyLevel: v.union(
        v.literal("A"),
        v.literal("B"),
        v.literal("C"),
        v.literal("D")
      ),
      completedBy: v.string(),
      completedBySignature: v.string(),
      date: v.number(),
      status: v.optional(
        v.union(
          v.literal("draft"),
          v.literal("submitted"),
          v.literal("reviewed")
        )
      ),
      submittedAt: v.optional(v.number()),
      createdBy: v.string(),
      lastModifiedAt: v.optional(v.number()),
      lastModifiedBy: v.optional(v.string()),
      pdfUrl: v.optional(v.string()),
      pdfFileId: v.optional(v.id("_storage")),
      pdfGeneratedAt: v.optional(v.number())
    })
  ),
  handler: async (ctx, args) => {
    const assessments = await ctx.db
      .query("dependencyAssessments")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    return assessments;
  }
});

export const getDependencyAssessmentById = query({
  args: {
    assessmentId: v.id("dependencyAssessments")
  },
  returns: v.union(
    v.object({
      _id: v.id("dependencyAssessments"),
      _creationTime: v.number(),
      residentId: v.id("residents"),
      teamId: v.string(),
      organizationId: v.string(),
      userId: v.string(),
      dependencyLevel: v.union(
        v.literal("A"),
        v.literal("B"),
        v.literal("C"),
        v.literal("D")
      ),
      completedBy: v.string(),
      completedBySignature: v.string(),
      date: v.number(),
      status: v.optional(
        v.union(
          v.literal("draft"),
          v.literal("submitted"),
          v.literal("reviewed")
        )
      ),
      submittedAt: v.optional(v.number()),
      createdBy: v.string(),
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
    return assessment;
  }
});

export const updateDependencyAssessment = mutation({
  args: {
    assessmentId: v.id("dependencyAssessments"),

    // Assessment data
    dependencyLevel: v.union(
      v.literal("A"),
      v.literal("B"),
      v.literal("C"),
      v.literal("D")
    ),

    // Completed by
    completedBy: v.string(),
    completedBySignature: v.string(),
    date: v.number(),

    // Metadata
    savedAsDraft: v.optional(v.boolean())
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get existing assessment
    const existingAssessment = await ctx.db.get(args.assessmentId);
    if (!existingAssessment) {
      throw new Error("Assessment not found");
    }

    // Update the assessment
    await ctx.db.patch(args.assessmentId, {
      dependencyLevel: args.dependencyLevel,
      completedBy: args.completedBy,
      completedBySignature: args.completedBySignature,
      date: args.date,
      status: args.savedAsDraft ? ("draft" as const) : ("submitted" as const),
      submittedAt: args.savedAsDraft
        ? undefined
        : existingAssessment.submittedAt || now,
      lastModifiedAt: now,
      lastModifiedBy: existingAssessment.userId
    });

    // Schedule PDF generation if not saving as draft
    if (!args.savedAsDraft) {
      await ctx.scheduler.runAfter(
        1000, // 1 second delay
        internal.careFiles.dependency.generatePDFAndUpdateRecord,
        { assessmentId: args.assessmentId }
      );
    }

    return null;
  }
});

export const saveDraftDependencyAssessment = mutation({
  args: {
    // Metadata
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),

    // Assessment data
    dependencyLevel: v.optional(
      v.union(v.literal("A"), v.literal("B"), v.literal("C"), v.literal("D"))
    ),

    // Completed by
    completedBy: v.optional(v.string()),
    completedBySignature: v.optional(v.string()),
    date: v.optional(v.number()),

    // For updates
    assessmentId: v.optional(v.id("dependencyAssessments"))
  },
  returns: v.id("dependencyAssessments"),
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

    if (args.assessmentId) {
      // Update existing draft
      const existingAssessment = await ctx.db.get(args.assessmentId);
      if (!existingAssessment) {
        throw new Error("Assessment not found");
      }

      await ctx.db.patch(args.assessmentId, {
        ...(args.dependencyLevel && { dependencyLevel: args.dependencyLevel }),
        ...(args.completedBy && { completedBy: args.completedBy }),
        ...(args.completedBySignature && {
          completedBySignature: args.completedBySignature
        }),
        ...(args.date && { date: args.date }),
        lastModifiedAt: now,
        lastModifiedBy: args.userId
      });

      return args.assessmentId;
    } else {
      // Create new draft
      const assessmentId = await ctx.db.insert("dependencyAssessments", {
        residentId: args.residentId,
        teamId: args.teamId,
        organizationId: args.organizationId,
        userId: args.userId,

        // Assessment data (with defaults for draft)
        dependencyLevel: args.dependencyLevel || "A",
        completedBy: args.completedBy || "",
        completedBySignature: args.completedBySignature || "",
        date: args.date || now,

        // Metadata
        status: "draft" as const,
        createdBy: args.userId
      });

      return assessmentId;
    }
  }
});

export const deleteDependencyAssessment = mutation({
  args: {
    assessmentId: v.id("dependencyAssessments")
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

// Internal action for PDF generation
export const generatePDFAndUpdateRecord = internalAction({
  args: {
    assessmentId: v.id("dependencyAssessments")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Fetch the assessment data
      const assessment = await ctx.runQuery(
        internal.careFiles.dependency.getAssessmentForPDF,
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
      console.log("Calling PDF API at:", `${pdfApiUrl}/api/pdf/dependency`);
      const pdfResponse = await fetch(`${pdfApiUrl}/api/pdf/dependency`, {
        method: "POST",
        headers,
        body: JSON.stringify(assessment)
      });

      console.log("PDF API request details:", {
        url: `${pdfApiUrl}/api/pdf/dependency`,
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
      await ctx.runMutation(internal.careFiles.dependency.updatePDFFileId, {
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
    assessmentId: v.id("dependencyAssessments")
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId);

    if (!assessment) {
      return null;
    }

    // Get resident information for the PDF
    const resident = await ctx.db.get(assessment.residentId);

    return {
      ...assessment,
      residentName: resident
        ? `${resident.firstName} ${resident.lastName}`
        : "Unknown Resident",
      bedroomNumber: resident?.roomNumber || "Unknown Room",
      dateOfBirth: resident?.dateOfBirth
    };
  }
});

/**
 * Update assessment with PDF file ID
 */
export const updatePDFFileId = internalMutation({
  args: {
    assessmentId: v.id("dependencyAssessments"),
    pdfFileId: v.id("_storage")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assessmentId, {
      pdfFileId: args.pdfFileId,
      pdfGeneratedAt: Date.now()
    });
    return null;
  }
});

export const updateAssessmentWithPDF = internalMutation({
  args: {
    assessmentId: v.id("dependencyAssessments"),
    pdfUrl: v.string(),
    pdfFileId: v.id("_storage")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assessmentId, {
      pdfUrl: args.pdfUrl,
      pdfFileId: args.pdfFileId,
      pdfGeneratedAt: Date.now()
    });

    return null;
  }
});

export const updatePDFGenerated = internalMutation({
  args: {
    assessmentId: v.id("dependencyAssessments"),
    pdfUrl: v.string(),
    pdfGeneratedAt: v.number(),
    pdfFileId: v.optional(v.id("_storage"))
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assessmentId, {
      pdfUrl: args.pdfUrl,
      pdfGeneratedAt: args.pdfGeneratedAt,
      ...(args.pdfFileId && { pdfFileId: args.pdfFileId })
    });
    return null;
  }
});

/**
 * Get PDF URL for a dependency assessment
 */
export const getPDFUrl = query({
  args: {
    assessmentId: v.id("dependencyAssessments")
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId);

    if (!assessment || !assessment.pdfFileId) {
      return null;
    }

    const url = await ctx.storage.getUrl(assessment.pdfFileId);
    return url;
  }
});
