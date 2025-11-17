import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Delete all action plans (use with caution!)
export const deleteAllActionPlans = internalMutation({
  args: {
    confirmationToken: v.string(), // Require a confirmation token for safety
  },
  handler: async (ctx, args) => {
    // Safety check - require exact confirmation
    if (args.confirmationToken !== "DELETE_ALL_ACTION_PLANS_CONFIRMED") {
      throw new Error("Invalid confirmation token. This operation is dangerous and requires exact confirmation.");
    }

    const results = {
      residentActionPlans: 0,
      careFileActionPlans: 0,
      clinicalActionPlans: 0,
      governanceActionPlans: 0,
      environmentActionPlans: 0,
      relatedNotifications: 0,
    };

    // Delete resident audit action plans
    const residentPlans = await ctx.db.query("residentAuditActionPlans").collect();
    for (const plan of residentPlans) {
      await ctx.db.delete(plan._id);
      results.residentActionPlans++;
    }

    // Delete care file audit action plans
    const careFilePlans = await ctx.db.query("careFileAuditActionPlans").collect();
    for (const plan of careFilePlans) {
      await ctx.db.delete(plan._id);
      results.careFileActionPlans++;
    }

    // Delete clinical audit action plans
    const clinicalPlans = await ctx.db.query("clinicalAuditActionPlans").collect();
    for (const plan of clinicalPlans) {
      await ctx.db.delete(plan._id);
      results.clinicalActionPlans++;
    }

    // Delete governance audit action plans
    const governancePlans = await ctx.db.query("governanceAuditActionPlans").collect();
    for (const plan of governancePlans) {
      await ctx.db.delete(plan._id);
      results.governanceActionPlans++;
    }

    // Delete environment audit action plans
    const environmentPlans = await ctx.db.query("environmentAuditActionPlans").collect();
    for (const plan of environmentPlans) {
      await ctx.db.delete(plan._id);
      results.environmentActionPlans++;
    }

    // Delete related notifications
    const notifications = await ctx.db.query("notifications").collect();
    for (const notification of notifications) {
      if (
        notification.type === "action_plan_status_updated" ||
        notification.type === "action_plan_completed" ||
        notification.type === "action_plan_overdue" ||
        notification.type === "action_plan_overdue_manager" ||
        notification.type === "action_plan"
      ) {
        await ctx.db.delete(notification._id);
        results.relatedNotifications++;
      }
    }

    console.log("Deleted action plans:", results);
    return results;
  },
});

// Delete old completed action plans (safer - only deletes completed ones older than X days)
export const deleteOldCompletedActionPlans = internalMutation({
  args: {
    daysOld: v.number(), // Delete completed action plans older than this many days
  },
  handler: async (ctx, args) => {
    const cutoffDate = Date.now() - args.daysOld * 24 * 60 * 60 * 1000;

    const results = {
      residentActionPlans: 0,
      careFileActionPlans: 0,
      clinicalActionPlans: 0,
      governanceActionPlans: 0,
      environmentActionPlans: 0,
    };

    // Delete old completed resident audit action plans
    const residentPlans = await ctx.db
      .query("residentAuditActionPlans")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "completed"),
          q.lt(q.field("completedAt"), cutoffDate)
        )
      )
      .collect();
    for (const plan of residentPlans) {
      await ctx.db.delete(plan._id);
      results.residentActionPlans++;
    }

    // Delete old completed care file audit action plans
    const careFilePlans = await ctx.db
      .query("careFileAuditActionPlans")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "completed"),
          q.lt(q.field("completedAt"), cutoffDate)
        )
      )
      .collect();
    for (const plan of careFilePlans) {
      await ctx.db.delete(plan._id);
      results.careFileActionPlans++;
    }

    // Delete old completed clinical audit action plans
    const clinicalPlans = await ctx.db
      .query("clinicalAuditActionPlans")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "completed"),
          q.lt(q.field("completedAt"), cutoffDate)
        )
      )
      .collect();
    for (const plan of clinicalPlans) {
      await ctx.db.delete(plan._id);
      results.clinicalActionPlans++;
    }

    // Delete old completed governance audit action plans
    const governancePlans = await ctx.db
      .query("governanceAuditActionPlans")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "completed"),
          q.lt(q.field("completedAt"), cutoffDate)
        )
      )
      .collect();
    for (const plan of governancePlans) {
      await ctx.db.delete(plan._id);
      results.governanceActionPlans++;
    }

    // Delete old completed environment audit action plans
    const environmentPlans = await ctx.db
      .query("environmentAuditActionPlans")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "completed"),
          q.lt(q.field("completedAt"), cutoffDate)
        )
      )
      .collect();
    for (const plan of environmentPlans) {
      await ctx.db.delete(plan._id);
      results.environmentActionPlans++;
    }

    console.log(`Deleted completed action plans older than ${args.daysOld} days:`, results);
    return results;
  },
});
