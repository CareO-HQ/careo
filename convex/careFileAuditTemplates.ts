import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Validation schemas for care file audit items
const itemValidator = v.object({
  id: v.string(),
  name: v.string(),
  type: v.union(
    v.literal("compliance"),
    v.literal("checkbox"),
    v.literal("notes")
  ),
});

// Create a new care file audit template
export const createTemplate = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    items: v.array(itemValidator),
    frequency: v.union(
      v.literal("3months"),
      v.literal("6months"),
      v.literal("yearly")
    ),
    teamId: v.string(),
    organizationId: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const templateId = await ctx.db.insert("careFileAuditTemplates", {
      name: args.name,
      description: args.description,
      category: "carefile", // Fixed category
      items: args.items,
      frequency: args.frequency,
      isActive: true,
      teamId: args.teamId,
      organizationId: args.organizationId,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });

    return templateId;
  },
});

// Update an existing care file audit template
export const updateTemplate = mutation({
  args: {
    templateId: v.id("careFileAuditTemplates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    items: v.optional(v.array(itemValidator)),
    frequency: v.optional(
      v.union(
        v.literal("3months"),
        v.literal("6months"),
        v.literal("yearly")
      )
    ),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { templateId, ...updates } = args;

    await ctx.db.patch(templateId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return templateId;
  },
});

// Get all templates for a team
export const getTemplatesByTeam = query({
  args: {
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("careFileAuditTemplates")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Get all templates for an organization (shared across all teams)
export const getTemplatesByOrganization = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("careFileAuditTemplates")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Get a single template by ID
export const getTemplateById = query({
  args: {
    templateId: v.id("careFileAuditTemplates"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.templateId);
  },
});

// Archive a template (soft delete)
export const archiveTemplate = mutation({
  args: {
    templateId: v.id("careFileAuditTemplates"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.templateId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return args.templateId;
  },
});

// Delete a template permanently
export const deleteTemplate = mutation({
  args: {
    templateId: v.id("careFileAuditTemplates"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.templateId);
    return args.templateId;
  },
});
