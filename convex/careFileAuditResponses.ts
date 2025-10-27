import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Validation schemas
const itemResponseValidator = v.object({
  itemId: v.string(),
  itemName: v.string(),
  status: v.optional(v.union(
    v.literal("compliant"),
    v.literal("non-compliant"),
    v.literal("not-applicable"),
    v.literal("checked"),
    v.literal("unchecked")
  )),
  notes: v.optional(v.string()),
  date: v.optional(v.string()),
});

// Create a new care file audit response (draft)
export const createResponse = mutation({
  args: {
    templateId: v.id("careFileAuditTemplates"),
    templateName: v.string(),
    residentId: v.id("residents"),
    residentName: v.string(),
    roomNumber: v.optional(v.string()),
    teamId: v.string(),
    organizationId: v.string(),
    auditedBy: v.string(),
    frequency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const responseId = await ctx.db.insert("careFileAuditCompletions", {
      templateId: args.templateId,
      templateName: args.templateName,
      residentId: args.residentId,
      residentName: args.residentName,
      roomNumber: args.roomNumber,
      teamId: args.teamId,
      organizationId: args.organizationId,
      items: [],
      status: "draft",
      auditedBy: args.auditedBy,
      auditedAt: Date.now(),
      frequency: args.frequency,
      createdAt: Date.now(),
    });

    return responseId;
  },
});

// Update care file audit response (save progress)
export const updateResponse = mutation({
  args: {
    responseId: v.id("careFileAuditCompletions"),
    items: v.array(itemResponseValidator),
    overallNotes: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("in-progress"),
      v.literal("completed")
    )),
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

// Complete a care file audit response
export const completeResponse = mutation({
  args: {
    responseId: v.id("careFileAuditCompletions"),
    items: v.array(itemResponseValidator),
    overallNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const response = await ctx.db.get(args.responseId);
    if (!response) {
      throw new Error("Care file audit response not found");
    }

    const now = Date.now();

    // Calculate next audit due date based on frequency
    let nextAuditDue: number | undefined;
    if (response.frequency) {
      const frequencyDays: { [key: string]: number } = {
        "3months": 90,
        "6months": 180,
        "yearly": 365,
      };
      const days = frequencyDays[response.frequency] || 180;
      nextAuditDue = now + days * 24 * 60 * 60 * 1000;
    }

    // Update the response
    await ctx.db.patch(args.responseId, {
      items: args.items,
      overallNotes: args.overallNotes,
      status: "completed",
      completedAt: now,
      nextAuditDue,
      updatedAt: now,
    });

    // Auto-archive old audits (keep only last 10 per resident)
    await archiveOldAudits(ctx, response.templateId, response.residentId);

    return args.responseId;
  },
});

// Helper function to archive audits beyond the last 10 for a specific resident
async function archiveOldAudits(
  ctx: any,
  templateId: string,
  residentId: string
) {
  // Get all completed audits for this template and resident, ordered by completion date
  const allAudits = await ctx.db
    .query("careFileAuditCompletions")
    .withIndex("by_template_and_resident", (q: any) =>
      q.eq("templateId", templateId).eq("residentId", residentId)
    )
    .filter((q: any) => q.eq(q.field("status"), "completed"))
    .collect();

  // Sort by completedAt descending (most recent first)
  const sortedAudits = allAudits.sort(
    (a: any, b: any) => (b.completedAt || 0) - (a.completedAt || 0)
  );

  // Delete audits beyond the 10th
  if (sortedAudits.length > 10) {
    const auditsToDelete = sortedAudits.slice(10);
    for (const audit of auditsToDelete) {
      await ctx.db.delete(audit._id);
    }
  }
}

// Get all responses for a template and resident (last 10)
export const getResponsesByTemplateAndResident = query({
  args: {
    templateId: v.id("careFileAuditTemplates"),
    residentId: v.id("residents"),
  },
  handler: async (ctx, args) => {
    const responses = await ctx.db
      .query("careFileAuditCompletions")
      .withIndex("by_template_and_resident", (q) =>
        q.eq("templateId", args.templateId).eq("residentId", args.residentId)
      )
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    // Sort by completion date descending (most recent first)
    return responses
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
      .slice(0, 10);
  },
});

// Get draft/in-progress responses for a template and resident
export const getDraftResponsesByTemplateAndResident = query({
  args: {
    templateId: v.id("careFileAuditTemplates"),
    residentId: v.id("residents"),
  },
  handler: async (ctx, args) => {
    const responses = await ctx.db
      .query("careFileAuditCompletions")
      .withIndex("by_template_and_resident", (q) =>
        q.eq("templateId", args.templateId).eq("residentId", args.residentId)
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "draft"),
          q.eq(q.field("status"), "in-progress")
        )
      )
      .collect();

    // Sort by creation date descending (most recent first)
    return responses.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },
});

