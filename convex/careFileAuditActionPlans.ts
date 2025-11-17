import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Create a new action plan for care file audit
export const createActionPlan = mutation({
  args: {
    auditResponseId: v.id("careFileAuditCompletions"),
    templateId: v.id("careFileAuditTemplates"),
    residentId: v.id("residents"),
    description: v.string(),
    assignedTo: v.string(), // User email
    assignedToName: v.optional(v.string()),
    priority: v.union(v.literal("Low"), v.literal("Medium"), v.literal("High")),
    dueDate: v.optional(v.number()),
    careFileReference: v.optional(v.string()),
    teamId: v.string(),
    organizationId: v.string(),
    createdBy: v.string(), // Creator email
    createdByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get template and resident info for notification
    const template = await ctx.db.get(args.templateId);
    const resident = await ctx.db.get(args.residentId);

    const actionPlanId = await ctx.db.insert("careFileAuditActionPlans", {
      auditResponseId: args.auditResponseId,
      templateId: args.templateId,
      residentId: args.residentId,
      description: args.description,
      assignedTo: args.assignedTo,
      assignedToName: args.assignedToName,
      priority: args.priority,
      dueDate: args.dueDate,
      careFileReference: args.careFileReference,
      status: "pending",
      teamId: args.teamId,
      organizationId: args.organizationId,
      createdBy: args.createdBy,
      createdByName: args.createdByName,
      createdAt: Date.now(),
      isNew: true, // Mark as new for badge display
    });

    // Note: No notification sent to assignee - they will see it in their Action Plans dashboard
    // Only status change notifications go to the manager who created the action plan

    return actionPlanId;
  },
});

