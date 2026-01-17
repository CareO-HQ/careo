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

export const submitPeep = mutation({
  args: {
    // Metadata
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),

    // Resident information
    residentName: v.string(),
    residentDateOfBirth: v.number(),
    bedroomNumber: v.string(),

    // Questions
    understands: v.boolean(),
    staffNeeded: v.number(),
    equipmentNeeded: v.optional(v.string()),
    communicationNeeds: v.optional(v.string()),

    // Steps
    steps: v.optional(
      v.array(
        v.object({
          name: v.string(),
          description: v.string()
        })
      )
    ),

    // Safety Questions
    oxigenInUse: v.boolean(),
    oxigenComments: v.optional(v.string()),
    residentSmokes: v.boolean(),
    residentSmokesComments: v.optional(v.string()),
    furnitureFireRetardant: v.boolean(),
    furnitureFireRetardantComments: v.optional(v.string()),

    // Completed by
    completedBy: v.string(),
    completedBySignature: v.string(),
    date: v.number(),

    // Metadata
    savedAsDraft: v.optional(v.boolean()),
    status: v.optional(
      v.union(v.literal("draft"), v.literal("submitted"), v.literal("reviewed"))
    )
  },
  returns: v.id("peeps"),
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

    // Insert the PEEP form
    const peepId = await ctx.db.insert("peeps", {
      residentId: args.residentId,
      teamId: args.teamId,
      organizationId: args.organizationId,
      userId: args.userId,

      // Resident information
      residentName: args.residentName,
      residentDateOfBirth: args.residentDateOfBirth,
      bedroomNumber: args.bedroomNumber,

      // Questions
      understands: args.understands,
      staffNeeded: args.staffNeeded,
      equipmentNeeded: args.equipmentNeeded,
      communicationNeeds: args.communicationNeeds,

      // Steps
      steps: args.steps,

      // Safety Questions
      oxigenInUse: args.oxigenInUse,
      oxigenComments: args.oxigenComments,
      residentSmokes: args.residentSmokes,
      residentSmokesComments: args.residentSmokesComments,
      furnitureFireRetardant: args.furnitureFireRetardant,
      furnitureFireRetardantComments: args.furnitureFireRetardantComments,

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
        internal.careFiles.peep.generatePDFAndUpdateRecord,
        { peepId }
      );
    }

    return peepId;
  }
});

export const getPeepsByResident = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.array(
    v.object({
      _id: v.id("peeps"),
      _creationTime: v.number(),
      residentId: v.id("residents"),
      teamId: v.string(),
      organizationId: v.string(),
      userId: v.string(),
      residentName: v.string(),
      residentDateOfBirth: v.number(),
      bedroomNumber: v.string(),
      understands: v.boolean(),
      staffNeeded: v.number(),
      completedBy: v.string(),
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

    const peeps = await ctx.db
      .query("peeps")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    // Return simplified data for listing
    return peeps.map((peep) => ({
      _id: peep._id,
      _creationTime: peep._creationTime,
      residentId: peep.residentId,
      teamId: peep.teamId,
      organizationId: peep.organizationId,
      userId: peep.userId,
      residentName: peep.residentName,
      residentDateOfBirth: peep.residentDateOfBirth,
      bedroomNumber: peep.bedroomNumber,
      understands: Boolean(peep.understands),
      staffNeeded: peep.staffNeeded,
      completedBy: peep.completedBy,
      date: peep.date,
      status: peep.status ?? "submitted",
      submittedAt: peep.submittedAt,
      createdBy: peep.createdBy,
      pdfUrl: peep.pdfUrl
    }));
  }
});

