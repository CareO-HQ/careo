import { v } from "convex/values";
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get handover report for a resident (food intake, fluid total, incidents)
export const getHandoverReport = query({
  args: {
    residentId: v.id("residents"),
  },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Get today's food/fluid logs
    const foodFluidLogs = await ctx.db
      .query("foodFluidLogs")
      .withIndex("byResidentAndDate", (q) =>
        q.eq("residentId", args.residentId).eq("date", today)
      )
      .filter((q) => q.neq(q.field("isArchived"), true))
      .collect();

    // Calculate total fluid intake and get details
    const fluidLogs = foodFluidLogs.filter(log => log.fluidConsumedMl && log.fluidConsumedMl > 0);
    const totalFluid = fluidLogs.reduce((sum, log) => {
      return sum + (log.fluidConsumedMl || 0);
    }, 0);

    // Count food intake entries and get details
    const foodIntakeLogs = foodFluidLogs.filter(log =>
      log.typeOfFoodDrink && log.amountEaten
    );
    const foodIntakeCount = foodIntakeLogs.length;

    // Get today's incidents
    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .filter((q) => q.eq(q.field("date"), today))
      .collect();

    // Get today's hospital transfer logs
    const hospitalTransfers = await ctx.db
      .query("hospitalTransferLogs")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .filter((q) => q.eq(q.field("date"), today))
      .collect();

    return {
      foodIntakeCount,
      foodIntakeLogs: foodIntakeLogs.map(log => ({
        id: log._id,
        typeOfFoodDrink: log.typeOfFoodDrink,
        amountEaten: log.amountEaten,
        section: log.section,
        timestamp: log.timestamp,
      })),
      totalFluid,
      fluidLogs: fluidLogs.map(log => ({
        id: log._id,
        typeOfFoodDrink: log.typeOfFoodDrink,
        fluidConsumedMl: log.fluidConsumedMl,
        section: log.section,
        timestamp: log.timestamp,
      })),
      incidentCount: incidents.length,
      incidents: incidents.map(inc => ({
        id: inc._id,
        type: inc.incidentTypes || [],
        level: inc.incidentLevel,
        time: inc.time,
      })),
      hospitalTransferCount: hospitalTransfers.length,
      hospitalTransfers: hospitalTransfers.map(transfer => ({
        id: transfer._id,
        hospitalName: transfer.hospitalName,
        reason: transfer.reason,
      })),
    };
  },
});