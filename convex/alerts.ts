import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

/**
 * Get active (unresolved) alerts for a specific resident
 */
export const getResidentAlerts = query({
  args: {
    residentId: v.id("residents"),
  },
  handler: async (ctx, args) => {
    const alerts = await ctx.db
      .query("alerts")
      .withIndex("byResidentAndResolved", (q) =>
        q.eq("residentId", args.residentId).eq("isResolved", false)
      )
      .collect();

    // Sort by severity and timestamp
    return alerts.sort((a, b) => {
      // Critical alerts first
      if (a.severity === "critical" && b.severity !== "critical") return -1;
      if (a.severity !== "critical" && b.severity === "critical") return 1;
      // Warning alerts second
      if (a.severity === "warning" && b.severity === "info") return -1;
      if (a.severity === "info" && b.severity === "warning") return 1;
      // Then sort by timestamp (newest first)
      return b.timestamp - a.timestamp;
    });
  },
});

/**
 * Get alert count for a specific resident
 */
export const getResidentAlertCount = query({
  args: {
    residentId: v.id("residents"),
  },
  handler: async (ctx, args) => {
    const alerts = await ctx.db
      .query("alerts")
      .withIndex("byResidentAndResolved", (q) =>
        q.eq("residentId", args.residentId).eq("isResolved", false)
      )
      .collect();

    return {
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === "critical").length,
      warning: alerts.filter((a) => a.severity === "warning").length,
      info: alerts.filter((a) => a.severity === "info").length,
    };
  },
});

/**
 * Get alert counts for multiple residents (for residents list page)
 */
export const getMultipleResidentsAlertCounts = query({
  args: {
    residentIds: v.array(v.id("residents")),
  },
  handler: async (ctx, args) => {
    const alertCounts: Record<
      string,
      { total: number; critical: number; warning: number; info: number }
    > = {};

    // Get all unresolved alerts for the provided residents
    const alerts = await ctx.db
      .query("alerts")
      .withIndex("byIsResolved", (q) => q.eq("isResolved", false))
      .collect();

    // Filter and group by resident
    const residentIdSet = new Set(args.residentIds);
    const relevantAlerts = alerts.filter((alert) =>
      residentIdSet.has(alert.residentId)
    );

    // Initialize counts
    args.residentIds.forEach((residentId) => {
      alertCounts[residentId] = { total: 0, critical: 0, warning: 0, info: 0 };
    });

    // Count alerts by severity
    relevantAlerts.forEach((alert) => {
      const counts = alertCounts[alert.residentId];
      counts.total++;
      if (alert.severity === "critical") counts.critical++;
      else if (alert.severity === "warning") counts.warning++;
      else if (alert.severity === "info") counts.info++;
    });

    return alertCounts;
  },
});

/**
 * Check food/fluid logs for today and generate alerts if needed
 */
export const checkFoodFluidAlerts = query({
  args: {
    residentId: v.id("residents"),
  },
  handler: async (ctx, args) => {
    const now = new Date();
    const today = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const currentHour = now.getHours();

    // Get all food/fluid logs for today
    const logs = await ctx.db
      .query("foodFluidLogs")
      .filter((q) =>
        q.and(
          q.eq(q.field("residentId"), args.residentId),
          q.eq(q.field("date"), today)
        )
      )
      .collect();

    // Check which time periods have logs
    const hasMorning = logs.some((log) => log.section === "Morning");
    const hasAfternoon = logs.some((log) => log.section === "Afternoon");
    const hasEvening = logs.some((log) => log.section === "Evening");
    const hasNight = logs.some((log) => log.section === "Night");

    const missingPeriods: Array<{
      period: "morning" | "afternoon" | "evening" | "night";
      shouldAlert: boolean;
    }> = [];

    // Morning (6 AM - 12 PM): Alert after 12 PM
    if (!hasMorning && currentHour >= 12) {
      missingPeriods.push({ period: "morning", shouldAlert: true });
    }

    // Afternoon (12 PM - 6 PM): Alert after 6 PM
    if (!hasAfternoon && currentHour >= 18) {
      missingPeriods.push({ period: "afternoon", shouldAlert: true });
    }

    // Evening (6 PM - 10 PM): Alert after 10 PM
    if (!hasEvening && currentHour >= 22) {
      missingPeriods.push({ period: "evening", shouldAlert: true });
    }

    // Night (10 PM - 6 AM): Alert after 6 AM next day
    if (!hasNight && currentHour >= 6) {
      missingPeriods.push({ period: "night", shouldAlert: true });
    }

    return {
      missingPeriods: missingPeriods.filter((p) => p.shouldAlert),
      logs,
      today,
      currentHour,
    };
  },
});

