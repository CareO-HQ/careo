import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get action plans for a specific audit response
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

    // Enrich with template data
    const enrichedPlans = await Promise.all(
      actionPlans.map(async (plan) => {
        const template = await ctx.db.get(plan.templateId);

        return {
          ...plan,
          templateName: template?.name || "Unknown Governance Audit",
          auditCategory: "governance",
        };
      })
    );

    return enrichedPlans;
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

    // Enrich with template data
    const enrichedPlans = await Promise.all(
      actionPlans.map(async (plan) => {
        const template = await ctx.db.get(plan.templateId);

        return {
          ...plan,
          templateName: template?.name || "Unknown Governance Audit",
          auditCategory: "governance",
        };
      })
    );

    return enrichedPlans;
  },
});

// Get action plans created by a user (for managers)
export const getCreatedActionPlans = query({
  args: {
    createdBy: v.string(),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("all")
      )
    ),
  },
  handler: async (ctx, args) => {
    // Get all action plans created by this user
    // We don't enforce strict role check here to ensure creators can always see their plans
    const allPlans = await ctx.db
      .query("governanceAuditActionPlans")
      .collect();

    const actionPlans = allPlans.filter((plan) => plan.createdBy === args.createdBy);

    // Filter by status if specified
    const filteredPlans =
      args.status && args.status !== "all"
        ? actionPlans.filter((plan) => plan.status === args.status)
        : actionPlans;

    // Enrich with template data
    const enrichedPlans = await Promise.all(
      filteredPlans.map(async (plan) => {
        const template = await ctx.db.get(plan.templateId);

        return {
          ...plan,
          templateName: template?.name || "Unknown Governance Audit",
          auditCategory: "governance",
        };
      })
    );

    // Sort by due date (overdue first, then by priority)
    return enrichedPlans.sort((a, b) => {
      const now = Date.now();
      const aOverdue = a.dueDate && a.dueDate < now && a.status !== "completed";
      const bOverdue = b.dueDate && b.dueDate < now && b.status !== "completed";

      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Then by priority
      const priorityOrder = { High: 0, Medium: 1, Low: 2 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 3;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 3;

      if (aPriority !== bPriority) return aPriority - bPriority;

      // Then by due date
      if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;

      return b.createdAt - a.createdAt; // Newest first
    });
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

    // Notify the manager who created the action plan
    // Only if the updater is NOT the creator
    if (actionPlan.createdBy !== updatedBy) {
      const template = await ctx.db.get(actionPlan.templateId);

      await ctx.db.insert("notifications", {
        userId: actionPlan.createdBy,
        senderId: updatedBy,
        senderName: updatedByName,
        type: "action_plan_status_updated",
        title: "Action Plan Status Updated",
        message: `${updatedByName || "An assignee"} updated the action plan status to "${status}" for governance audit "${template?.name || "audit"}": "${actionPlan.description}"${comment ? `\n\nComment: ${comment}` : ""}`,
        link: `/dashboard/careo-audit/governance/${actionPlan.auditResponseId}/view`,
        metadata: {
          actionPlanId: actionPlanId,
          auditId: actionPlan.auditResponseId,
          templateId: actionPlan.templateId,
          oldStatus: actionPlan.status,
          newStatus: status,
          comment: comment,
          priority: actionPlan.priority,
          auditCategory: "governance",
        },
        isRead: false,
        organizationId: actionPlan.organizationId,
        teamId: actionPlan.organizationId, // These audits are organization-level, so use orgId as teamId
        createdAt: Date.now(),
      });
    }

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

// Mark action plans as viewed (remove isNew flag)
export const markActionPlansAsViewed = mutation({
  args: {
    assignedTo: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all new action plans for this user
    const newPlans = await ctx.db
      .query("governanceAuditActionPlans")
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
      .query("governanceAuditActionPlans")
      .withIndex("by_assigned_to", (q) => q.eq("assignedTo", args.assignedTo))
      .collect();

    return newPlans.filter((plan) => plan.isNew === true).length;
  },
});
