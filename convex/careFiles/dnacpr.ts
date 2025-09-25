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

export const submitDnacpr = mutation({
  args: {
    // Metadata
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),

    // Resident information
    residentName: v.string(),
    bedroomNumber: v.string(),
    dateOfBirth: v.number(),

    // Questions
    dnacpr: v.boolean(),
    dnacprComments: v.optional(v.string()),
    reason: v.union(
      v.literal("TERMINAL-PROGRESSIVE"),
      v.literal("UNSUCCESSFUL-CPR"),
      v.literal("OTHER")
    ),
    date: v.number(),

    // Discussed with
    discussedResident: v.boolean(),
    discussedResidentComments: v.optional(v.string()),
    discussedResidentDate: v.optional(v.number()),
    discussedRelatives: v.boolean(),
    discussedRelativesComments: v.optional(v.string()),
    discussedRelativeDate: v.optional(v.number()),
    discussedNOKs: v.boolean(),
    discussedNOKsComments: v.optional(v.string()),
    discussedNOKsDate: v.optional(v.number()),
    comments: v.optional(v.string()),

    // GP signature
    gpDate: v.number(),
    gpSignature: v.string(),
    residentNokSignature: v.string(),
    registeredNurseSignature: v.string(),

    // Metadata
    savedAsDraft: v.optional(v.boolean())
  },
  returns: v.id("dnacprs"),
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

    // Insert the DNACPR form
    const dnacprId = await ctx.db.insert("dnacprs", {
      residentId: args.residentId,
      teamId: args.teamId,
      organizationId: args.organizationId,
      userId: args.userId,

      // Resident information
      residentName: args.residentName,
      bedroomNumber: args.bedroomNumber,
      dateOfBirth: args.dateOfBirth,

      // Questions
      dnacpr: args.dnacpr,
      dnacprComments: args.dnacprComments,
      reason: args.reason,
      date: args.date,

      // Discussed with
      discussedResident: args.discussedResident,
      discussedResidentComments: args.discussedResidentComments,
      discussedResidentDate: args.discussedResidentDate,
      discussedRelatives: args.discussedRelatives,
      discussedRelativesComments: args.discussedRelativesComments,
      discussedRelativeDate: args.discussedRelativeDate,
      discussedNOKs: args.discussedNOKs,
      discussedNOKsComments: args.discussedNOKsComments,
      discussedNOKsDate: args.discussedNOKsDate,
      comments: args.comments,

      // GP signature
      gpDate: args.gpDate,
      gpSignature: args.gpSignature,
      residentNokSignature: args.residentNokSignature,
      registeredNurseSignature: args.registeredNurseSignature,

      // Metadata
      status: args.savedAsDraft ? ("draft" as const) : ("submitted" as const),
      submittedAt: args.savedAsDraft ? undefined : now,
      createdBy: args.userId
    });

    // Schedule PDF generation after successful save if not a draft
    if (!args.savedAsDraft) {
      await ctx.scheduler.runAfter(
        1000, // 1 second delay
        internal.careFiles.dnacpr.generatePDFAndUpdateRecord,
        { dnacprId }
      );
    }

    return dnacprId;
  }
});

export const getDnacprsByResident = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.array(
    v.object({
      _id: v.id("dnacprs"),
      _creationTime: v.number(),
      residentId: v.id("residents"),
      teamId: v.string(),
      organizationId: v.string(),
      userId: v.string(),
      residentName: v.string(),
      bedroomNumber: v.string(),
      dateOfBirth: v.number(),
      dnacpr: v.boolean(),
      reason: v.union(
        v.literal("TERMINAL-PROGRESSIVE"),
        v.literal("UNSUCCESSFUL-CPR"),
        v.literal("OTHER")
      ),
      date: v.number(),
      status: v.union(
        v.literal("draft"),
        v.literal("submitted"),
        v.literal("reviewed")
      ),
      submittedAt: v.optional(v.number()),
      createdBy: v.string(),
      pdfUrl: v.optional(v.string())
    })
  ),
  handler: async (ctx, args) => {
    // Verify resident exists
    const resident = await ctx.db.get(args.residentId);
    if (!resident) {
      throw new Error("Resident not found");
    }

    const dnacprs = await ctx.db
      .query("dnacprs")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    // Return simplified data for listing
    return dnacprs.map((dnacpr) => ({
      _id: dnacpr._id,
      _creationTime: dnacpr._creationTime,
      residentId: dnacpr.residentId,
      teamId: dnacpr.teamId,
      organizationId: dnacpr.organizationId,
      userId: dnacpr.userId,
      residentName: dnacpr.residentName,
      bedroomNumber: dnacpr.bedroomNumber,
      dateOfBirth: dnacpr.dateOfBirth,
      dnacpr: dnacpr.dnacpr,
      reason: dnacpr.reason,
      date: dnacpr.date,
      status: dnacpr.status ?? "submitted",
      submittedAt: dnacpr.submittedAt,
      createdBy: dnacpr.createdBy,
      pdfUrl: dnacpr.pdfUrl
    }));
  }
});

