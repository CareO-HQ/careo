import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Quick fix for audit frequency migration
 * Updates a specific careFileAuditTemplate's frequency from old value to new value
 */
export const fixAuditFrequency = mutation({
  args: {
    templateId: v.id("careFileAuditTemplates"),
    newFrequency: v.union(v.literal("monthly"), v.literal("quarterly"), v.literal("yearly")),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    await ctx.db.patch(args.templateId, {
      frequency: args.newFrequency,
    });

    return {
      success: true,
      message: `Updated template ${args.templateId} frequency to ${args.newFrequency}`,
    };
  },
});

/**
 * Fix all audit frequencies in careFileAuditTemplates
 */
export const fixAllCareFileAuditFrequencies = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    updated: v.number(),
    message: v.string(),
  }),
  handler: async (ctx) => {
    const templates = await ctx.db.query("careFileAuditTemplates").collect();
    
    let updated = 0;
    
    for (const template of templates) {
      // Type assertion needed because database may still have old values
      const currentFreq = template.frequency as string;
      let newFreq: "monthly" | "quarterly" | "yearly" = "quarterly";
      
      if (currentFreq === "3months" || currentFreq === "6months") {
        newFreq = "quarterly";
      } else if (currentFreq === "daily" || currentFreq === "weekly") {
        newFreq = "monthly";
      } else if (currentFreq === "adhoc") {
        newFreq = "yearly";
      } else if (currentFreq === "monthly" || currentFreq === "quarterly" || currentFreq === "yearly") {
        continue; // Already correct
      } else {
        newFreq = "yearly"; // Default
      }
      
      if (currentFreq !== newFreq) {
        await ctx.db.patch(template._id, { frequency: newFreq });
        updated++;
        console.log(`Updated template ${template._id}: ${currentFreq} → ${newFreq}`);
      }
    }
    
    return {
      success: true,
      updated,
      message: `Updated ${updated} careFileAuditTemplates`,
    };
  },
});

/**
 * Delete all action plans (admin function)
 */
export const deleteAllActionPlans = internalMutation({
  args: {
    confirmationToken: v.string(),
  },
  returns: v.object({
    deleted: v.number(),
  }),
  handler: async (ctx, args) => {
    // Verify confirmation token matches expected value
    const expectedToken = process.env.ADMIN_CONFIRMATION_TOKEN || "CONFIRM_DELETE_ALL";
    if (args.confirmationToken !== expectedToken) {
      throw new Error("Invalid confirmation token");
    }

    // Delete all action plans from all tables
    const residentPlans = await ctx.db.query("residentAuditActionPlans").collect();
    const careFilePlans = await ctx.db.query("careFileAuditActionPlans").collect();
    const governancePlans = await ctx.db.query("governanceAuditActionPlans").collect();
    const clinicalPlans = await ctx.db.query("clinicalAuditActionPlans").collect();
    const environmentPlans = await ctx.db.query("environmentAuditActionPlans").collect();

    let deleted = 0;

    for (const plan of residentPlans) {
      await ctx.db.delete(plan._id);
      deleted++;
    }

    for (const plan of careFilePlans) {
      await ctx.db.delete(plan._id);
      deleted++;
    }

    for (const plan of governancePlans) {
      await ctx.db.delete(plan._id);
      deleted++;
    }

    for (const plan of clinicalPlans) {
      await ctx.db.delete(plan._id);
      deleted++;
    }

    for (const plan of environmentPlans) {
      await ctx.db.delete(plan._id);
      deleted++;
    }

    // Also delete related notifications
    const notifications = await ctx.db
      .query("notifications")
      .filter((q) =>
        q.or(
          q.eq(q.field("type"), "action_plan_created"),
          q.eq(q.field("type"), "action_plan_completed")
        )
      )
      .collect();

    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }

    return { deleted };
  },
});

/**
 * Delete old completed action plans (admin function)
 */
export const deleteOldCompletedActionPlans = internalMutation({
  args: {
    daysOld: v.number(),
  },
  returns: v.object({
    deleted: v.number(),
  }),
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - (args.daysOld * 24 * 60 * 60 * 1000);

    let deleted = 0;

    // Delete from all action plan tables
    const residentPlans = await ctx.db
      .query("residentAuditActionPlans")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "completed"),
          q.lt(q.field("completedAt"), cutoffTime)
        )
      )
      .collect();

    for (const plan of residentPlans) {
      await ctx.db.delete(plan._id);
      deleted++;
    }

    const careFilePlans = await ctx.db
      .query("careFileAuditActionPlans")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "completed"),
          q.lt(q.field("completedAt"), cutoffTime)
        )
      )
      .collect();

    for (const plan of careFilePlans) {
      await ctx.db.delete(plan._id);
      deleted++;
    }

    const governancePlans = await ctx.db
      .query("governanceAuditActionPlans")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "completed"),
          q.lt(q.field("completedAt"), cutoffTime)
        )
      )
      .collect();

    for (const plan of governancePlans) {
      await ctx.db.delete(plan._id);
      deleted++;
    }

    const clinicalPlans = await ctx.db
      .query("clinicalAuditActionPlans")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "completed"),
          q.lt(q.field("completedAt"), cutoffTime)
        )
      )
      .collect();

    for (const plan of clinicalPlans) {
      await ctx.db.delete(plan._id);
      deleted++;
    }

    const environmentPlans = await ctx.db
      .query("environmentAuditActionPlans")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "completed"),
          q.lt(q.field("completedAt"), cutoffTime)
        )
      )
      .collect();

    for (const plan of environmentPlans) {
      await ctx.db.delete(plan._id);
      deleted++;
    }

    return { deleted };
  },
});
