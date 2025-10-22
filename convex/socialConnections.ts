import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new social connection
export const createSocialConnection = mutation({
  args: {
    residentId: v.id("residents"),
    name: v.string(),
    relationship: v.string(),
    type: v.union(
      v.literal("family"),
      v.literal("friend"),
      v.literal("staff"),
      v.literal("other")
    ),
    contactFrequency: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
    organizationId: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const connectionId = await ctx.db.insert("socialConnections", {
      residentId: args.residentId,
      name: args.name,
      relationship: args.relationship,
      type: args.type,
      contactFrequency: args.contactFrequency,
      phone: args.phone,
      email: args.email,
      notes: args.notes,
      organizationId: args.organizationId,
      createdBy: args.createdBy,
      createdAt: now,
    });

    return connectionId;
  },
});

// Get all social connections for a resident
export const getSocialConnectionsByResidentId = query({
  args: {
    residentId: v.id("residents"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("socialConnections")
      .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();
  },
});

// Get social connections by type for a resident
export const getSocialConnectionsByType = query({
  args: {
    residentId: v.id("residents"),
    type: v.union(
      v.literal("family"),
      v.literal("friend"),
      v.literal("staff"),
      v.literal("other")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("socialConnections")
      .withIndex("byType", (q) =>
        q.eq("residentId", args.residentId).eq("type", args.type)
      )
      .order("desc")
      .collect();
  },
});

// Get all social connections for an organization
export const getSocialConnectionsByOrganization = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("socialConnections")
      .withIndex("byOrganizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .collect();
  },
});

// Update a social connection
export const updateSocialConnection = mutation({
  args: {
    connectionId: v.id("socialConnections"),
    name: v.optional(v.string()),
    relationship: v.optional(v.string()),
    type: v.optional(
      v.union(
        v.literal("family"),
        v.literal("friend"),
        v.literal("staff"),
        v.literal("other")
      )
    ),
    contactFrequency: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const { connectionId, updatedBy, ...updates } = args;

    const cleanedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    await ctx.db.patch(connectionId, {
      ...cleanedUpdates,
      updatedBy,
      updatedAt: Date.now(),
    });

    return connectionId;
  },
});

// Delete a social connection
export const deleteSocialConnection = mutation({
  args: {
    connectionId: v.id("socialConnections"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.connectionId);
    return true;
  },
});

// Get a single social connection by ID
export const getSocialConnectionById = query({
  args: {
    connectionId: v.id("socialConnections"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.connectionId);
  },
});