export const getDnacprById = query({
  args: {
    dnacprId: v.id("dnacprs")
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("dnacprs"),
      _creationTime: v.number(),
      residentId: v.id("residents"),
      teamId: v.string(),
      organizationId: v.string(),
      userId: v.string(),

      // Resident information
      residentName: v.string(),
      bedroomNumber: v.string(),
      dateOfBirth: v.number(),

      // Questions
      dnacpr: v.boolean(),
      dnacprComments: v.optional(v.string()),
      reason: v.union(
        v.literal("TERMINAL-PROGRESSIVE"),
        v.literal("UNSUCCESSFUL-CPR"),
        v.literal("OTHER")
      ),
      date: v.number(),

      // Discussed with
      discussedResident: v.boolean(),
      discussedResidentComments: v.optional(v.string()),
      discussedResidentDate: v.optional(v.number()),
      discussedRelatives: v.boolean(),
      discussedRelativesComments: v.optional(v.string()),
      discussedRelativeDate: v.optional(v.number()),
      discussedNOKs: v.boolean(),
      discussedNOKsComments: v.optional(v.string()),
      discussedNOKsDate: v.optional(v.number()),
      comments: v.optional(v.string()),

      // GP signature
      gpDate: v.number(),
      gpSignature: v.string(),
      residentNokSignature: v.string(),
      registeredNurseSignature: v.string(),

      // Metadata
      status: v.optional(
        v.union(
          v.literal("draft"),
          v.literal("submitted"),
          v.literal("reviewed")
        )
      ),
      submittedAt: v.optional(v.number()),
      createdBy: v.string(),
      pdfUrl: v.optional(v.string()),
      pdfFileId: v.optional(v.id("_storage"))
    })
  ),
  handler: async (ctx, args) => {
    const dnacpr = await ctx.db.get(args.dnacprId);
    if (!dnacpr) {
      return null;
    }

    // Verify DNACPR has an associated resident
    const resident = await ctx.db.get(dnacpr.residentId);
    if (!resident) {
      throw new Error("Associated resident not found");
    }

    return dnacpr;
  }
});

export const updateDnacpr = mutation({
  args: {
    dnacprId: v.id("dnacprs"),

    // All the same fields as submitDnacpr
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),

    // Resident information
    residentName: v.string(),
    bedroomNumber: v.string(),
    dateOfBirth: v.number(),

    // Questions
    dnacpr: v.boolean(),
    dnacprComments: v.optional(v.string()),
    reason: v.union(
      v.literal("TERMINAL-PROGRESSIVE"),
      v.literal("UNSUCCESSFUL-CPR"),
      v.literal("OTHER")
    ),
    date: v.number(),

    // Discussed with
    discussedResident: v.boolean(),
    discussedResidentComments: v.optional(v.string()),
    discussedResidentDate: v.optional(v.number()),
    discussedRelatives: v.boolean(),
    discussedRelativesComments: v.optional(v.string()),
    discussedRelativeDate: v.optional(v.number()),
    discussedNOKs: v.boolean(),
    discussedNOKsComments: v.optional(v.string()),
    discussedNOKsDate: v.optional(v.number()),
    comments: v.optional(v.string()),

    // GP signature
    gpDate: v.number(),
    gpSignature: v.string(),
    residentNokSignature: v.string(),
    registeredNurseSignature: v.string(),

    // Metadata
    savedAsDraft: v.optional(v.boolean())
  },
  returns: v.id("dnacprs"),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Verify DNACPR exists
    const existingDnacpr = await ctx.db.get(args.dnacprId);
    if (!existingDnacpr) {
      throw new Error("DNACPR form not found");
    }

    // Update the DNACPR form
    await ctx.db.patch(args.dnacprId, {
      // Resident information
      residentName: args.residentName,
      bedroomNumber: args.bedroomNumber,
      dateOfBirth: args.dateOfBirth,

      // Questions
      dnacpr: args.dnacpr,
      dnacprComments: args.dnacprComments,
      reason: args.reason,
      date: args.date,

      // Discussed with
      discussedResident: args.discussedResident,
      discussedResidentComments: args.discussedResidentComments,
      discussedResidentDate: args.discussedResidentDate,
      discussedRelatives: args.discussedRelatives,
      discussedRelativesComments: args.discussedRelativesComments,
      discussedRelativeDate: args.discussedRelativeDate,
      discussedNOKs: args.discussedNOKs,
      discussedNOKsComments: args.discussedNOKsComments,
      discussedNOKsDate: args.discussedNOKsDate,
      comments: args.comments,

      // GP signature
      gpDate: args.gpDate,
      gpSignature: args.gpSignature,
      residentNokSignature: args.residentNokSignature,
      registeredNurseSignature: args.registeredNurseSignature,

      // Metadata
      status: args.savedAsDraft ? ("draft" as const) : ("submitted" as const),
      submittedAt: args.savedAsDraft
        ? existingDnacpr.submittedAt
        : (existingDnacpr.submittedAt ?? now),
      lastModifiedAt: now,
      lastModifiedBy: args.userId
    });

    // Schedule PDF regeneration if not a draft
    if (!args.savedAsDraft) {
      await ctx.scheduler.runAfter(
        1000, // 1 second delay
        internal.careFiles.dnacpr.generatePDFAndUpdateRecord,
        { dnacprId: args.dnacprId }
      );
    }

    return args.dnacprId;
  }
});