export const getPeepById = query({
  args: {
    peepId: v.id("peeps")
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("peeps"),
      _creationTime: v.number(),
      residentId: v.id("residents"),
      teamId: v.string(),
      organizationId: v.string(),
      userId: v.string(),

      // Resident information
      residentName: v.string(),
      residentDateOfBirth: v.number(),
      bedroomNumber: v.string(),

      // Questions
      understands: v.boolean(),
      staffNeeded: v.number(),
      equipmentNeeded: v.optional(v.string()),
      communicationNeeds: v.optional(v.string()),

      // Steps
      steps: v.optional(
        v.array(
          v.object({
            name: v.string(),
            description: v.string()
          })
        )
      ),

      // Safety Questions
      oxigenInUse: v.boolean(),
      oxigenComments: v.optional(v.string()),
      residentSmokes: v.boolean(),
      residentSmokesComments: v.optional(v.string()),
      furnitureFireRetardant: v.boolean(),
      furnitureFireRetardantComments: v.optional(v.string()),

      // Completed by
      completedBy: v.string(),
      completedBySignature: v.string(),
      date: v.number(),

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
    const peep = await ctx.db.get(args.peepId);
    if (!peep) {
      return null;
    }

    // Verify PEEP has an associated resident
    const resident = await ctx.db.get(peep.residentId);
    if (!resident) {
      throw new Error("Associated resident not found");
    }

    return peep;
  }
});

export const updatePeep = mutation({
  args: {
    peepId: v.id("peeps"),

    // All the same fields as submitPeep
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),

    // Resident information
    residentName: v.string(),
    residentDateOfBirth: v.number(),
    bedroomNumber: v.string(),

    // Questions
    understands: v.boolean(),
    staffNeeded: v.number(),
    equipmentNeeded: v.optional(v.string()),
    communicationNeeds: v.optional(v.string()),

    // Steps
    steps: v.optional(
      v.array(
        v.object({
          name: v.string(),
          description: v.string()
        })
      )
    ),

    // Safety Questions
    oxigenInUse: v.boolean(),
    oxigenComments: v.optional(v.string()),
    residentSmokes: v.boolean(),
    residentSmokesComments: v.optional(v.string()),
    furnitureFireRetardant: v.boolean(),
    furnitureFireRetardantComments: v.optional(v.string()),

    // Completed by
    completedBy: v.string(),
    completedBySignature: v.string(),
    date: v.number(),

    // Metadata
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("submitted"),
        v.literal("reviewed")
      )
    ),
    savedAsDraft: v.optional(v.boolean())
  },
  returns: v.id("peeps"),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Verify PEEP exists
    const existingPeep = await ctx.db.get(args.peepId);
    if (!existingPeep) {
      throw new Error("PEEP form not found");
    }

    // Create a NEW version instead of patching the old one
    const newPeepId = await ctx.db.insert("peeps", {
      residentId: args.residentId,
      teamId: args.teamId,
      organizationId: args.organizationId,
      userId: args.userId,

      // Resident information
      residentName: args.residentName,
      residentDateOfBirth: args.residentDateOfBirth,
      bedroomNumber: args.bedroomNumber,

      // Questions
      understands: args.understands,
      staffNeeded: args.staffNeeded,
      equipmentNeeded: args.equipmentNeeded,
      communicationNeeds: args.communicationNeeds,

      // Steps
      steps: args.steps,

      // Safety Questions
      oxigenInUse: args.oxigenInUse,
      oxigenComments: args.oxigenComments,
      residentSmokes: args.residentSmokes,
      residentSmokesComments: args.residentSmokesComments,
      furnitureFireRetardant: args.furnitureFireRetardant,
      furnitureFireRetardantComments: args.furnitureFireRetardantComments,

      // Completed by
      completedBy: args.completedBy,
      completedBySignature: args.completedBySignature,
      date: args.date,

      // Metadata
      status: args.savedAsDraft ? ("draft" as const) : ("submitted" as const),
      submittedAt: args.savedAsDraft ? undefined : now,
      createdBy: args.userId
    });

    // Schedule PDF regeneration if not a draft
    if (!args.savedAsDraft) {
      await ctx.scheduler.runAfter(
        1000, // 1 second delay
        internal.careFiles.peep.generatePDFAndUpdateRecord,
        { peepId: newPeepId }
      );
    }

    return newPeepId;
  }
});

