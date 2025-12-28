import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create or update diet information for a resident
export const createOrUpdateDiet = mutation({
  args: {
    residentId: v.id("residents"),
    dietTypes: v.optional(v.array(v.string())),
    otherDietType: v.optional(v.string()),
    culturalRestrictions: v.optional(v.string()),
    allergies: v.optional(v.array(v.object({
      allergy: v.string()
    }))),
    chokingRisk: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    foodConsistency: v.optional(v.union(
      v.literal("level7"),
      v.literal("level6"),
      v.literal("level5"),
      v.literal("level4"),
      v.literal("level3")
    )),
    fluidConsistency: v.optional(v.union(
      v.literal("level0"),
      v.literal("level1"),
      v.literal("level2"),
      v.literal("level3"),
      v.literal("level4")
    )),
    assistanceRequired: v.optional(v.union(v.literal("yes"), v.literal("no"))),
    chefNotified: v.optional(v.union(v.literal("yes"), v.literal("no"))),
    chefName: v.optional(v.string()),
    organizationId: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if diet information already exists for this resident
    const existing = await ctx.db
      .query("dietInformation")
      .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
      .first();

    if (existing) {
      // Update existing diet information
      await ctx.db.patch(existing._id, {
        dietTypes: args.dietTypes,
        otherDietType: args.otherDietType,
        culturalRestrictions: args.culturalRestrictions,
        allergies: args.allergies,
        chokingRisk: args.chokingRisk,
        foodConsistency: args.foodConsistency,
        fluidConsistency: args.fluidConsistency,
        assistanceRequired: args.assistanceRequired,
        chefNotified: args.chefNotified,
        chefName: args.chefName,
        updatedBy: args.createdBy,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new diet information
      const dietId = await ctx.db.insert("dietInformation", {
        residentId: args.residentId,
        dietTypes: args.dietTypes,
        otherDietType: args.otherDietType,
        culturalRestrictions: args.culturalRestrictions,
        allergies: args.allergies,
        chokingRisk: args.chokingRisk,
        foodConsistency: args.foodConsistency,
        fluidConsistency: args.fluidConsistency,
        assistanceRequired: args.assistanceRequired,
        chefNotified: args.chefNotified,
        chefName: args.chefName,
        organizationId: args.organizationId,
        createdBy: args.createdBy,
        createdAt: now,
      });
      return dietId;
    }
  },
});

// Get diet information for a resident
export const getDietByResidentId = query({
  args: { residentId: v.id("residents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dietInformation")
      .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
      .first();
  },
});

// Get all diet records for an organization
export const getDietsByOrganization = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dietInformation")
      .withIndex("byOrganizationId", (q) => q.eq("organizationId", args.organizationId))
      .collect();
  },
});

// Delete diet information for a resident
export const deleteDiet = mutation({
  args: { residentId: v.id("residents") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dietInformation")
      .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return true;
    }
    return false;
  },
});