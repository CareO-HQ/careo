import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Validation schemas
const answerValidator = v.object({
  questionId: v.string(),
  value: v.optional(v.string()),
  notes: v.optional(v.string()),
});

const responseValidator = v.object({
  residentId: v.string(),
  residentName: v.string(),
  roomNumber: v.optional(v.string()),
  answers: v.array(answerValidator),
  date: v.optional(v.string()),
  comment: v.optional(v.string()),
});

// Create a new audit response (draft)
export const createResponse = mutation({
  args: {
    templateId: v.id("residentAuditTemplates"),
    templateName: v.string(),
    category: v.string(),
    teamId: v.string(),
    organizationId: v.string(),
    auditedBy: v.string(),
    frequency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const responseId = await ctx.db.insert("residentAuditCompletions", {
      templateId: args.templateId,
      templateName: args.templateName,
      category: args.category,
      teamId: args.teamId,
      organizationId: args.organizationId,
      responses: [],
      status: "draft",
      auditedBy: args.auditedBy,
      auditedAt: Date.now(),
      frequency: args.frequency,
      createdAt: Date.now(),
    });

    return responseId;
  },
});

// Update audit response (save progress)
export const updateResponse = mutation({
  args: {
    responseId: v.id("residentAuditCompletions"),
    responses: v.array(responseValidator),
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

// Complete an audit response
export const completeResponse = mutation({
  args: {
    responseId: v.id("residentAuditCompletions"),
    responses: v.array(responseValidator),
  },
  handler: async (ctx, args) => {
    const response = await ctx.db.get(args.responseId);
    if (!response) {
      throw new Error("Audit response not found");
    }

    const now = Date.now();

    // Calculate next audit due date based on frequency
    let nextAuditDue: number | undefined;
    if (response.frequency) {
      const frequencyDays: { [key: string]: number } = {
        daily: 1,
        weekly: 7,
        monthly: 30,
        quarterly: 90,
        yearly: 365,
      };
      const days = frequencyDays[response.frequency] || 30;
      nextAuditDue = now + days * 24 * 60 * 60 * 1000;
    }

    // Update the response
    await ctx.db.patch(args.responseId, {
      responses: args.responses,
      status: "completed",
      completedAt: now,
      nextAuditDue,
      updatedAt: now,
    });

    // Auto-archive old audits (keep only last 10)
    await archiveOldAudits(ctx, response.templateId, response.teamId);

    return args.responseId;
  },
});

// Helper function to archive audits beyond the last 10
async function archiveOldAudits(
  ctx: any,
  templateId: string,
  teamId: string
) {
  // Get all completed audits for this template and team, ordered by completion date
  const allAudits = await ctx.db
    .query("residentAuditCompletions")
    .withIndex("by_template_and_team", (q: any) =>
      q.eq("templateId", templateId).eq("teamId", teamId)
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

// Get all responses for a template (last 10)
export const getResponsesByTemplate = query({
  args: {
    templateId: v.id("residentAuditTemplates"),
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    const responses = await ctx.db
      .query("residentAuditCompletions")
      .withIndex("by_template_and_team", (q) =>
        q.eq("templateId", args.templateId).eq("teamId", args.teamId)
      )
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    // Sort by completion date descending (most recent first)
    return responses
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
      .slice(0, 10);
  },
});

// Get the latest response for a template
export const getLatestResponse = query({
  args: {
    templateId: v.id("residentAuditTemplates"),
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    const responses = await ctx.db
      .query("residentAuditCompletions")
      .withIndex("by_template_and_team", (q) =>
        q.eq("templateId", args.templateId).eq("teamId", args.teamId)
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
    responseId: v.id("residentAuditCompletions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.responseId);
  },
});

// Get all in-progress or draft responses for a team
export const getDraftResponsesByTeam = query({
  args: {
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("residentAuditCompletions")
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

// Get overdue audits
export const getOverdueAudits = query({
  args: {
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const allResponses = await ctx.db
      .query("residentAuditCompletions")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    // Filter for overdue audits
    return allResponses.filter(
      (response) => response.nextAuditDue && response.nextAuditDue < now
    );
  },
});

// Get upcoming audits (due within next 7 days)
export const getUpcomingAudits = query({
  args: {
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;

    const allResponses = await ctx.db
      .query("residentAuditCompletions")
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

// Get all latest completions for a team (for listing page)
export const getAllLatestResponsesByTeam = query({
  args: {
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    const allCompletions = await ctx.db
      .query("residentAuditCompletions")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    // Group by templateId and get the latest for each
    const latestByTemplate = new Map();

    for (const completion of allCompletions) {
      const existing = latestByTemplate.get(completion.templateId);
      if (!existing || (completion.completedAt || 0) > (existing.completedAt || 0)) {
        latestByTemplate.set(completion.templateId, completion);
      }
    }

    return Array.from(latestByTemplate.values());
  },
});

// Delete a response
export const deleteResponse = mutation({
  args: {
    responseId: v.id("residentAuditCompletions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.responseId);
    return args.responseId;
  },
});
