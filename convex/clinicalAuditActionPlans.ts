import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get action plans for a specific audit response
export const getActionPlansByAudit = query({
  args: {
    auditResponseId: v.id("clinicalAuditCompletions"),
  },
  handler: async (ctx, args) => {
    const actionPlans = await ctx.db
      .query("clinicalAuditActionPlans")
      .withIndex("by_audit_response", (q) =>
        q.eq("auditResponseId", args.auditResponseId)
      )
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
      .query("clinicalAuditActionPlans")
      .withIndex("by_assigned_to", (q) => q.eq("assignedTo", args.assignedTo))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .collect();

    return actionPlans;
  },
});

// Create a new action plan
export const createActionPlan = mutation({
  args: {
    auditResponseId: v.id("clinicalAuditCompletions"),
    templateId: v.id("clinicalAuditTemplates"),
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
    const actionPlanId = await ctx.db.insert("clinicalAuditActionPlans", {
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
    actionPlanId: v.id("clinicalAuditActionPlans"),
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

    await ctx.db.patch(actionPlanId, {
      status,
      latestComment: comment,
      statusHistory,
      completedAt: status === "completed" ? Date.now() : undefined,
      updatedAt: Date.now(),
    });

    return actionPlanId;
  },
});

// Delete an action plan
export const deleteActionPlan = mutation({
  args: {
    actionPlanId: v.id("clinicalAuditActionPlans"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.actionPlanId);
    return args.actionPlanId;
  },
});

// Mark action plans as viewed (remove isNew flag)
export const markActionPlansAsViewed = mutation({
  args: {
    assignedTo: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all new action plans for this user
    const newPlans = await ctx.db
      .query("clinicalAuditActionPlans")
      .withIndex("by_assigned_to", (q) => q.eq("assignedTo", args.assignedTo))
      .collect();

    const now = Date.now();
    let marked = 0;

    for (const plan of newPlans) {
      if (plan.isNew) {
        await ctx.db.patch(plan._id, {
          isNew: false,
          viewedAt: now,
        });
        marked++;
      }
    }

    return { marked };
  },
});

// Get count of new action plans for a user
export const getNewActionPlansCount = query({
  args: {
    assignedTo: v.string(),
  },
  handler: async (ctx, args) => {
    const newPlans = await ctx.db
      .query("clinicalAuditActionPlans")
      .withIndex("by_assigned_to", (q) => q.eq("assignedTo", args.assignedTo))
      .collect();

    return newPlans.filter((plan) => plan.isNew === true).length;
  },
});