// Update an action plan
export const updateActionPlan = mutation({
  args: {
    actionPlanId: v.id("careFileAuditActionPlans"),
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

// Update action plan status with comment (by assignee)
export const updateActionPlanStatus = mutation({
  args: {
    actionPlanId: v.id("careFileAuditActionPlans"),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed")
    ),
    comment: v.optional(v.string()),
    updatedBy: v.string(), // User email
    updatedByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the action plan
    const actionPlan = await ctx.db.get(args.actionPlanId);
    if (!actionPlan) {
      throw new Error("Action plan not found");
    }

    // Get template info for notification
    const template = await ctx.db.get(actionPlan.templateId);
    const resident = await ctx.db.get(actionPlan.residentId);

    // Create status history entry
    const statusUpdate = {
      status: args.status,
      comment: args.comment,
      updatedBy: args.updatedBy,
      updatedByName: args.updatedByName,
      updatedAt: Date.now(),
    };

    // Get existing history or initialize empty array
    const existingHistory = actionPlan.statusHistory || [];
    const updatedHistory = [...existingHistory, statusUpdate];

    // Update action plan
    await ctx.db.patch(args.actionPlanId, {
      status: args.status,
      statusHistory: updatedHistory,
      latestComment: args.comment,
      updatedAt: Date.now(),
      ...(args.status === "completed" && { completedAt: Date.now() }),
    });

    // Notify the manager who created the action plan
    await ctx.db.insert("notifications", {
      userId: actionPlan.createdBy,
      senderId: args.updatedBy,
      senderName: args.updatedByName,
      type: "action_plan_status_updated",
      title: "Action Plan Status Updated",
      message: `${args.updatedByName || "An assignee"} updated the action plan status to "${args.status}" for ${resident ? `${resident.firstName} ${resident.lastName}` : "resident"}'s ${template?.name || "care file audit"}: "${actionPlan.description}"${args.comment ? `\n\nComment: ${args.comment}` : ""}`,
      link: `/dashboard/careo-audit/${actionPlan.residentId}/carefileaudit/${actionPlan.auditResponseId}/view`,
      metadata: {
        actionPlanId: args.actionPlanId,
        auditId: actionPlan.auditResponseId,
        templateId: actionPlan.templateId,
        residentId: actionPlan.residentId,
        oldStatus: actionPlan.status,
        newStatus: args.status,
        comment: args.comment,
        priority: actionPlan.priority,
        auditCategory: "carefile", // Add category for routing
      },
      isRead: false,
      organizationId: actionPlan.organizationId,
      teamId: actionPlan.teamId,
      createdAt: Date.now(),
    });

    return args.actionPlanId;
  },
});

// Complete an action plan
export const completeActionPlan = mutation({
  args: {
    actionPlanId: v.id("careFileAuditActionPlans"),
    completedBy: v.optional(v.string()), // User email who completed it
    completedByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the action plan details
    const actionPlan = await ctx.db.get(args.actionPlanId);
    if (!actionPlan) {
      throw new Error("Action plan not found");
    }

    // Get template and resident info for notification
    const template = await ctx.db.get(actionPlan.templateId);
    const resident = await ctx.db.get(actionPlan.residentId);

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
      message: `${args.completedByName || actionPlan.assignedToName || "A staff member"} completed the action plan for ${resident ? `${resident.firstName} ${resident.lastName}` : "resident"}'s ${template?.name || "care file audit"}: "${actionPlan.description}"`,
      link: `/dashboard/careo-audit/${actionPlan.residentId}/carefileaudit/${actionPlan.auditResponseId}/view`,
      metadata: {
        actionPlanId: args.actionPlanId,
        auditId: actionPlan.auditResponseId,
        templateId: actionPlan.templateId,
        residentId: actionPlan.residentId,
        priority: actionPlan.priority,
        auditCategory: "carefile", // Add category for routing
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
    auditResponseId: v.id("careFileAuditCompletions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("careFileAuditActionPlans")
      .withIndex("by_audit_response", (q) =>
        q.eq("auditResponseId", args.auditResponseId)
      )
      .collect();
  },
});

// Get all action plans for a template
export const getActionPlansByTemplate = query({
  args: {
    templateId: v.id("careFileAuditTemplates"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("careFileAuditActionPlans")
      .withIndex("by_template", (q) => q.eq("templateId", args.templateId))
      .collect();
  },
});

// Get all action plans for a resident
export const getActionPlansByResident = query({
  args: {
    residentId: v.id("residents"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("careFileAuditActionPlans")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
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
      .query("careFileAuditActionPlans")
      .withIndex("by_assigned_to", (q) => q.eq("assignedTo", args.assignedTo))
      .collect();
  },
});

// Get action plans by assignee with enriched data
export const getMyActionPlans = query({
  args: {
    assignedTo: v.string(),
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
    // Get all action plans for this user
    const actionPlans = await ctx.db
      .query("careFileAuditActionPlans")
      .withIndex("by_assigned_to", (q) => q.eq("assignedTo", args.assignedTo))
      .collect();

    // Filter by status if specified
    const filteredPlans =
      args.status && args.status !== "all"
        ? actionPlans.filter((plan) => plan.status === args.status)
        : actionPlans;

    // Enrich with template, audit, and resident data
    const enrichedPlans = await Promise.all(
      filteredPlans.map(async (plan) => {
        const template = await ctx.db.get(plan.templateId);
        const auditResponse = await ctx.db.get(plan.auditResponseId);
        const resident = await ctx.db.get(plan.residentId);

        return {
          ...plan,
          templateName: template?.name || "Unknown Audit",
          auditCategory: "carefile",
          auditCompletedAt: auditResponse?.completedAt,
          residentName: resident ? `${resident.firstName} ${resident.lastName}` : "Unknown Resident",
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
      const aPriority = priorityOrder[a.priority] || 3;
      const bPriority = priorityOrder[b.priority] || 3;

      if (aPriority !== bPriority) return aPriority - bPriority;

      // Then by due date
      if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;

      return b.createdAt - a.createdAt; // Newest first
    });
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
    const allPlans = await ctx.db
      .query("careFileAuditActionPlans")
      .collect();

    const actionPlans = allPlans.filter((plan) => plan.createdBy === args.createdBy);

    // Filter by status if specified
    const filteredPlans =
      args.status && args.status !== "all"
        ? actionPlans.filter((plan) => plan.status === args.status)
        : actionPlans;

    // Enrich with template, audit, and resident data
    const enrichedPlans = await Promise.all(
      filteredPlans.map(async (plan) => {
        const template = await ctx.db.get(plan.templateId);
        const auditResponse = await ctx.db.get(plan.auditResponseId);
        const resident = await ctx.db.get(plan.residentId);

        return {
          ...plan,
          templateName: template?.name || "Unknown Audit",
          auditCategory: "carefile",
          auditCompletedAt: auditResponse?.completedAt,
          residentName: resident ? `${resident.firstName} ${resident.lastName}` : "Unknown Resident",
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
      const aPriority = priorityOrder[a.priority] || 3;
      const bPriority = priorityOrder[b.priority] || 3;

      if (aPriority !== bPriority) return aPriority - bPriority;

      // Then by due date
      if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;

      return b.createdAt - a.createdAt; // Newest first
    });
  },
});

// Get single action plan with full details
export const getActionPlanById = query({
  args: {
    actionPlanId: v.id("careFileAuditActionPlans"),
  },
  handler: async (ctx, args) => {
    const actionPlan = await ctx.db.get(args.actionPlanId);
    if (!actionPlan) return null;

    const template = await ctx.db.get(actionPlan.templateId);
    const auditResponse = await ctx.db.get(actionPlan.auditResponseId);
    const resident = await ctx.db.get(actionPlan.residentId);

    return {
      ...actionPlan,
      templateName: template?.name || "Unknown Audit",
      auditCategory: "carefile",
      auditCompletedAt: auditResponse?.completedAt,
      resident,
    };
  },
});

// Get all action plans for a team
export const getActionPlansByTeam = query({
  args: {
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("careFileAuditActionPlans")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

// Get overdue action plans for a team
export const getOverdueActionPlans = query({
  args: {
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const allPlans = await ctx.db
      .query("careFileAuditActionPlans")
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
    actionPlanId: v.id("careFileAuditActionPlans"),
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
      .query("careFileAuditActionPlans")
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
      .query("careFileAuditActionPlans")
      .withIndex("by_assigned_to", (q) => q.eq("assignedTo", args.assignedTo))
      .collect();

    return newPlans.filter((plan) => plan.isNew === true).length;
  },
});

// Get action plan statistics for a team
export const getActionPlanStats = query({
  args: {
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    const allPlans = await ctx.db
      .query("careFileAuditActionPlans")
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

// Update overdue action plans (called by cron job)
export const updateOverdueActionPlans = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Get all non-completed action plans
    const plans = await ctx.db
      .query("careFileAuditActionPlans")
      .filter((q) => q.neq(q.field("status"), "completed"))
      .collect();

    let updated = 0;

    for (const plan of plans) {
      // Check if overdue and not already marked as overdue
      if (plan.dueDate && plan.dueDate < now && plan.status !== "overdue") {
        // Update status to overdue
        await ctx.db.patch(plan._id, {
          status: "overdue",
          updatedAt: now,
        });

        // Get template and resident for better notification message
        const template = await ctx.db.get(plan.templateId);
        const resident = await ctx.db.get(plan.residentId);

        // Create notification for assignee
        await ctx.db.insert("notifications", {
          userId: plan.assignedTo,
          senderId: plan.createdBy,
          senderName: plan.createdByName,
          type: "action_plan_overdue",
          title: "Action Plan Overdue",
          message: `Your action plan for ${resident ? `${resident.firstName} ${resident.lastName}` : "resident"}'s "${template?.name || 'care file audit'}" is now overdue: "${plan.description}"`,
          link: `/dashboard/action-plans`,
          metadata: {
            actionPlanId: plan._id,
            auditId: plan.auditResponseId,
            templateId: plan.templateId,
            residentId: plan.residentId,
            priority: plan.priority,
            dueDate: plan.dueDate,
            auditCategory: "carefile", // Add category for routing
          },
          isRead: false,
          organizationId: plan.organizationId,
          teamId: plan.teamId,
          createdAt: now,
        });

        // Also notify the manager who created it
        if (plan.createdBy !== plan.assignedTo) {
          await ctx.db.insert("notifications", {
            userId: plan.createdBy,
            senderId: plan.assignedTo,
            senderName: plan.assignedToName,
            type: "action_plan_overdue_manager",
            title: "Action Plan Overdue - Manager Alert",
            message: `Action plan assigned to ${plan.assignedToName || plan.assignedTo} for ${resident ? `${resident.firstName} ${resident.lastName}` : "resident"} is now overdue: "${plan.description}"`,
            link: `/dashboard/action-plans`,
            metadata: {
              actionPlanId: plan._id,
              auditId: plan.auditResponseId,
              templateId: plan.templateId,
              residentId: plan.residentId,
              priority: plan.priority,
              dueDate: plan.dueDate,
              auditCategory: "carefile", // Add category for routing
            },
            isRead: false,
            organizationId: plan.organizationId,
            teamId: plan.teamId,
            createdAt: now,
          });
        }

        updated++;
      }
    }

    console.log(`Updated ${updated} overdue care file audit action plans`);
    return { updated };
  },
});

// Archive old completed action plans (called by cron job)
export const archiveOldActionPlans = internalMutation({
  handler: async (ctx) => {
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);

    // Find completed action plans older than 90 days
    const oldPlans = await ctx.db
      .query("careFileAuditActionPlans")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "completed"),
          q.lt(q.field("completedAt"), ninetyDaysAgo)
        )
      )
      .collect();

    let archived = 0;
    for (const plan of oldPlans) {
      await ctx.db.delete(plan._id);
      archived++;
    }

    console.log(`Archived ${archived} old completed care file audit action plans`);
    return { archived };
  },
});
