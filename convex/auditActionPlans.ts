import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new action plan
export const createActionPlan = mutation({
  args: {
    auditResponseId: v.id("residentAuditCompletions"),
    templateId: v.id("residentAuditTemplates"),
    description: v.string(),
    assignedTo: v.string(), // User email
    assignedToName: v.optional(v.string()),
    priority: v.union(v.literal("Low"), v.literal("Medium"), v.literal("High")),
    dueDate: v.optional(v.number()),
    teamId: v.string(),
    organizationId: v.string(),
    createdBy: v.string(), // Creator email
    createdByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get audit and template info for the notification
    const audit = await ctx.db.get(args.auditResponseId);
    const template = await ctx.db.get(args.templateId);

    const actionPlanId = await ctx.db.insert("residentAuditActionPlans", {
      auditResponseId: args.auditResponseId,
      templateId: args.templateId,
      description: args.description,
      assignedTo: args.assignedTo,
      assignedToName: args.assignedToName,
      priority: args.priority,
      dueDate: args.dueDate,
      status: "pending",
      teamId: args.teamId,
      organizationId: args.organizationId,
      createdBy: args.createdBy,
      createdByName: args.createdByName,
      createdAt: Date.now(),
    });

    // Create notification for the assigned user
    await ctx.db.insert("notifications", {
      userId: args.assignedTo,
      senderId: args.createdBy,
      senderName: args.createdByName,
      type: "action_plan",
      title: "New Action Plan Assigned",
      message: `${args.createdByName || "A manager"} assigned you an action plan for ${template?.name || "audit"}: "${args.description}"`,
      link: `/dashboard/careo-audit/resident/${args.auditResponseId}/view`,
      metadata: {
        actionPlanId: actionPlanId,
        auditId: args.auditResponseId,
        templateId: args.templateId,
        priority: args.priority,
        dueDate: args.dueDate,
      },
      isRead: false,
      organizationId: args.organizationId,
      teamId: args.teamId,
      createdAt: Date.now(),
    });

    return actionPlanId;
  },
});

// Update an action plan
export const updateActionPlan = mutation({
  args: {
    actionPlanId: v.id("residentAuditActionPlans"),
    description: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    assignedToName: v.optional(v.string()),
    priority: v.optional(
      v.union(v.literal("Low"), v.literal("Medium"), v.literal("High"))
    ),
    dueDate: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("overdue")
      )
    ),
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

// Complete an action plan
export const completeActionPlan = mutation({
  args: {
    actionPlanId: v.id("residentAuditActionPlans"),
    completedBy: v.optional(v.string()), // User email who completed it
    completedByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the action plan details
    const actionPlan = await ctx.db.get(args.actionPlanId);
    if (!actionPlan) {
      throw new Error("Action plan not found");
    }

    // Get template info for notification
    const template = await ctx.db.get(actionPlan.templateId);

    // Mark as completed
    await ctx.db.patch(args.actionPlanId, {
      status: "completed",
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Notify the manager who created it
    await ctx.db.insert("notifications", {
      userId: actionPlan.createdBy,
      senderId: args.completedBy || actionPlan.assignedTo,
      senderName: args.completedByName || actionPlan.assignedToName,
      type: "action_plan_completed",
      title: "Action Plan Completed",
      message: `${args.completedByName || actionPlan.assignedToName || "A staff member"} completed the action plan for ${template?.name || "audit"}: "${actionPlan.description}"`,
      link: `/dashboard/careo-audit/resident/${actionPlan.auditResponseId}/view`,
      metadata: {
        actionPlanId: args.actionPlanId,
        auditId: actionPlan.auditResponseId,
        templateId: actionPlan.templateId,
        priority: actionPlan.priority,
      },
      isRead: false,
      organizationId: actionPlan.organizationId,
      teamId: actionPlan.teamId,
      createdAt: Date.now(),
    });

    return args.actionPlanId;
  },
});

// Get all action plans for a specific audit response
export const getActionPlansByAudit = query({
  args: {
    auditResponseId: v.id("residentAuditCompletions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("residentAuditActionPlans")
      .withIndex("by_audit_response", (q) =>
        q.eq("auditResponseId", args.auditResponseId)
      )
      .collect();
  },
});

// Get all action plans for a template
export const getActionPlansByTemplate = query({
  args: {
    templateId: v.id("residentAuditTemplates"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("residentAuditActionPlans")
      .withIndex("by_template", (q) => q.eq("templateId", args.templateId))
      .collect();
  },
});

// Get all action plans assigned to a user
export const getActionPlansByAssignee = query({
  args: {
    assignedTo: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("residentAuditActionPlans")
      .withIndex("by_assigned_to", (q) => q.eq("assignedTo", args.assignedTo))
      .collect();
  },
});

// Get all action plans for a team
export const getActionPlansByTeam = query({
  args: {
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("residentAuditActionPlans")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

// Get overdue action plans
export const getOverdueActionPlans = query({
  args: {
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const allPlans = await ctx.db
      .query("residentAuditActionPlans")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    // Filter for overdue plans (not completed and past due date)
    return allPlans.filter(
      (plan) =>
        plan.status !== "completed" &&
        plan.dueDate &&
        plan.dueDate < now
    );
  },
});


// Delete an action plan
export const deleteActionPlan = mutation({
  args: {
    actionPlanId: v.id("residentAuditActionPlans"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.actionPlanId);
    return args.actionPlanId;
  },
});

// Get action plan statistics for a team
export const getActionPlanStats = query({
  args: {
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    const allPlans = await ctx.db
      .query("residentAuditActionPlans")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    const now = Date.now();

    return {
      total: allPlans.length,
      pending: allPlans.filter((p) => p.status === "pending").length,
      inProgress: allPlans.filter((p) => p.status === "in_progress").length,
      completed: allPlans.filter((p) => p.status === "completed").length,
      overdue: allPlans.filter(
        (p) => p.status !== "completed" && p.dueDate && p.dueDate < now
      ).length,
      highPriority: allPlans.filter(
        (p) => p.priority === "High" && p.status !== "completed"
      ).length,
    };
  },
});