// Get the latest response for a template and resident
export const getLatestResponseByTemplateAndResident = query({
  args: {
    templateId: v.id("careFileAuditTemplates"),
    residentId: v.id("residents"),
  },
  handler: async (ctx, args) => {
    const responses = await ctx.db
      .query("careFileAuditCompletions")
      .withIndex("by_template_and_resident", (q) =>
        q.eq("templateId", args.templateId).eq("residentId", args.residentId)
      )
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    // Sort by completion date descending and get the first one
    const sorted = responses.sort(
      (a, b) => (b.completedAt || 0) - (a.completedAt || 0)
    );

    return sorted.length > 0 ? sorted[0] : null;
  },
});

// Get a single response by ID
export const getResponseById = query({
  args: {
    responseId: v.id("careFileAuditCompletions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.responseId);
  },
});

// Helper to get templateId from a responseId (for navigation backwards compatibility)
// Returns the templateId if the ID is a valid responseId, null otherwise
export const getTemplateIdFromResponse = query({
  args: {
    possibleResponseId: v.string(), // Use string to accept any ID without validation
  },
  handler: async (ctx, args) => {
    try {
      // Try to get as a response ID
      const response = await ctx.db.get(args.possibleResponseId as any);
      // Check if it's actually a careFileAuditCompletions document by checking for templateId field
      if (response && "templateId" in response && typeof response.templateId === "string") {
        return response.templateId as any;
      }
      return null;
    } catch (error) {
      // If it fails, the ID is not a valid responseId
      return null;
    }
  },
});

// Get all responses for a resident (across all templates)
export const getResponsesByResident = query({
  args: {
    residentId: v.id("residents"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("careFileAuditCompletions")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .collect();
  },
});

// Get all in-progress or draft responses for a team
export const getDraftResponsesByTeam = query({
  args: {
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("careFileAuditCompletions")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "draft"),
          q.eq(q.field("status"), "in-progress")
        )
      )
      .collect();
  },
});

// Get overdue audits for a team
export const getOverdueAuditsByTeam = query({
  args: {
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const allResponses = await ctx.db
      .query("careFileAuditCompletions")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    // Filter for overdue audits
    return allResponses.filter(
      (response) => response.nextAuditDue && response.nextAuditDue < now
    );
  },
});

// Get upcoming audits for a team (due within next 7 days)
export const getUpcomingAuditsByTeam = query({
  args: {
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;

    const allResponses = await ctx.db
      .query("careFileAuditCompletions")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    // Filter for upcoming audits
    return allResponses.filter(
      (response) =>
        response.nextAuditDue &&
        response.nextAuditDue >= now &&
        response.nextAuditDue <= sevenDaysFromNow
    );
  },
});

// Get all latest completions for residents in a team (for listing page)
export const getAllLatestResponsesByTeam = query({
  args: {
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    const allCompletions = await ctx.db
      .query("careFileAuditCompletions")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    // Group by residentId and templateId to get the latest for each combination
    const latestByResidentAndTemplate = new Map();

    for (const completion of allCompletions) {
      const key = `${completion.residentId}-${completion.templateId}`;
      const existing = latestByResidentAndTemplate.get(key);
      if (!existing || (completion.completedAt || 0) > (existing.completedAt || 0)) {
        latestByResidentAndTemplate.set(key, completion);
      }
    }

    return Array.from(latestByResidentAndTemplate.values());
  },
});

// Delete a response
export const deleteResponse = mutation({
  args: {
    responseId: v.id("careFileAuditCompletions"),
  },
  handler: async (ctx, args) => {
    // Cascade delete: Remove all associated action plans first
    const actionPlans = await ctx.db
      .query("careFileAuditActionPlans")
      .withIndex("by_audit_response", (q) => q.eq("auditResponseId", args.responseId))
      .collect();

    for (const plan of actionPlans) {
      await ctx.db.delete(plan._id);
    }

    await ctx.db.delete(args.responseId);
    return args.responseId;
  },
});

// Clean up old draft responses (called by cron job)
export const cleanupOldDrafts = internalMutation({
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    // Find old drafts with no items or minimal activity
    const oldDrafts = await ctx.db
      .query("careFileAuditCompletions")
      .filter((q) =>
        q.and(
          q.or(
            q.eq(q.field("status"), "draft"),
            q.eq(q.field("status"), "in-progress")
          ),
          q.lt(q.field("createdAt"), thirtyDaysAgo)
        )
      )
      .collect();

    let deleted = 0;
    for (const draft of oldDrafts) {
      // Only delete if it has no items (empty audit)
      if (!draft.items || draft.items.length === 0) {
        // Delete associated action plans first (cascade delete)
        const actionPlans = await ctx.db
          .query("careFileAuditActionPlans")
          .withIndex("by_audit_response", (q) => q.eq("auditResponseId", draft._id))
          .collect();

        for (const plan of actionPlans) {
          await ctx.db.delete(plan._id);
        }

        await ctx.db.delete(draft._id);
        deleted++;
      }
    }

    console.log(`Cleaned up ${deleted} old care file audit draft responses`);
    return { deleted };
  },
});
