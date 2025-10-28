import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get or create a draft response for a template
export const getOrCreateDraft = mutation({
  args: {
    templateId: v.id("clinicalAuditTemplates"),
    organizationId: v.string(),
    auditedBy: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if there's an existing draft for this template
    const existingDraft = await ctx.db
      .query("clinicalAuditCompletions")
      .withIndex("by_template_and_organization", (q) =>
        q.eq("templateId", args.templateId).eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("status"), "draft"))
      .first();

    if (existingDraft) {
      return existingDraft._id;
    }

    // Get template to copy name
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Create new draft
    const draftId = await ctx.db.insert("clinicalAuditCompletions", {
      templateId: args.templateId,
      templateName: template.name,
      organizationId: args.organizationId,
      items: [],
      status: "draft",
      auditedBy: args.auditedBy,
      auditedAt: Date.now(),
      createdAt: Date.now(),
    });

    return draftId;
  },
});

// Get a specific response by ID
export const getResponseById = query({
  args: {
    responseId: v.id("clinicalAuditCompletions"),
  },
  handler: async (ctx, args) => {
    const response = await ctx.db.get(args.responseId);
    return response;
  },
});

// Update a response (auto-save)
export const updateResponse = mutation({
  args: {
    responseId: v.id("clinicalAuditCompletions"),
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
    status: v.union(
      v.literal("draft"),
      v.literal("in-progress"),
      v.literal("completed")
    ),
    overallNotes: v.optional(v.string()),
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

// Complete an audit
export const completeAudit = mutation({
  args: {
    responseId: v.id("clinicalAuditCompletions"),
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

    // Get the current response to access template
    const response = await ctx.db.get(responseId);
    if (!response) {
      throw new Error("Response not found");
    }

    // Get template to calculate next audit due
    const template = await ctx.db.get(response.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Calculate next audit due date based on frequency
    const now = Date.now();
    const frequencyDays: { [key: string]: number } = {
      monthly: 30,
      quarterly: 90,
      "6months": 180,
      yearly: 365,
    };
    const days = frequencyDays[template.frequency] || 30;
    const nextAuditDue = now + days * 24 * 60 * 60 * 1000;

    await ctx.db.patch(responseId, {
      items,
      overallNotes,
      status: "completed",
      completedAt: now,
      nextAuditDue,
      frequency: template.frequency,
      updatedAt: now,
    });

    return responseId;
  },
});
