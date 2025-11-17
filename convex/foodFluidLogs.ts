import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import {
  getAuthenticatedUser,
  canAccessResident,
  checkRateLimit,
  sanitizeInput,
  validateFoodFluidLog,
  logFoodFluidAccess,
} from "./lib/authHelpers";

/**
 * Create a new food/fluid log entry
 *
 * SECURITY:
 * - ✅ Authentication: getAuthenticatedUser
 * - ✅ Authorization: canAccessResident
 * - ✅ Rate Limiting: 100 logs/hour per user
 * - ✅ Input Sanitization: sanitizeInput for XSS prevention
 * - ✅ Validation: validateFoodFluidLog for data integrity
 * - ✅ Audit Trail: logFoodFluidAccess for compliance
 */
export const createFoodFluidLog = mutation({
  args: {
    residentId: v.id("residents"),
    section: v.string(),
    typeOfFoodDrink: v.string(),
    portionServed: v.string(),
    amountEaten: v.string(),
    fluidConsumedMl: v.optional(v.number()),
    signature: v.string(),
    organizationId: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. AUTHENTICATE USER
    const user = await getAuthenticatedUser(ctx);

    // 2. AUTHORIZE ACCESS TO RESIDENT
    await canAccessResident(ctx, user._id, args.residentId);

    // 3. RATE LIMIT (100 logs per hour per user)
    await checkRateLimit(ctx, user._id, {
      operation: "food_fluid_create",
      maxRequests: 100,
      windowMs: 60 * 60 * 1000,
    });

    // 4. VALIDATE INPUT DATA
    validateFoodFluidLog({
      section: args.section,
      typeOfFoodDrink: args.typeOfFoodDrink,
      portionServed: args.portionServed,
      amountEaten: args.amountEaten,
      fluidConsumedMl: args.fluidConsumedMl,
      signature: args.signature,
    });

    // 5. SANITIZE TEXT INPUTS (XSS prevention)
    const sanitized = {
      typeOfFoodDrink: sanitizeInput(args.typeOfFoodDrink),
      portionServed: sanitizeInput(args.portionServed),
      signature: sanitizeInput(args.signature),
    };

    const now = Date.now();
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

    // 6. CALCULATE RETENTION SCHEDULE (UK Healthcare: 7 years)
    const retentionPeriodYears = 7;
    const scheduledDeletionAt = now + retentionPeriodYears * 365 * 24 * 60 * 60 * 1000;

    // 7. INSERT LOG ENTRY
    const logEntry = await ctx.db.insert("foodFluidLogs", {
      residentId: args.residentId,
      timestamp: now,
      section: args.section,
      typeOfFoodDrink: sanitized.typeOfFoodDrink,
      portionServed: sanitized.portionServed,
      amountEaten: args.amountEaten,
      fluidConsumedMl: args.fluidConsumedMl ?? undefined,
      signature: sanitized.signature,
      date: today,

      // Retention fields
      isArchived: false,
      retentionPeriodYears,
      scheduledDeletionAt,
      isReadOnly: false,
      schemaVersion: 1,

      // GDPR compliance
      consentToStore: true,
      dataProcessingBasis: "care_delivery",

      // Metadata
      organizationId: args.organizationId,
      createdBy: args.createdBy,
      createdAt: now,
    });

    // 8. AUDIT LOG (GDPR compliance)
    await logFoodFluidAccess(ctx, {
      logId: logEntry,
      residentId: args.residentId,
      userId: user._id,
      action: "create",
      metadata: {
        section: args.section,
        fluidMl: args.fluidConsumedMl,
      },
    });

    // 9. AUTO-RESOLVE FOOD/FLUID ALERTS
    // Map section names to time periods for alert resolution
    const sectionToTimePeriod: Record<string, "morning" | "afternoon" | "evening" | "night"> = {
      "Morning": "morning",
      "Afternoon": "afternoon",
      "Evening": "evening",
      "Night": "night",
    };

    const timePeriod = sectionToTimePeriod[args.section];
    if (timePeriod) {
      // Resolve any active alerts for this time period
      await ctx.runMutation(api.alerts.autoResolveFoodFluidAlerts, {
        residentId: args.residentId,
        timePeriod,
      });
    }

    return logEntry;
  },
});

