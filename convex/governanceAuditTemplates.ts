import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get all active governance audit templates for an organization
export const getActiveTemplates = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const templates = await ctx.db
      .query("governanceAuditTemplates")
      .withIndex("by_organization_and_active", (q) =>
        q.eq("organizationId", args.organizationId).eq("isActive", true)
      )
      .collect();

    return templates;
  },
});

// Get a specific template by ID
export const getTemplateById = query({
  args: {
    templateId: v.id("governanceAuditTemplates"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    return template;
  },
});

// Create a new governance audit template
export const createTemplate = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    items: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        type: v.union(
          v.literal("compliance"),
          v.literal("checkbox"),
          v.literal("notes")
        ),
      })
    ),
    frequency: v.union(
      v.literal("monthly"),
      v.literal("quarterly"),
      v.literal("6months"),
      v.literal("yearly")
    ),
    organizationId: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const templateId = await ctx.db.insert("governanceAuditTemplates", {
      name: args.name,
      description: args.description,
      category: "governance",
      items: args.items,
      frequency: args.frequency,
      isActive: true,
      organizationId: args.organizationId,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });

    return templateId;
  },
});

// Update an existing template
export const updateTemplate = mutation({
  args: {
    templateId: v.id("governanceAuditTemplates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    items: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          type: v.union(
            v.literal("compliance"),
            v.literal("checkbox"),
            v.literal("notes")
          ),
        })
      )
    ),
    frequency: v.optional(
      v.union(
        v.literal("monthly"),
        v.literal("quarterly"),
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

// Delete (deactivate) a template
export const deleteTemplate = mutation({
  args: {
    templateId: v.id("governanceAuditTemplates"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.templateId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return args.templateId;
  },
});
