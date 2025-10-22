import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Validation schemas for questions
const questionValidator = v.object({
  id: v.string(),
  text: v.string(),
  type: v.union(v.literal("compliance"), v.literal("yesno")),
});

// Create a new audit template
export const createTemplate = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    category: v.union(
      v.literal("resident"),
      v.literal("carefile"),
      v.literal("governance"),
      v.literal("clinical"),
      v.literal("environment")
    ),
    questions: v.array(questionValidator),
    frequency: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("quarterly"),
      v.literal("yearly"),
      v.literal("adhoc")
    ),
    teamId: v.string(),
    organizationId: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const templateId = await ctx.db.insert("residentAuditTemplates", {
      name: args.name,
      description: args.description,
      category: args.category,
      questions: args.questions,
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

// Update an existing audit template
export const updateTemplate = mutation({
  args: {
    templateId: v.id("residentAuditTemplates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    questions: v.optional(v.array(questionValidator)),
    frequency: v.optional(
      v.union(
        v.literal("daily"),
        v.literal("weekly"),
        v.literal("monthly"),
        v.literal("quarterly"),
        v.literal("yearly"),
        v.literal("adhoc")
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

// Get all templates for a team by category
export const getTemplatesByTeamAndCategory = query({
  args: {
    teamId: v.string(),
    category: v.union(
      v.literal("resident"),
      v.literal("carefile"),
      v.literal("governance"),
      v.literal("clinical"),
      v.literal("environment")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("residentAuditTemplates")
      .withIndex("by_team_and_category", (q) =>
        q.eq("teamId", args.teamId).eq("category", args.category)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Get all templates for an organization by category (shared across all teams)
export const getTemplatesByOrganizationAndCategory = query({
  args: {
    organizationId: v.string(),
    category: v.union(
      v.literal("resident"),
      v.literal("carefile"),
      v.literal("governance"),
      v.literal("clinical"),
      v.literal("environment")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("residentAuditTemplates")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("isActive"), true),
          q.eq(q.field("category"), args.category)
        )
      )
      .collect();
  },
});

// Get a single template by ID
export const getTemplateById = query({
  args: {
    templateId: v.id("residentAuditTemplates"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.templateId);
  },
});

// Get all active templates for a team
export const getTemplatesByTeam = query({
  args: {
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("residentAuditTemplates")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Archive a template (soft delete)
export const archiveTemplate = mutation({
  args: {
    templateId: v.id("residentAuditTemplates"),
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
    templateId: v.id("residentAuditTemplates"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.templateId);
    return args.templateId;
  },
});