// Get food/fluid logs for a specific resident and date
export const getFoodFluidLogsByResidentAndDate = query({
  args: {
    residentId: v.id("residents"),
    date: v.string(),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let logs = await ctx.db
      .query("foodFluidLogs")
      .withIndex("byResidentAndDate", (q) => 
        q.eq("residentId", args.residentId).eq("date", args.date)
      )
      .collect();
    
    // Filter by archived status if specified
    if (args.includeArchived !== undefined) {
      logs = logs.filter(log => 
        args.includeArchived ? (log.isArchived === true) : (log.isArchived !== true)
      );
    }
    
    // Sort by timestamp (most recent first)
    return logs.sort((a, b) => b.timestamp - a.timestamp);
  },
});

// Get current day's active (non-archived) logs for a resident
export const getCurrentDayLogs = query({
  args: {
    residentId: v.id("residents"),
  },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split('T')[0];
    
    return await ctx.db
      .query("foodFluidLogs")
      .withIndex("byResidentAndDate", (q) => 
        q.eq("residentId", args.residentId).eq("date", today)
      )
      .filter((q) => q.neq(q.field("isArchived"), true))
      .collect();
  },
});

// Get archived logs for a resident (previous days)
export const getArchivedLogs = query({
  args: {
    residentId: v.id("residents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("foodFluidLogs")
      .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
      .filter((q) => q.eq(q.field("isArchived"), true))
      .order("desc")
      .take(args.limit || 100);
    
    return logs;
  },
});

// Update a food/fluid log entry
export const updateFoodFluidLog = mutation({
  args: {
    logId: v.id("foodFluidLogs"),
    section: v.optional(v.string()),
    typeOfFoodDrink: v.optional(v.string()),
    portionServed: v.optional(v.string()),
    amountEaten: v.optional(v.string()),
    fluidConsumedMl: v.optional(v.number()),
    signature: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { logId, ...updates } = args;
    
    // Only allow updates if the log is not archived
    const existingLog = await ctx.db.get(logId);
    if (!existingLog) {
      throw new Error("Log entry not found");
    }
    
    if (existingLog.isArchived) {
      throw new Error("Cannot update archived log entries");
    }
    
    await ctx.db.patch(logId, {
      ...updates,
      updatedAt: Date.now(),
    });
    
    return await ctx.db.get(logId);
  },
});

// Delete a food/fluid log entry
export const deleteFoodFluidLog = mutation({
  args: {
    logId: v.id("foodFluidLogs"),
  },
  handler: async (ctx, args) => {
    const existingLog = await ctx.db.get(args.logId);
    if (!existingLog) {
      throw new Error("Log entry not found");
    }
    
    if (existingLog.isArchived) {
      throw new Error("Cannot delete archived log entries");
    }
    
    await ctx.db.delete(args.logId);
    return { success: true };
  },
});

// Archive logs at 7am - this would typically be called by a cron job
export const archivePreviousDayLogs = internalMutation({
  args: {
    targetDate: v.optional(v.string()), // YYYY-MM-DD format, defaults to yesterday
  },
  handler: async (ctx, args) => {
    const targetDate = args.targetDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const now = Date.now();
    
    // Get all non-archived logs for the target date
    const logsToArchive = await ctx.db
      .query("foodFluidLogs")
      .withIndex("byDateAndArchived", (q) => 
        q.eq("date", targetDate).eq("isArchived", false)
      )
      .collect();
    
    // Archive each log
    const archivePromises = logsToArchive.map(log => 
      ctx.db.patch(log._id, {
        isArchived: true,
        archivedAt: now,
      })
    );
    
    await Promise.all(archivePromises);
    
    return {
      archivedCount: logsToArchive.length,
      targetDate,
      archivedAt: now,
    };
  },
});

// Get summary statistics for a resident's logs
export const getFoodFluidSummary = query({
  args: {
    residentId: v.id("residents"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("foodFluidLogs")
      .withIndex("byResidentAndDate", (q) => 
        q.eq("residentId", args.residentId).eq("date", args.date)
      )
      .filter((q) => q.neq(q.field("isArchived"), true))
      .collect();
    
    const totalFluidIntake = logs
      .filter(log => log.fluidConsumedMl)
      .reduce((sum, log) => sum + (log.fluidConsumedMl || 0), 0);
    
    const foodEntries = logs.filter(log => 
      log.typeOfFoodDrink && !['Water', 'Tea', 'Coffee', 'Juice', 'Milk'].includes(log.typeOfFoodDrink)
    ).length;
    
    const fluidEntries = logs.filter(log => 
      ['Water', 'Tea', 'Coffee', 'Juice', 'Milk'].includes(log.typeOfFoodDrink) || log.fluidConsumedMl
    ).length;
    
    const sectionBreakdown = logs.reduce((acc, log) => {
      acc[log.section] = (acc[log.section] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalEntries: logs.length,
      foodEntries,
      fluidEntries,
      totalFluidIntakeMl: totalFluidIntake,
      sectionBreakdown,
      lastRecorded: logs.length > 0 ? Math.max(...logs.map(log => log.timestamp)) : null,
    };
  },
});

// Get all available report dates for a resident (both current and archived logs)
export const getAvailableFoodFluidDates = query({
  args: {
    residentId: v.id("residents")
  },
  handler: async (ctx, args) => {
    // Get all food fluid logs for the resident
    const logs = await ctx.db
      .query("foodFluidLogs")
      .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
      .collect();

    // Extract unique dates and sort them
    const dates = [...new Set(logs.map(log => log.date))];
    return dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); // Most recent first
  }
});

// Get daily food fluid report for a specific date
export const getDailyFoodFluidReport = query({
  args: {
    residentId: v.id("residents"),
    date: v.string(), // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    // Get all logs for the specified date (both current and archived)
    const logs = await ctx.db
      .query("foodFluidLogs")
      .withIndex("byResidentAndDate", (q) => 
        q.eq("residentId", args.residentId).eq("date", args.date)
      )
      .collect();

    if (logs.length === 0) {
      return { logs: [], reportGenerated: false };
    }

    // Sort logs by timestamp
    logs.sort((a, b) => a.timestamp - b.timestamp);

    return {
      logs: logs,
      reportGenerated: true,
      date: args.date,
      totalEntries: logs.length,
      foodEntries: logs.filter(log => 
        log.typeOfFoodDrink && !['Water', 'Tea', 'Coffee', 'Juice', 'Milk'].includes(log.typeOfFoodDrink)
      ).length,
      fluidEntries: logs.filter(log => 
        ['Water', 'Tea', 'Coffee', 'Juice', 'Milk'].includes(log.typeOfFoodDrink) || log.fluidConsumedMl
      ).length,
      totalFluidMl: logs.reduce((sum, log) => sum + (log.fluidConsumedMl || 0), 0)
    };
  }
});

// ============================================================================
// PERFORMANCE OPTIMIZATIONS
// ============================================================================

/**
 * BATCHED QUERY: Get all resident food/fluid data in ONE query
 * Replaces 4 separate queries with 1 optimized query
 *
 * Before: resident + diet + logs + summary = 4 queries
 * After: 1 query returns everything
 */
export const getResidentFoodFluidData = query({
  args: {
    residentId: v.id("residents"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    // Parallel fetch (fast!)
    const [resident, diet, logs] = await Promise.all([
      ctx.db.get(args.residentId),
      ctx.db
        .query("dietInformation")
        .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
        .first(),
      ctx.db
        .query("foodFluidLogs")
        .withIndex("byResidentAndDate", (q) =>
          q.eq("residentId", args.residentId).eq("date", args.date)
        )
        .filter((q) => q.neq(q.field("isArchived"), true))
        .collect(),
    ]);

    // Calculate summary from logs (no extra query needed)
    const totalFluidIntakeMl = logs
      .filter((log) => log.fluidConsumedMl)
      .reduce((sum, log) => sum + (log.fluidConsumedMl || 0), 0);

    const foodEntries = logs.filter(
      (log) =>
        log.typeOfFoodDrink &&
        !["Water", "Tea", "Coffee", "Juice", "Milk"].includes(log.typeOfFoodDrink)
    ).length;

    const lastRecorded = logs.length > 0 ? Math.max(...logs.map((l) => l.timestamp)) : null;

    return {
      resident,
      diet,
      logs,
      summary: {
        foodEntries,
        totalFluidIntakeMl,
        lastRecorded,
      },
    };
  },
});

/**
 * SERVER-SIDE FILTERED FOOD LOGS
 * Replaces client-side filtering in UI
 */
export const getTodayFoodLogs = query({
  args: {
    residentId: v.id("residents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0];

    const logs = await ctx.db
      .query("foodFluidLogs")
      .withIndex("byResidentAndDate", (q) =>
        q.eq("residentId", args.residentId).eq("date", today)
      )
      .filter((q) => q.neq(q.field("isArchived"), true))
      .order("desc")
      .take(args.limit || 50);

    // Filter food only (server-side!)
    return logs.filter(
      (log) =>
        log.typeOfFoodDrink &&
        !["Water", "Tea", "Coffee", "Juice", "Milk"].includes(log.typeOfFoodDrink) &&
        !log.fluidConsumedMl
    );
  },
});

/**
 * SERVER-SIDE FILTERED FLUID LOGS
 * Replaces client-side filtering in UI
 */
export const getTodayFluidLogs = query({
  args: {
    residentId: v.id("residents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0];

    const logs = await ctx.db
      .query("foodFluidLogs")
      .withIndex("byResidentAndDate", (q) =>
        q.eq("residentId", args.residentId).eq("date", today)
      )
      .filter((q) => q.neq(q.field("isArchived"), true))
      .order("desc")
      .take(args.limit || 50);

    // Filter fluid only (server-side!)
    return logs.filter(
      (log) =>
        ["Water", "Tea", "Coffee", "Juice", "Milk"].includes(log.typeOfFoodDrink) ||
        log.fluidConsumedMl
    );
  },
});

/**
 * OPTIMIZED PAGINATION for Documents Page
 * Returns paginated dates with report status
 * Prevents client-side generation of thousands of dates
 */
export const getPaginatedFoodFluidDates = query({
  args: {
    residentId: v.id("residents"),
    page: v.number(),
    pageSize: v.number(),
    year: v.optional(v.number()),
    month: v.optional(v.number()),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    // Get resident to determine date range
    const resident = await ctx.db.get(args.residentId);
    if (!resident) {
      return {
        dates: [],
        totalCount: 0,
        totalPages: 0,
        page: args.page,
        hasNextPage: false,
        hasPreviousPage: false,
      };
    }

    // Determine date range
    let startDate: Date;
    let endDate = new Date();

    if (args.year && args.month) {
      // Specific month and year
      startDate = new Date(args.year, args.month - 1, 1);
      endDate = new Date(args.year, args.month, 0); // Last day of month
    } else if (args.year) {
      // Specific year
      startDate = new Date(args.year, 0, 1);
      endDate = new Date(args.year, 11, 31);
    } else {
      // All time (from resident creation to today)
      startDate = resident.createdAt
        ? new Date(resident.createdAt)
        : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      endDate = new Date();
    }

    // Get all logs in the date range
    const logs = await ctx.db
      .query("foodFluidLogs")
      .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
      .filter((q) =>
        q.and(
          q.gte(q.field("timestamp"), startDate.getTime()),
          q.lte(q.field("timestamp"), endDate.getTime())
        )
      )
      .collect();

    // Get unique dates that have logs
    const datesWithLogs = new Set(logs.map((log) => log.date));

    // Generate all dates in range
    const allDates: Array<{ date: string; hasReport: boolean }> = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0];
      allDates.push({
        date: dateStr,
        hasReport: datesWithLogs.has(dateStr),
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Sort dates
    const sortOrder = args.sortOrder || "desc";
    allDates.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    // Calculate pagination
    const totalCount = allDates.length;
    const totalPages = Math.ceil(totalCount / args.pageSize);
    const startIndex = (args.page - 1) * args.pageSize;
    const endIndex = startIndex + args.pageSize;

    // Get page of results
    const paginatedDates = allDates.slice(startIndex, endIndex);

    return {
      dates: paginatedDates,
      totalCount,
      totalPages,
      page: args.page,
      pageSize: args.pageSize,
      hasNextPage: args.page < totalPages,
      hasPreviousPage: args.page > 1,
    };
  },
});

/**
 * LEGACY: CURSOR-BASED PAGINATION for Documents Page
 * @deprecated Use getPaginatedFoodFluidDates instead
 */
export const getFilteredDates = query({
  args: {
    residentId: v.id("residents"),
    year: v.optional(v.number()),
    month: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("foodFluidLogs")
      .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId));

    const logs = await query.collect();

    // Get unique dates
    const uniqueDates = [...new Set(logs.map((log) => log.date))];

    // Server-side filtering
    let filteredDates = uniqueDates;

    if (args.year) {
      filteredDates = filteredDates.filter(
        (date) => new Date(date).getFullYear() === args.year
      );
    }

    if (args.month) {
      filteredDates = filteredDates.filter(
        (date) => new Date(date).getMonth() + 1 === args.month
      );
    }

    // Sort descending
    filteredDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    // Limit results
    return filteredDates.slice(0, args.limit || 100);
  },
});

/**
 * DATE RANGE QUERY (for performance)
 * Use timestamp index for fast range queries
 */
export const getLogsInDateRange = query({
  args: {
    residentId: v.id("residents"),
    startDate: v.number(), // timestamp
    endDate: v.number(), // timestamp
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("foodFluidLogs")
      .withIndex("by_resident_timestamp", (q) => q.eq("residentId", args.residentId))
      .filter((q) =>
        q.and(
          q.gte(q.field("timestamp"), args.startDate),
          q.lte(q.field("timestamp"), args.endDate)
        )
      )
      .order("desc")
      .take(args.limit || 100);

    return logs;
  },
});

/**
 * AUTO-ARCHIVE: Archive logs older than 6 months
 * Scheduled job to run daily
 */
export const autoArchiveOldLogs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sixMonthsAgo = Date.now() - 6 * 30 * 24 * 60 * 60 * 1000;
    const sixMonthsAgoDate = new Date(sixMonthsAgo).toISOString().split("T")[0];

    // Find logs older than 6 months that aren't archived
    const oldLogs = await ctx.db
      .query("foodFluidLogs")
      .withIndex("by_archived_date")
      .filter((q) =>
        q.and(
          q.or(
            q.eq(q.field("isArchived"), false),
            q.eq(q.field("isArchived"), undefined)
          ),
          q.lt(q.field("timestamp"), sixMonthsAgo)
        )
      )
      .collect();

    const now = Date.now();

    // Archive them
    const archivePromises = oldLogs.map((log) =>
      ctx.db.patch(log._id, {
        isArchived: true,
        archivedAt: now,
        updatedAt: now,
      })
    );

    await Promise.all(archivePromises);

    return {
      archivedCount: oldLogs.length,
      olderThan: sixMonthsAgoDate,
      archivedAt: now,
    };
  },
});