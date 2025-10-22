import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new night check configuration
export const create = mutation({
  args: {
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    checkType: v.union(
      v.literal("night_check"),
      v.literal("positioning"),
      v.literal("pad_change"),
      v.literal("bed_rails"),
      v.literal("environmental"),
      v.literal("night_note"),
      v.literal("cleaning")
    ),
    frequencyMinutes: v.optional(v.number()),
    selectedItems: v.optional(v.array(v.string())),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const configId = await ctx.db.insert("nightCheckConfigurations", {
      residentId: args.residentId,
      teamId: args.teamId,
      organizationId: args.organizationId,
      checkType: args.checkType,
      frequencyMinutes: args.frequencyMinutes,
      selectedItems: args.selectedItems,
      isActive: true,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });

    return configId;
  },
});

// Update an existing night check configuration
export const update = mutation({
  args: {
    configId: v.id("nightCheckConfigurations"),
    frequencyMinutes: v.optional(v.number()),
    selectedItems: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const { configId, updatedBy, ...updates } = args;

    await ctx.db.patch(configId, {
      ...updates,
      updatedBy,
      updatedAt: Date.now(),
    });

    return configId;
  },
});

// Delete (soft delete) a night check configuration
export const remove = mutation({
  args: {
    configId: v.id("nightCheckConfigurations"),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.configId, {
      isActive: false,
      updatedBy: args.updatedBy,
      updatedAt: Date.now(),
    });

    return args.configId;
  },
});

// Get all active configurations for a resident
export const getByResident = query({
  args: {
    residentId: v.id("residents"),
  },
  handler: async (ctx, args) => {
    const configs = await ctx.db
      .query("nightCheckConfigurations")
      .withIndex("by_resident_active", (q) =>
        q.eq("residentId", args.residentId).eq("isActive", true)
      )
      .collect();

    return configs;
  },
});

// Get all configurations for a team
export const getByTeam = query({
  args: {
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    const configs = await ctx.db
      .query("nightCheckConfigurations")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return configs;
  },
});

// Get all configurations for an organization
export const getByOrganization = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const configs = await ctx.db
      .query("nightCheckConfigurations")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return configs;
  },
});

// Get a specific configuration by ID
export const getById = query({
  args: {
    configId: v.id("nightCheckConfigurations"),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db.get(args.configId);
    return config;
  },
});
