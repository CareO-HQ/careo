import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Create a new food/fluid log entry
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
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const logEntry = await ctx.db.insert("foodFluidLogs", {
      residentId: args.residentId,
      timestamp: now,
      section: args.section,
      typeOfFoodDrink: args.typeOfFoodDrink,
      portionServed: args.portionServed,
      amountEaten: args.amountEaten,
      fluidConsumedMl: args.fluidConsumedMl,
      signature: args.signature,
      date: today,
      isArchived: false,
      organizationId: args.organizationId,
      createdBy: args.createdBy,
      createdAt: now,
    });
    
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