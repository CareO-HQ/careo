import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction, internalMutation, mutation, query } from "../_generated/server";

// Schema for activity details
const activitySchema = v.object({
  nStaff: v.number(),
  equipment: v.string(),
  handlingPlan: v.string(),
  dateForReview: v.number()
});

/**
 * Submit a new handling profile
 */
export const submitHandlingProfile = mutation({
  args: {
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    completedBy: v.string(),
    jobRole: v.string(),
    date: v.number(),
    residentName: v.string(),
    bedroomNumber: v.string(),
    weight: v.number(),
    weightBearing: v.string(),
    transferBed: activitySchema,
    transferChair: activitySchema,
    walking: activitySchema,
    toileting: activitySchema,
    movementInBed: activitySchema,
    bath: activitySchema,
    outdoorMobility: activitySchema
  },
  returns: v.id("residentHandlingProfileForm"),
  handler: async (ctx, args) => {
    const profileId = await ctx.db.insert("residentHandlingProfileForm", {
      residentId: args.residentId,
      teamId: args.teamId,
      organizationId: args.organizationId,
      completedBy: args.completedBy,
      jobRole: args.jobRole,
      date: args.date,
      residentName: args.residentName,
      bedroomNumber: args.bedroomNumber,
      weight: args.weight,
      weightBearing: args.weightBearing,
      transferBed: args.transferBed,
      transferChair: args.transferChair,
      walking: args.walking,
      toileting: args.toileting,
      movementInBed: args.movementInBed,
      bath: args.bath,
      outdoorMobility: args.outdoorMobility,
      createdBy: args.completedBy
    });

    // Schedule PDF generation
    await ctx.scheduler.runAfter(0, internal.careFiles.handlingProfile.generatePDFAndUpdateRecord, {
      profileId
    });

    return profileId;
  }
});

/**
 * Update an existing handling profile
 */
export const updateHandlingProfile = mutation({
  args: {
    profileId: v.id("residentHandlingProfileForm"),
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    completedBy: v.string(),
    jobRole: v.string(),
    date: v.number(),
    residentName: v.string(),
    bedroomNumber: v.string(),
    weight: v.number(),
    weightBearing: v.string(),
    transferBed: activitySchema,
    transferChair: activitySchema,
    walking: activitySchema,
    toileting: activitySchema,
    movementInBed: activitySchema,
    bath: activitySchema,
    outdoorMobility: activitySchema,
    userId: v.string(),
    savedAsDraft: v.optional(v.boolean())
  },
  returns: v.id("residentHandlingProfileForm"),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Verify profile exists
    const existingProfile = await ctx.db.get(args.profileId);
    if (!existingProfile) {
      throw new Error("Handling profile not found");
    }

    // Create a NEW version instead of patching the old one
    const newProfileId = await ctx.db.insert("residentHandlingProfileForm", {
      residentId: args.residentId,
      teamId: args.teamId,
      organizationId: args.organizationId,
      completedBy: args.completedBy,
      jobRole: args.jobRole,
      date: args.date,
      residentName: args.residentName,
      bedroomNumber: args.bedroomNumber,
      weight: args.weight,
      weightBearing: args.weightBearing,
      transferBed: args.transferBed,
      transferChair: args.transferChair,
      walking: args.walking,
      toileting: args.toileting,
      movementInBed: args.movementInBed,
      bath: args.bath,
      outdoorMobility: args.outdoorMobility,

      // Metadata
      status: args.savedAsDraft ? ("draft" as const) : ("submitted" as const),
      submittedAt: args.savedAsDraft ? undefined : now,
      createdBy: args.userId
    });

    // Regenerate PDF
    if (!args.savedAsDraft) {
      await ctx.scheduler.runAfter(0, internal.careFiles.handlingProfile.generatePDFAndUpdateRecord, {
        profileId: newProfileId
      });
    }

    return newProfileId;
  }
});

/**
 * Get all handling profiles for a resident
 */
