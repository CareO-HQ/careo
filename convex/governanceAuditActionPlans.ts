import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get all action plans for an audit response
export const getActionPlansByAudit = query({
  args: {
    auditResponseId: v.id("governanceAuditCompletions"),
  },
  handler: async (ctx, args) => {
    const actionPlans = await ctx.db
      .query("governanceAuditActionPlans")
      .withIndex("by_audit_response", (q) =>
        q.eq("auditResponseId", args.auditResponseId)
      )
      .collect();

    return actionPlans;
  },
});

// Get action plans by template (all audits for this template)
export const getActionPlansByTemplate = query({
  args: {
    templateId: v.id("governanceAuditTemplates"),
  },
  handler: async (ctx, args) => {
    const actionPlans = await ctx.db
      .query("governanceAuditActionPlans")
      .withIndex("by_template", (q) => q.eq("templateId", args.templateId))
      .collect();

    return actionPlans;
  },
});

// Get action plans assigned to a user
export const getActionPlansByAssignee = query({
  args: {
    assignedTo: v.string(),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const actionPlans = await ctx.db
      .query("governanceAuditActionPlans")
      .withIndex("by_assigned_to", (q) => q.eq("assignedTo", args.assignedTo))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .collect();

    return actionPlans;
  },
});

// Count action plans for a specific audit (for notification badge)
export const countActionPlansByAudit = query({
  args: {
    auditResponseId: v.id("governanceAuditCompletions"),
  },
  handler: async (ctx, args) => {
    const actionPlans = await ctx.db
      .query("governanceAuditActionPlans")
      .withIndex("by_audit_response", (q) =>
        q.eq("auditResponseId", args.auditResponseId)
      )
      .collect();

    return actionPlans.length;
  },
});

// Create a new action plan
export const createActionPlan = mutation({
  args: {
    auditResponseId: v.id("governanceAuditCompletions"),
    templateId: v.id("governanceAuditTemplates"),
    description: v.string(),
    assignedTo: v.string(),
    assignedToName: v.optional(v.string()),
    priority: v.union(v.literal("Low"), v.literal("Medium"), v.literal("High")),
    dueDate: v.optional(v.number()),
    organizationId: v.string(),
    createdBy: v.string(),
    createdByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actionPlanId = await ctx.db.insert("governanceAuditActionPlans", {
      auditResponseId: args.auditResponseId,
      templateId: args.templateId,
      description: args.description,
      assignedTo: args.assignedTo,
      assignedToName: args.assignedToName,
      priority: args.priority,
      dueDate: args.dueDate,
      status: "pending",
      isNew: true,
      organizationId: args.organizationId,
      createdBy: args.createdBy,
      createdByName: args.createdByName,
      createdAt: Date.now(),
    });

    return actionPlanId;
  },
});

// Update action plan status
export const updateActionPlanStatus = mutation({
  args: {
    actionPlanId: v.id("governanceAuditActionPlans"),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("overdue")
    ),
    comment: v.optional(v.string()),
    updatedBy: v.string(),
    updatedByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { actionPlanId, status, comment, updatedBy, updatedByName } = args;

    // Get existing action plan
    const actionPlan = await ctx.db.get(actionPlanId);
    if (!actionPlan) {
      throw new Error("Action plan not found");
    }

    // Add to status history
    const statusHistory = actionPlan.statusHistory || [];
    statusHistory.push({
      status,
      comment,
      updatedBy,
      updatedByName,
      updatedAt: Date.now(),
    });

    // Update action plan
    await ctx.db.patch(actionPlanId, {
      status,
      statusHistory,
      latestComment: comment,
      completedAt: status === "completed" ? Date.now() : undefined,
      updatedAt: Date.now(),
    });

    return actionPlanId;
  },
});

// Update action plan details
export const updateActionPlan = mutation({
  args: {
    actionPlanId: v.id("governanceAuditActionPlans"),
    description: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    assignedToName: v.optional(v.string()),
    priority: v.optional(
      v.union(v.literal("Low"), v.literal("Medium"), v.literal("High"))
    ),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { actionPlanId, ...updates } = args;

    await ctx.db.patch(actionPlanId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return actionPlanId;
  },
});

// Mark action plan as viewed
export const markActionPlanAsViewed = mutation({
  args: {
    actionPlanId: v.id("governanceAuditActionPlans"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.actionPlanId, {
      isNew: false,
      viewedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return args.actionPlanId;
  },
});

// Delete an action plan
export const deleteActionPlan = mutation({
  args: {
    actionPlanId: v.id("governanceAuditActionPlans"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.actionPlanId);
    return args.actionPlanId;
  },
});