/**
 * Create a new alert (internal - called by cron jobs)
 */
export const createAlert = internalMutation({
  args: {
    residentId: v.id("residents"),
    alertType: v.union(
      v.literal("food_fluid"),
      v.literal("night_check"),
      v.literal("medication"),
      v.literal("activity"),
      v.literal("vital_signs"),
      v.literal("care_plan")
    ),
    severity: v.union(
      v.literal("critical"),
      v.literal("warning"),
      v.literal("info")
    ),
    title: v.string(),
    message: v.string(),
    timePeriod: v.optional(
      v.union(
        v.literal("morning"),
        v.literal("afternoon"),
        v.literal("evening"),
        v.literal("night")
      )
    ),
    metadata: v.optional(v.any()),
    organizationId: v.string(),
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if similar alert already exists
    const existingAlert = await ctx.db
      .query("alerts")
      .withIndex("byResidentAndType", (q) =>
        q.eq("residentId", args.residentId).eq("alertType", args.alertType)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("isResolved"), false),
          args.timePeriod
            ? q.eq(q.field("timePeriod"), args.timePeriod)
            : q.eq(q.field("timePeriod"), undefined)
        )
      )
      .first();

    // If alert already exists, don't create duplicate
    if (existingAlert) {
      return { alertId: existingAlert._id, created: false };
    }

    // Create new alert
    const alertId = await ctx.db.insert("alerts", {
      residentId: args.residentId,
      alertType: args.alertType,
      severity: args.severity,
      title: args.title,
      message: args.message,
      timestamp: Date.now(),
      timePeriod: args.timePeriod,
      isResolved: false,
      metadata: args.metadata,
      organizationId: args.organizationId,
      teamId: args.teamId,
      createdAt: Date.now(),
    });

    return { alertId, created: true };
  },
});

/**
 * Resolve an alert
 */
export const resolveAlert = mutation({
  args: {
    alertId: v.id("alerts"),
    resolvedBy: v.optional(v.string()),
    resolutionNote: v.optional(v.string()),
    autoResolved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.alertId, {
      isResolved: true,
      resolvedAt: Date.now(),
      resolvedBy: args.resolvedBy,
      resolutionNote: args.resolutionNote,
      autoResolved: args.autoResolved ?? false,
    });

    return { success: true };
  },
});

/**
 * Auto-resolve alerts when corresponding data is logged
 * For food/fluid alerts specifically
 */
export const autoResolveFoodFluidAlerts = mutation({
  args: {
    residentId: v.id("residents"),
    timePeriod: v.union(
      v.literal("morning"),
      v.literal("afternoon"),
      v.literal("evening"),
      v.literal("night")
    ),
  },
  handler: async (ctx, args) => {
    // Find unresolved food/fluid alerts for this resident and time period
    const alerts = await ctx.db
      .query("alerts")
      .withIndex("byResidentAndType", (q) =>
        q.eq("residentId", args.residentId).eq("alertType", "food_fluid")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("isResolved"), false),
          q.eq(q.field("timePeriod"), args.timePeriod)
        )
      )
      .collect();

    // Resolve all matching alerts
    const resolvedCount = alerts.length;
    for (const alert of alerts) {
      await ctx.db.patch(alert._id, {
        isResolved: true,
        resolvedAt: Date.now(),
        autoResolved: true,
        resolutionNote: `Food/fluid logged for ${args.timePeriod} period`,
      });
    }

    return { resolvedCount };
  },
});

