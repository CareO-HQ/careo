import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get all active environment audit templates for an organization
export const getActiveTemplates = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const templates = await ctx.db
      .query("environmentAuditTemplates")
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
    templateId: v.id("environmentAuditTemplates"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    return template;
  },
});

// Create a new environment audit template
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
    const templateId = await ctx.db.insert("environmentAuditTemplates", {
      name: args.name,
      description: args.description,
      category: "environment",
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
    templateId: v.id("environmentAuditTemplates"),
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

// Get deletion impact (how many items will be deleted)
export const getDeletionImpact = query({
  args: {
    templateId: v.id("environmentAuditTemplates"),
  },
  handler: async (ctx, args) => {
    // Count audit responses
    const responses = await ctx.db
      .query("environmentAuditCompletions")
      .withIndex("by_template", (q) => q.eq("templateId", args.templateId))
      .collect();

    // Count action plans
    const actionPlans = await ctx.db
      .query("environmentAuditActionPlans")
      .withIndex("by_template", (q) => q.eq("templateId", args.templateId))
      .collect();

    return {
      auditCount: responses.length,
      actionPlanCount: actionPlans.length,
    };
  },
});

// Delete a template permanently with cascade
export const deleteTemplate = mutation({
  args: {
    templateId: v.id("environmentAuditTemplates"),
  },
  handler: async (ctx, args) => {
    // First, delete all action plans for this template
    const actionPlans = await ctx.db
      .query("environmentAuditActionPlans")
      .withIndex("by_template", (q) => q.eq("templateId", args.templateId))
      .collect();

    for (const plan of actionPlans) {
      await ctx.db.delete(plan._id);
    }

    // Then, delete all audit responses for this template
    const responses = await ctx.db
      .query("environmentAuditCompletions")
      .withIndex("by_template", (q) => q.eq("templateId", args.templateId))
      .collect();

    for (const response of responses) {
      await ctx.db.delete(response._id);
    }

    // Finally, delete the template itself
    await ctx.db.delete(args.templateId);

    return {
      templateId: args.templateId,
      deletedActionPlans: actionPlans.length,
      deletedResponses: responses.length,
    };
  },
});
