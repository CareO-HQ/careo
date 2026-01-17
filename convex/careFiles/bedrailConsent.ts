import {
  mutation,
  query,
  internalAction,
  internalMutation
} from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

/**
 * Shared validators for bedrail consent sections
 */
const ableToConsentValidator = v.object({
  consentChoice: v.union(
    v.literal("CONSENT_TO_USE"),
    v.literal("REFUSE_TO_USE")
  ),
  residentSignature: v.string(),
  staffMemberName: v.string(),
  staffMemberSignature: v.string(),
  staffSignatureDate: v.string()
});

const unableToConsentValidator = v.object({
  representativeName: v.string(),
  discussionAcknowledged: v.boolean(),
  residentPreference: v.union(
    v.literal("WOULD_PREFER_USE"),
    v.literal("WOULD_NOT_PREFER_USE")
  ),
  representativeSignature: v.string(),
  staffMemberName: v.string(),
  staffMemberSignature: v.string(),
  staffSignatureDate: v.string()
});

/**
 * Submit a bedrail consent form
 */
export const submitBedrailConsent = mutation({
  args: {
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),
    savedAsDraft: v.optional(v.boolean()),

    // Header Information
    residentName: v.string(),
    bedroomNumber: v.string(),
    dateOfBirth: v.number(),

    // Consent Type
    consentType: v.union(
      v.literal("ABLE_TO_CONSENT"),
      v.literal("UNABLE_TO_CONSENT")
    ),

    // Conditional sections
    ableToConsentSection: v.optional(ableToConsentValidator),
    unableToConsentSection: v.optional(unableToConsentValidator)
  },
  returns: v.id("bedrailConsents"),
  handler: async (ctx, args) => {
    // Verify the resident exists
    const resident = await ctx.db.get(args.residentId);
    if (!resident) {
      throw new Error("Resident not found");
    }

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

    // Validate that the correct section is filled
    if (args.consentType === "ABLE_TO_CONSENT" && !args.ableToConsentSection) {
      throw new Error(
        "Able to consent section is required when consent type is ABLE_TO_CONSENT"
      );
    }

    if (
      args.consentType === "UNABLE_TO_CONSENT" &&
      !args.unableToConsentSection
    ) {
      throw new Error(
        "Unable to consent section is required when consent type is UNABLE_TO_CONSENT"
      );
    }

    // Create the bedrail consent record
    const consentId = await ctx.db.insert("bedrailConsents", {
      ...args,
      createdAt: Date.now(),
      createdBy: user._id,
      savedAsDraft: args.savedAsDraft ?? false
    });

    // Schedule PDF generation after successful save if not a draft
    if (!args.savedAsDraft) {
      await ctx.scheduler.runAfter(
        0,
        internal.careFiles.bedrailConsent.generatePDFAndUpdateRecord,
        {
          consentId: consentId
        }
      );
    }

    return consentId;
  }
});

/**
 * Get a bedrail consent by ID
 */
export const getBedrailConsent = query({
  args: {
    id: v.id("bedrailConsents")
  },
  returns: v.union(
    v.object({
      _id: v.id("bedrailConsents"),
      _creationTime: v.number(),
      residentId: v.id("residents"),
      teamId: v.string(),
      organizationId: v.string(),
      userId: v.string(),
      savedAsDraft: v.optional(v.boolean()),

      // Header Information
      residentName: v.string(),
      bedroomNumber: v.string(),
      dateOfBirth: v.number(),

      // Consent Type
      consentType: v.union(
        v.literal("ABLE_TO_CONSENT"),
        v.literal("UNABLE_TO_CONSENT")
      ),

      // Conditional sections
      ableToConsentSection: v.optional(ableToConsentValidator),
      unableToConsentSection: v.optional(unableToConsentValidator),

      // Metadata
      createdAt: v.number(),
      createdBy: v.id("users"),
      updatedAt: v.optional(v.number()),
      updatedBy: v.optional(v.id("users")),
      pdfFileId: v.optional(v.id("_storage"))
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const consent = await ctx.db.get(args.id);
    return consent;
  }
});

/**
 * Get bedrail consents for a specific resident
 */
export const getBedrailConsentsByResident = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.array(
    v.object({
      _id: v.id("bedrailConsents"),
      _creationTime: v.number(),
      residentId: v.id("residents"),
      teamId: v.string(),
      organizationId: v.string(),
      savedAsDraft: v.optional(v.boolean()),
      residentName: v.string(),
      bedroomNumber: v.string(),
      consentType: v.union(
        v.literal("ABLE_TO_CONSENT"),
        v.literal("UNABLE_TO_CONSENT")
      ),
      createdAt: v.number(),
      createdBy: v.id("users"),
      pdfFileId: v.optional(v.id("_storage"))
    })
  ),
  handler: async (ctx, args) => {
    const consents = await ctx.db
      .query("bedrailConsents")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .collect();

    return consents.map((consent) => ({
      _id: consent._id,
      _creationTime: consent._creationTime,
      residentId: consent.residentId,
      teamId: consent.teamId,
      organizationId: consent.organizationId,
      savedAsDraft: consent.savedAsDraft,
      residentName: consent.residentName,
      bedroomNumber: consent.bedroomNumber,
      consentType: consent.consentType,
      createdAt: consent.createdAt,
      createdBy: consent.createdBy,
      pdfFileId: consent.pdfFileId
    }));
  }
});