/**
 * Auto-resolve alerts when night check is recorded
 * For night check alerts specifically
 */
export const autoResolveNightCheckAlerts = mutation({
  args: {
    residentId: v.id("residents"),
    checkType: v.union(
      v.literal("night_check"),
      v.literal("positioning"),
      v.literal("pad_change"),
      v.literal("bed_rails"),
      v.literal("environmental"),
      v.literal("night_note"),
      v.literal("cleaning")
    ),
    configurationId: v.id("nightCheckConfigurations"),
  },
  handler: async (ctx, args) => {
    // Find unresolved night check alerts for this resident and check type
    const alerts = await ctx.db
      .query("alerts")
      .withIndex("byResidentAndType", (q) =>
        q.eq("residentId", args.residentId).eq("alertType", "night_check")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("isResolved"), false),
          q.eq(q.field("metadata.checkType"), args.checkType),
          q.eq(q.field("metadata.configurationId"), args.configurationId)
        )
      )
      .collect();

    // Resolve all matching alerts
    const resolvedCount = alerts.length;
    for (const alert of alerts) {
      await ctx.db.patch(alert._id, {
        isResolved: true,
        resolvedAt: Date.now(),
        autoResolved: true,
        resolutionNote: `${args.checkType} check recorded`,
      });
    }

    return { resolvedCount };
  },
});

/**
 * Get all alerts for an organization (for admin dashboard)
 */
export const getOrganizationAlerts = query({
  args: {
    organizationId: v.string(),
    includeResolved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let alertsQuery = ctx.db
      .query("alerts")
      .withIndex("byOrganizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      );

    const alerts = await alertsQuery.collect();

    // Filter by resolved status if needed
    const filteredAlerts = args.includeResolved
      ? alerts
      : alerts.filter((a) => !a.isResolved);

    // Sort by severity and timestamp
    return filteredAlerts.sort((a, b) => {
      if (a.severity === "critical" && b.severity !== "critical") return -1;
      if (a.severity !== "critical" && b.severity === "critical") return 1;
      if (a.severity === "warning" && b.severity === "info") return -1;
      if (a.severity === "info" && b.severity === "warning") return 1;
      return b.timestamp - a.timestamp;
    });
  },
});

/**
 * Auto-resolve alerts when medication intake is updated
 * For medication alerts specifically
 */
export const autoResolveMedicationAlerts = mutation({
  args: {
    residentId: v.id("residents"),
    intakeId: v.id("medicationIntake"),
  },
  handler: async (ctx, args) => {
    // Find unresolved medication alerts for this resident and intake
    const alerts = await ctx.db
      .query("alerts")
      .withIndex("byResidentAndType", (q) =>
        q.eq("residentId", args.residentId).eq("alertType", "medication")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("isResolved"), false),
          q.eq(q.field("metadata.intakeId"), args.intakeId)
        )
      )
      .collect();

    // Resolve all matching alerts
    const resolvedCount = alerts.length;
    for (const alert of alerts) {
      await ctx.db.patch(alert._id, {
        isResolved: true,
        resolvedAt: Date.now(),
        autoResolved: true,
        resolutionNote: "Medication intake status updated",
      });
    }

    return { resolvedCount };
  },
});

/**
 * ADMIN FUNCTION: Clear all old alerts with bad formatting
 * This is a one-time cleanup function to remove alerts with old time formatting
 * After running this, new alerts will be generated with proper formatting
 */
export const clearAllUnresolvedAlerts = mutation({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all unresolved alerts for the organization
    const alerts = await ctx.db
      .query("alerts")
      .withIndex("byOrganizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("isResolved"), false))
      .collect();

    // Resolve all alerts
    for (const alert of alerts) {
      await ctx.db.patch(alert._id, {
        isResolved: true,
        resolvedAt: Date.now(),
        resolutionNote: "Cleared for alert system formatting update",
      });
    }

    return { clearedCount: alerts.length };
  },
});
