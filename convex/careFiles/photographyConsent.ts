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

export const submitPhotographyConsent = mutation({
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

    // Consent fields
    healthcareRecords: v.boolean(),
    socialActivitiesInternal: v.boolean(),
    socialActivitiesExternal: v.boolean(),

    // Signature fields
    residentSignature: v.optional(v.string()),

    // Representative fields
    representativeName: v.optional(v.string()),
    representativeRelationship: v.optional(v.string()),
    representativeSignature: v.optional(v.string()),
    representativeDate: v.optional(v.number()),

    // Staff fields
    nameStaff: v.string(),
    staffSignature: v.string(),
    date: v.number(),

    // Metadata
    savedAsDraft: v.optional(v.boolean())
  },
  returns: v.id("photographyConsents"),
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

    // Insert the photography consent
    const consentId = await ctx.db.insert("photographyConsents", {
      residentId: args.residentId,
      teamId: args.teamId,
      organizationId: args.organizationId,
      userId: args.userId,

      // Resident information
      residentName: args.residentName,
      bedroomNumber: args.bedroomNumber,
      dateOfBirth: args.dateOfBirth,

      // Consent fields
      healthcareRecords: args.healthcareRecords,
      socialActivitiesInternal: args.socialActivitiesInternal,
      socialActivitiesExternal: args.socialActivitiesExternal,

      // Signature fields
      residentSignature: args.residentSignature,

      // Representative fields
      representativeName: args.representativeName,
      representativeRelationship: args.representativeRelationship,
      representativeSignature: args.representativeSignature,
      representativeDate: args.representativeDate,

      // Staff fields
      nameStaff: args.nameStaff,
      staffSignature: args.staffSignature,
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
        internal.careFiles.photographyConsent.generatePDFAndUpdateRecord,
        { consentId }
      );
    }

    return consentId;
  }
});

export const getPhotographyConsentsByResident = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.array(
    v.object({
      _id: v.id("photographyConsents"),
      _creationTime: v.number(),
      residentId: v.id("residents"),
      teamId: v.string(),
      organizationId: v.string(),
      userId: v.string(),
      residentName: v.string(),
      bedroomNumber: v.string(),
      dateOfBirth: v.number(),
      status: v.union(
        v.literal("draft"),
        v.literal("submitted"),
        v.literal("reviewed")
      ),
      submittedAt: v.optional(v.number()),
      createdBy: v.string()
    })
  ),
  handler: async (ctx, args) => {
    // Verify resident exists
    const resident = await ctx.db.get(args.residentId);
    if (!resident) {
      throw new Error("Resident not found");
    }

    const consents = await ctx.db
      .query("photographyConsents")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    // Return simplified data for listing
    return consents.map((consent) => ({
      _id: consent._id,
      _creationTime: consent._creationTime,
      residentId: consent.residentId,
      teamId: consent.teamId,
      organizationId: consent.organizationId,
      userId: consent.userId,
      residentName: consent.residentName,
      bedroomNumber: consent.bedroomNumber,
      dateOfBirth: consent.dateOfBirth,
      status: consent.status ?? "submitted",
      submittedAt: consent.submittedAt,
      createdBy: consent.createdBy
    }));
  }
});

export const getPhotographyConsentById = query({
  args: {
    consentId: v.id("photographyConsents")
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("photographyConsents"),
      _creationTime: v.number(),
      residentId: v.id("residents"),
      teamId: v.string(),
      organizationId: v.string(),
      userId: v.string(),

      // Resident information
      residentName: v.string(),
      bedroomNumber: v.string(),
      dateOfBirth: v.number(),

      // Consent fields
      healthcareRecords: v.boolean(),
      socialActivitiesInternal: v.boolean(),
      socialActivitiesExternal: v.boolean(),

      // Signature fields
      residentSignature: v.optional(v.string()),

      // Representative fields
      representativeName: v.optional(v.string()),
      representativeRelationship: v.optional(v.string()),
      representativeSignature: v.optional(v.string()),
      representativeDate: v.optional(v.number()),

      // Staff fields
      nameStaff: v.string(),
      staffSignature: v.string(),
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
      lastModifiedAt: v.optional(v.number()),
      lastModifiedBy: v.optional(v.string()),
      pdfUrl: v.optional(v.string())
    })
  ),
  handler: async (ctx, args) => {
    const consent = await ctx.db.get(args.consentId);
    if (!consent) {
      return null;
    }

    // Verify consent has an associated resident
    const resident = await ctx.db.get(consent.residentId);
    if (!resident) {
      throw new Error("Associated resident not found");
    }

    return consent;
  }
});

