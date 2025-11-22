import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction, internalMutation, query } from "../_generated/server";

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