/**
 * Update an existing bedrail consent (for drafts)
 */
export const updateBedrailConsent = mutation({
  args: {
    id: v.id("bedrailConsents"),
    updates: v.object({
      savedAsDraft: v.optional(v.boolean()),
      residentName: v.optional(v.string()),
      bedroomNumber: v.optional(v.string()),
      dateOfBirth: v.optional(v.number()),
      consentType: v.optional(
        v.union(v.literal("ABLE_TO_CONSENT"), v.literal("UNABLE_TO_CONSENT"))
      ),
      ableToConsentSection: v.optional(ableToConsentValidator),
      unableToConsentSection: v.optional(unableToConsentValidator)
    })
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify the consent exists
    const existingConsent = await ctx.db.get(args.id);
    if (!existingConsent) {
      throw new Error("Bedrail consent not found");
    }

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

    // Update the consent
    await ctx.db.patch(args.id, {
      ...args.updates,
      updatedAt: Date.now(),
      updatedBy: user._id
    });

    // Schedule PDF generation if the draft is being finalized
    if (args.updates.savedAsDraft === false && existingConsent.savedAsDraft) {
      await ctx.scheduler.runAfter(
        0,
        internal.careFiles.bedrailConsent.generatePDFAndUpdateRecord,
        {
          consentId: args.id
        }
      );
    }

    return null;
  }
});

/**
 * Check if a bedrail consent exists for a resident
 */
export const hasBedrailConsent = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const consent = await ctx.db
      .query("bedrailConsents")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .first();

    return consent !== null;
  }
});

/**
 * Delete a bedrail consent
 */
export const deleteBedrailConsent = mutation({
  args: {
    id: v.id("bedrailConsents")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify the consent exists
    const existingConsent = await ctx.db.get(args.id);
    if (!existingConsent) {
      throw new Error("Bedrail consent not found");
    }

    // Delete the consent
    await ctx.db.delete(args.id);
    return null;
  }
});

/**
 * Generate PDF and update the record with the file ID
 */
export const generatePDFAndUpdateRecord = internalAction({
  args: {
    consentId: v.id("bedrailConsents")
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
      console.log(
        "Calling PDF API at:",
        `${pdfApiUrl}/api/pdf/bedrail-consent`
      );
      const pdfResponse = await fetch(`${pdfApiUrl}/api/pdf/bedrail-consent`, {
        method: "POST",
        headers,
        body: JSON.stringify({ consentId: args.consentId })
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
      await ctx.runMutation(internal.careFiles.bedrailConsent.updatePDFFileId, {
        consentId: args.consentId,
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
 * Update a bedrail consent with PDF file ID
 */
export const updatePDFFileId = internalMutation({
  args: {
    consentId: v.id("bedrailConsents"),
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

/**
 * Get PDF URL for a bedrail consent
 */
export const getPDFUrl = query({
  args: {
    consentId: v.id("bedrailConsents")
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
 * Get archived (non-latest) bedrail consents for a resident
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
      .query("bedrailConsents")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    // Return all except the first one (the latest)
    return allConsents.length > 1 ? allConsents.slice(1) : [];
  }
});