export const saveDraftPeep = mutation({
  args: {
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),
    draftData: v.any() // Flexible for partial data
  },
  returns: v.id("peeps"),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check for existing draft
    const existingDraft = await ctx.db
      .query("peeps")
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
      const draftId = await ctx.db.insert("peeps", {
        residentId: args.residentId,
        teamId: args.teamId,
        organizationId: args.organizationId,
        userId: args.userId,

        // Default values for required fields
        residentName: args.draftData.residentName ?? "",
        residentDateOfBirth: args.draftData.residentDateOfBirth ?? Date.now(),
        bedroomNumber: args.draftData.bedroomNumber ?? "",
        understands: args.draftData.understands ?? false,
        staffNeeded: args.draftData.staffNeeded ?? 1,
        oxigenInUse: args.draftData.oxigenInUse ?? false,
        residentSmokes: args.draftData.residentSmokes ?? false,
        furnitureFireRetardant: args.draftData.furnitureFireRetardant ?? false,
        completedBy: args.draftData.completedBy ?? "",
        completedBySignature: args.draftData.completedBySignature ?? "",
        date: args.draftData.date ?? Date.now(),

        // Include any other provided data
        ...args.draftData,

        status: "draft" as const,
        createdBy: args.userId
      });
      return draftId;
    }
  }
});

export const deletePeep = mutation({
  args: {
    peepId: v.id("peeps")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify PEEP exists
    const peep = await ctx.db.get(args.peepId);
    if (!peep) {
      throw new Error("PEEP form not found");
    }

    // Delete the PEEP form
    await ctx.db.delete(args.peepId);

    return null;
  }
});

// Internal action for PDF generation
export const generatePDFAndUpdateRecord = internalAction({
  args: {
    peepId: v.id("peeps")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Fetch the PEEP data
      const peep = await ctx.runQuery(internal.careFiles.peep.getPeepForPDF, {
        peepId: args.peepId
      });

      if (!peep) {
        throw new Error("PEEP form not found");
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
      console.log("Calling PDF API at:", `${pdfApiUrl}/api/pdf/peep`);
      const pdfResponse = await fetch(`${pdfApiUrl}/api/pdf/peep`, {
        method: "POST",
        headers,
        body: JSON.stringify(peep)
      });

      console.log("PDF API request details:", {
        url: `${pdfApiUrl}/api/pdf/peep`,
        hasToken: !!pdfApiToken,
        peepId: args.peepId
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

      // Update the PEEP record with the PDF file ID
      await ctx.runMutation(internal.careFiles.peep.updatePDFFileId, {
        peepId: args.peepId,
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
 * Get PEEP data for PDF generation (internal use only)
 */
export const getPeepForPDF = internalQuery({
  args: {
    peepId: v.id("peeps")
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const peep = await ctx.db.get(args.peepId);
    return peep;
  }
});

/**
 * Update a PEEP with PDF file ID
 */
export const updatePDFFileId = internalMutation({
  args: {
    peepId: v.id("peeps"),
    pdfFileId: v.id("_storage")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.peepId, {
      pdfFileId: args.pdfFileId
    });
    return null;
  }
});

export const updatePeepWithPDF = internalMutation({
  args: {
    peepId: v.id("peeps"),
    pdfUrl: v.string(),
    pdfFileId: v.id("_storage")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.peepId, {
      pdfUrl: args.pdfUrl,
      pdfFileId: args.pdfFileId,
      pdfGeneratedAt: Date.now()
    });

    return null;
  }
});

/**
 * Get PDF URL for a PEEP form
 */
export const getPDFUrl = query({
  args: {
    peepId: v.id("peeps")
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const peep = await ctx.db.get(args.peepId);

    if (!peep || !peep.pdfFileId) {
      return null;
    }

    const url = await ctx.storage.getUrl(peep.pdfFileId);
    return url;
  }
});

/**
 * Get archived (non-latest) PEEP assessments for a resident
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
      .query("peeps")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    // Return all except the first one (the latest)
    return allAssessments.length > 1 ? allAssessments.slice(1) : [];
  }
});