export const saveDraftDnacpr = mutation({
  args: {
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),
    draftData: v.any() // Flexible for partial data
  },
  returns: v.id("dnacprs"),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check for existing draft
    const existingDraft = await ctx.db
      .query("dnacprs")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .filter((q) => q.eq(q.field("status"), "draft"))
      .first();

    if (existingDraft) {
      // Update existing draft
      await ctx.db.patch(existingDraft._id, {
        ...args.draftData,
        lastModifiedAt: now,
        lastModifiedBy: args.userId
      });
      return existingDraft._id;
    } else {
      // Create new draft with minimal required fields
      const draftId = await ctx.db.insert("dnacprs", {
        residentId: args.residentId,
        teamId: args.teamId,
        organizationId: args.organizationId,
        userId: args.userId,

        // Default values for required fields
        residentName: args.draftData.residentName ?? "",
        bedroomNumber: args.draftData.bedroomNumber ?? "",
        dateOfBirth: args.draftData.dateOfBirth ?? Date.now(),
        dnacpr: args.draftData.dnacpr ?? false,
        reason: args.draftData.reason ?? "TERMINAL-PROGRESSIVE",
        date: args.draftData.date ?? Date.now(),
        discussedResident: args.draftData.discussedResident ?? false,
        discussedRelatives: args.draftData.discussedRelatives ?? false,
        discussedNOKs: args.draftData.discussedNOKs ?? false,
        gpDate: args.draftData.gpDate ?? Date.now(),
        gpSignature: args.draftData.gpSignature ?? "",
        residentNokSignature: args.draftData.residentNokSignature ?? "",
        registeredNurseSignature: args.draftData.registeredNurseSignature ?? "",

        // Include any other provided data
        ...args.draftData,

        status: "draft" as const,
        createdBy: args.userId
      });
      return draftId;
    }
  }
});

export const deleteDnacpr = mutation({
  args: {
    dnacprId: v.id("dnacprs")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify DNACPR exists
    const dnacpr = await ctx.db.get(args.dnacprId);
    if (!dnacpr) {
      throw new Error("DNACPR form not found");
    }

    // Delete the DNACPR form
    await ctx.db.delete(args.dnacprId);

    return null;
  }
});

// Internal action for PDF generation
export const generatePDFAndUpdateRecord = internalAction({
  args: {
    dnacprId: v.id("dnacprs")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Fetch the DNACPR data
      const dnacpr = await ctx.runQuery(
        internal.careFiles.dnacpr.getDnacprForPDF,
        { dnacprId: args.dnacprId }
      );

      if (!dnacpr) {
        throw new Error("DNACPR form not found");
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
      console.log("Calling PDF API at:", `${pdfApiUrl}/api/pdf/dnacpr`);
      const pdfResponse = await fetch(`${pdfApiUrl}/api/pdf/dnacpr`, {
        method: "POST",
        headers,
        body: JSON.stringify(dnacpr)
      });

      console.log("PDF API request details:", {
        url: `${pdfApiUrl}/api/pdf/dnacpr`,
        hasToken: !!pdfApiToken,
        dnacprId: args.dnacprId
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

      // Update the DNACPR record with the PDF file ID
      await ctx.runMutation(internal.careFiles.dnacpr.updatePDFFileId, {
        dnacprId: args.dnacprId,
        pdfFileId: storageId
      });
    } catch (error) {
      console.error("Error generating and saving PDF:", error);
      // Don't throw here to avoid crashing the entire form submission
    }

    return null;
  }
});

/**
 * Get DNACPR data for PDF generation (internal use only)
 */
export const getDnacprForPDF = internalQuery({
  args: {
    dnacprId: v.id("dnacprs")
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const dnacpr = await ctx.db.get(args.dnacprId);
    return dnacpr;
  }
});

/**
 * Update a DNACPR with PDF file ID
 */
export const updatePDFFileId = internalMutation({
  args: {
    dnacprId: v.id("dnacprs"),
    pdfFileId: v.id("_storage")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.dnacprId, {
      pdfFileId: args.pdfFileId
    });
    return null;
  }
});

export const updateDnacprWithPDF = internalMutation({
  args: {
    dnacprId: v.id("dnacprs"),
    pdfUrl: v.string(),
    pdfFileId: v.id("_storage")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.dnacprId, {
      pdfUrl: args.pdfUrl,
      pdfFileId: args.pdfFileId,
      pdfGeneratedAt: Date.now()
    });

    return null;
  }
});

/**
 * Get PDF URL for a DNACPR form
 */
export const getPDFUrl = query({
  args: {
    dnacprId: v.id("dnacprs")
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const dnacpr = await ctx.db.get(args.dnacprId);

    if (!dnacpr || !dnacpr.pdfFileId) {
      return null;
    }

    const url = await ctx.storage.getUrl(dnacpr.pdfFileId);
    return url;
  }
});