export const getHandlingProfilesByResident = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.array(
    v.object({
      _id: v.id("residentHandlingProfileForm"),
      _creationTime: v.number(),
      residentId: v.id("residents"),
      teamId: v.string(),
      organizationId: v.string(),
      completedBy: v.string(),
      jobRole: v.string(),
      date: v.number(),
      residentName: v.string(),
      bedroomNumber: v.string(),
      weight: v.number(),
      weightBearing: v.string(),
      pdfFileId: v.optional(v.id("_storage"))
    })
  ),
  handler: async (ctx, args) => {
    const profiles = await ctx.db
      .query("residentHandlingProfileForm")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .collect();

    return profiles.map((profile) => ({
      _id: profile._id,
      _creationTime: profile._creationTime,
      residentId: profile.residentId,
      teamId: profile.teamId,
      organizationId: profile.organizationId,
      completedBy: profile.completedBy,
      jobRole: profile.jobRole,
      date: profile.date,
      residentName: profile.residentName,
      bedroomNumber: profile.bedroomNumber,
      weight: profile.weight,
      weightBearing: profile.weightBearing,
      pdfFileId: profile.pdfFileId
    }));
  }
});

/**
 * Get a single handling profile by ID
 */
export const getHandlingProfileById = query({
  args: {
    profileId: v.id("residentHandlingProfileForm")
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("residentHandlingProfileForm"),
      _creationTime: v.number(),
      residentId: v.id("residents"),
      teamId: v.string(),
      organizationId: v.string(),
      completedBy: v.string(),
      jobRole: v.string(),
      date: v.number(),
      residentName: v.string(),
      bedroomNumber: v.string(),
      weight: v.number(),
      weightBearing: v.string(),
      transferBed: activitySchema,
      transferChair: activitySchema,
      walking: activitySchema,
      toileting: activitySchema,
      movementInBed: activitySchema,
      bath: activitySchema,
      outdoorMobility: activitySchema,
      createdBy: v.optional(v.string()),
      lastModifiedAt: v.optional(v.number()),
      lastModifiedBy: v.optional(v.string()),
      pdfFileId: v.optional(v.id("_storage")),
      pdfUrl: v.optional(v.string())
    })
  ),
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      return null;
    }
    return profile;
  }
});

/**
 * Generate PDF and update the record with the file ID
 */
export const generatePDFAndUpdateRecord = internalAction({
  args: {
    profileId: v.id("residentHandlingProfileForm")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const pdfApiUrl = process.env.PDF_API_URL;
      const pdfApiToken = process.env.PDF_API_TOKEN;

      if (!pdfApiUrl?.startsWith("https://")) {
        console.warn(
          "PDF generation disabled: PDF_API_URL not set or not HTTPS"
        );
        return null;
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };

      if (pdfApiToken) {
        headers["Authorization"] = `Bearer ${pdfApiToken}`;
      }

      const pdfResponse = await fetch(
        `${pdfApiUrl}/api/pdf/resident-handling-profile`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ profileId: args.profileId })
        }
      );

      if (!pdfResponse.ok) {
        const errorText = await pdfResponse.text();
        throw new Error(
          `PDF generation failed: ${pdfResponse.status} ${pdfResponse.statusText} - ${errorText}`
        );
      }

      const pdfBuffer = await pdfResponse.arrayBuffer();
      const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });
      const storageId = await ctx.storage.store(pdfBlob);

      await ctx.runMutation(
        internal.careFiles.handlingProfile.updatePDFFileId,
        {
          profileId: args.profileId,
          pdfFileId: storageId
        }
      );
    } catch (error) {
      console.error("Error generating and saving PDF:", error);
    }

    return null;
  }
});

/**
 * Update a handling profile with PDF file ID
 */
export const updatePDFFileId = internalMutation({
  args: {
    profileId: v.id("residentHandlingProfileForm"),
    pdfFileId: v.id("_storage")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.profileId, {
      pdfFileId: args.pdfFileId
    });
    return null;
  }
});

/**
 * Delete a handling profile assessment
 */
export const deleteHandlingProfileAssessment = mutation({
  args: {
    assessmentId: v.id("residentHandlingProfileForm")
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
 * Get PDF URL for a handling profile
 */
export const getPDFUrl = query({
  args: {
    profileId: v.id("residentHandlingProfileForm")
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);

    if (!profile || !profile.pdfFileId) {
      return null;
    }

    return await ctx.storage.getUrl(profile.pdfFileId);
  }
});

/**
 * Get archived (non-latest) handling profile assessments for a resident
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
      .query("residentHandlingProfileForm")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    // Return all except the first one (the latest)
    return allAssessments.length > 1 ? allAssessments.slice(1) : [];
  }
});
