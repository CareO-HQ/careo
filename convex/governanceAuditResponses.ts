import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get or create draft response for a template
export const getOrCreateDraft = mutation({
  args: {
    templateId: v.id("governanceAuditTemplates"),
    organizationId: v.string(),
    auditedBy: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if draft already exists
    const existingDraft = await ctx.db
      .query("governanceAuditCompletions")
      .withIndex("by_template_and_organization", (q) =>
        q.eq("templateId", args.templateId).eq("organizationId", args.organizationId)
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "draft"),
          q.eq(q.field("status"), "in-progress")
        )
      )
      .first();

    if (existingDraft) {
      return existingDraft._id;
    }

    // Get template to initialize response
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Create new draft
    const responseId = await ctx.db.insert("governanceAuditCompletions", {
      templateId: args.templateId,
      templateName: template.name,
      organizationId: args.organizationId,
      items: [], // Empty initially
      status: "draft",
      auditedBy: args.auditedBy,
      auditedAt: Date.now(),
      frequency: template.frequency,
      createdAt: Date.now(),
    });

    return responseId;
  },
});

// Get a response by ID
export const getResponseById = query({
  args: {
    responseId: v.id("governanceAuditCompletions"),
  },
  handler: async (ctx, args) => {
    const response = await ctx.db.get(args.responseId);
    return response;
  },
});

// Get all completed responses for a template (last 10)
export const getCompletedResponsesByTemplate = query({
  args: {
    templateId: v.id("governanceAuditTemplates"),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const responses = await ctx.db
      .query("governanceAuditCompletions")
      .withIndex("by_template_and_organization", (q) =>
        q.eq("templateId", args.templateId).eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("status"), "completed"))
      .order("desc")
      .take(10);

    return responses;
  },
});

// Get draft/in-progress responses for a template
export const getDraftResponsesByTemplate = query({
  args: {
    templateId: v.id("governanceAuditTemplates"),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const responses = await ctx.db
      .query("governanceAuditCompletions")
      .withIndex("by_template_and_organization", (q) =>
        q.eq("templateId", args.templateId).eq("organizationId", args.organizationId)
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "draft"),
          q.eq(q.field("status"), "in-progress")
        )
      )
      .order("desc")
      .collect();

    return responses;
  },
});

// Get the latest completion for a template
export const getLatestCompletionByTemplate = query({
  args: {
    templateId: v.id("governanceAuditTemplates"),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const latestCompletion = await ctx.db
      .query("governanceAuditCompletions")
      .withIndex("by_template_and_organization", (q) =>
        q.eq("templateId", args.templateId).eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("status"), "completed"))
      .order("desc")
      .first();

    return latestCompletion;
  },
});

// Get all latest completions for all templates in an organization
export const getAllLatestCompletionsByOrganization = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all completions for this organization
    const allCompletions = await ctx.db
      .query("governanceAuditCompletions")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("status"), "completed"))
      .order("desc")
      .collect();

    // Group by templateId and get the latest one for each
    const latestByTemplate = new Map();
    for (const completion of allCompletions) {
      const templateId = completion.templateId;
      if (!latestByTemplate.has(templateId)) {
        latestByTemplate.set(templateId, completion);
      }
    }

    return Array.from(latestByTemplate.values());
  },
});

// Update response (auto-save)
export const updateResponse = mutation({
  args: {
    responseId: v.id("governanceAuditCompletions"),
    items: v.array(
      v.object({
        itemId: v.string(),
        itemName: v.string(),
        status: v.optional(
          v.union(
            v.literal("compliant"),
            v.literal("non-compliant"),
            v.literal("not-applicable"),
            v.literal("checked"),
            v.literal("unchecked")
          )
        ),
        notes: v.optional(v.string()),
        date: v.optional(v.string()),
      })
    ),
    overallNotes: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("in-progress"),
      v.literal("completed")
    ),
  },
  handler: async (ctx, args) => {
    const { responseId, ...updates } = args;

    await ctx.db.patch(responseId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return responseId;
  },
});

// Complete audit
export const completeAudit = mutation({
  args: {
    responseId: v.id("governanceAuditCompletions"),
    items: v.array(
      v.object({
        itemId: v.string(),
        itemName: v.string(),
        status: v.optional(
          v.union(
            v.literal("compliant"),
            v.literal("non-compliant"),
            v.literal("not-applicable"),
            v.literal("checked"),
            v.literal("unchecked")
          )
        ),
        notes: v.optional(v.string()),
        date: v.optional(v.string()),
      })
    ),
    overallNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { responseId, items, overallNotes } = args;

    // Get the response to calculate next due date
    const response = await ctx.db.get(responseId);
    if (!response) {
      throw new Error("Response not found");
    }

    // Calculate next audit due date based on frequency
    let nextAuditDue: number | undefined;
    const now = Date.now();

    if (response.frequency) {
      switch (response.frequency) {
        case "monthly":
          nextAuditDue = now + 30 * 24 * 60 * 60 * 1000; // 30 days
          break;
        case "quarterly":
          nextAuditDue = now + 90 * 24 * 60 * 60 * 1000; // 90 days
          break;
        case "6months":
          nextAuditDue = now + 180 * 24 * 60 * 60 * 1000; // 180 days
          break;
        case "yearly":
          nextAuditDue = now + 365 * 24 * 60 * 60 * 1000; // 365 days
          break;
      }
    }

    // Mark response as completed
    await ctx.db.patch(responseId, {
      items,
      overallNotes,
      status: "completed",
      completedAt: now,
      nextAuditDue,
      updatedAt: now,
    });

    return responseId;
  },
});

// Delete a response (for draft cleanup)
export const deleteResponse = mutation({
  args: {
    responseId: v.id("governanceAuditCompletions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.responseId);
    return args.responseId;
  },
});

// Helper: Get template ID from response ID (for backwards compatibility)
export const getTemplateIdFromResponse = query({
  args: {
    possibleResponseId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const response = await ctx.db.get(args.possibleResponseId as any);
      if (response && "templateId" in response && typeof response.templateId === "string") {
        return response.templateId as any;
      }
      return null;
    } catch (error) {
      return null;
    }
  },
});
