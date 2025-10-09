import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create or update personal interests for a resident
export const createOrUpdatePersonalInterests = mutation({
  args: {
    residentId: v.id("residents"),
    mainInterests: v.optional(v.array(v.string())),
    hobbies: v.optional(v.array(v.string())),
    socialPreferences: v.optional(v.array(v.string())),
    favoriteActivities: v.optional(v.array(v.string())),
    organizationId: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if personal interests already exist for this resident
    const existing = await ctx.db
      .query("personalInterests")
      .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
      .first();

    if (existing) {
      // Update existing personal interests
      await ctx.db.patch(existing._id, {
        mainInterests: args.mainInterests,
        hobbies: args.hobbies,
        socialPreferences: args.socialPreferences,
        favoriteActivities: args.favoriteActivities,
        updatedBy: args.createdBy,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new personal interests
      const interestsId = await ctx.db.insert("personalInterests", {
        residentId: args.residentId,
        mainInterests: args.mainInterests,
        hobbies: args.hobbies,
        socialPreferences: args.socialPreferences,
        favoriteActivities: args.favoriteActivities,
        organizationId: args.organizationId,
        createdBy: args.createdBy,
        createdAt: now,
      });
      return interestsId;
    }
  },
});

// Get personal interests for a resident
export const getPersonalInterestsByResidentId = query({
  args: { residentId: v.id("residents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("personalInterests")
      .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
      .first();
  },
});

// Get all personal interests for an organization
export const getPersonalInterestsByOrganization = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("personalInterests")
      .withIndex("byOrganizationId", (q) => q.eq("organizationId", args.organizationId))
      .collect();
  },
});

// Delete personal interests for a resident
export const deletePersonalInterests = mutation({
  args: { residentId: v.id("residents") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("personalInterests")
      .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return true;
    }
    return false;
  },
});