export const updatePhotographyConsent = mutation({
  args: {
    consentId: v.id("photographyConsents"),

    // All the same fields as submitPhotographyConsent
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),

    // Resident information
    residentName: v.string(),
    bedroomNumber: v.string(),
    dateOfBirth: v.number(),

    // Consent fields
    healthcareRecords: v.boolean(),
    socialActivitiesInternal: v.boolean(),
    socialActivitiesExternal: v.boolean(),

    // Signature fields
    residentSignature: v.optional(v.string()),

    // Representative fields
    representativeName: v.optional(v.string()),
    representativeRelationship: v.optional(v.string()),
    representativeSignature: v.optional(v.string()),
    representativeDate: v.optional(v.number()),

    // Staff fields
    nameStaff: v.string(),
    staffSignature: v.string(),
    date: v.number(),

    // Metadata
    savedAsDraft: v.optional(v.boolean())
  },
  returns: v.id("photographyConsents"),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Verify old consent exists
    const existingConsent = await ctx.db.get(args.consentId);
    if (!existingConsent) {
      throw new Error("Photography consent not found");
    }

    // Create a NEW version instead of patching the old one
    // This automatically archives the old version
    const newConsentId = await ctx.db.insert("photographyConsents", {
      // Metadata
      residentId: args.residentId,
      teamId: args.teamId,
      organizationId: args.organizationId,
      userId: args.userId,

      // Resident information
      residentName: args.residentName,
      bedroomNumber: args.bedroomNumber,
      dateOfBirth: args.dateOfBirth,

      // Consent fields
      healthcareRecords: args.healthcareRecords,
      socialActivitiesInternal: args.socialActivitiesInternal,
      socialActivitiesExternal: args.socialActivitiesExternal,

      // Signature fields
      residentSignature: args.residentSignature,

      // Representative fields
      representativeName: args.representativeName,
      representativeRelationship: args.representativeRelationship,
      representativeSignature: args.representativeSignature,
      representativeDate: args.representativeDate,

      // Staff fields
      nameStaff: args.nameStaff,
      staffSignature: args.staffSignature,
      date: args.date,

      // Metadata
      status: args.savedAsDraft ? ("draft" as const) : ("submitted" as const),
      submittedAt: args.savedAsDraft ? undefined : now,
      createdBy: args.userId,
      lastModifiedAt: now,
      lastModifiedBy: args.userId
    });

    // Schedule PDF generation for the new version if not a draft
    if (!args.savedAsDraft) {
      await ctx.scheduler.runAfter(
        1000, // 1 second delay
        internal.careFiles.photographyConsent.generatePDFAndUpdateRecord,
        { consentId: newConsentId }
      );
    }

    return newConsentId;
  }
});

export const saveDraftPhotographyConsent = mutation({
  args: {
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),
    draftData: v.any() // Flexible for partial data
  },
  returns: v.id("photographyConsents"),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check for existing draft
    const existingDraft = await ctx.db
      .query("photographyConsents")
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
      const draftId = await ctx.db.insert("photographyConsents", {
        residentId: args.residentId,
        teamId: args.teamId,
        organizationId: args.organizationId,
        userId: args.userId,

        // Default values for required fields
        residentName: args.draftData.residentName ?? "",
        bedroomNumber: args.draftData.bedroomNumber ?? "",
        dateOfBirth: args.draftData.dateOfBirth ?? Date.now(),
        healthcareRecords: args.draftData.healthcareRecords ?? false,
        socialActivitiesInternal:
          args.draftData.socialActivitiesInternal ?? false,
        socialActivitiesExternal:
          args.draftData.socialActivitiesExternal ?? false,
        nameStaff: args.draftData.nameStaff ?? "",
        staffSignature: args.draftData.staffSignature ?? "",
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

export const deletePhotographyConsent = mutation({
  args: {
    consentId: v.id("photographyConsents")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify consent exists
    const consent = await ctx.db.get(args.consentId);
    if (!consent) {
      throw new Error("Photography consent not found");
    }

    // Delete the consent
    await ctx.db.delete(args.consentId);

    return null;
  }
});

// Internal action for PDF generation
export const generatePDFAndUpdateRecord = internalAction({
  args: {
    consentId: v.id("photographyConsents")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Fetch the consent data
      const consent = await ctx.runQuery(
        internal.careFiles.photographyConsent.getPhotographyConsentForPDF,
        { consentId: args.consentId }
      );

      if (!consent) {
        throw new Error("Photography consent not found");
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
      console.log(
        "Calling PDF API at:",
        `${pdfApiUrl}/api/pdf/photography-consent`
      );
      const pdfResponse = await fetch(
        `${pdfApiUrl}/api/pdf/photography-consent`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(consent)
        }
      );

      console.log("PDF API request details:", {
        url: `${pdfApiUrl}/api/pdf/photography-consent`,
        hasToken: !!pdfApiToken,
        consentId: args.consentId
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

      // Update the consent record with the PDF file ID
      await ctx.runMutation(
        internal.careFiles.photographyConsent.updatePDFFileId,
        {
          consentId: args.consentId,
          pdfFileId: storageId
        }
      );
    } catch (error) {
      console.error("Error generating and saving PDF:", error);
      // Don't throw here to avoid crashing the entire form submission
    }

    return null;
  }
});

/**
 * Get photography consent data for PDF generation (internal use only)
 */
export const getPhotographyConsentForPDF = internalQuery({
  args: {
    consentId: v.id("photographyConsents")
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const consent = await ctx.db.get(args.consentId);
    return consent;
  }
});

/**
 * Update a photography consent with PDF file ID
 */
export const updatePDFFileId = internalMutation({
  args: {
    consentId: v.id("photographyConsents"),
    pdfFileId: v.id("_storage")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.consentId, {
      pdfFileId: args.pdfFileId
    });
    return null;
  }
});

export const updateConsentWithPDF = internalMutation({
  args: {
    consentId: v.id("photographyConsents"),
    pdfUrl: v.string(),
    pdfFileId: v.id("_storage")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.consentId, {
      pdfUrl: args.pdfUrl,
      pdfFileId: args.pdfFileId,
      pdfGeneratedAt: Date.now()
    });

    return null;
  }
});

/**
 * Get PDF URL for a photography consent
 */
export const getPDFUrl = query({
  args: {
    consentId: v.id("photographyConsents")
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const consent = await ctx.db.get(args.consentId);

    if (!consent || !consent.pdfFileId) {
      return null;
    }

    const url = await ctx.storage.getUrl(consent.pdfFileId);
    return url;
  }
});

/**
 * Get archived (non-latest) photography consents for a resident
 * Returns all consents except the most recent one
 */
export const getArchivedForResident = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Get all consents for this resident, ordered by creation time (newest first)
    const allConsents = await ctx.db
      .query("photographyConsents")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    // Return all except the first one (the latest)
    return allConsents.length > 1 ? allConsents.slice(1) : [];
  }
});
