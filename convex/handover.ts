import { v } from "convex/values";
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get handover report for a resident (food intake, fluid total, incidents)
export const getHandoverReport = query({
  args: {
    residentId: v.id("residents"),
    afterTimestamp: v.optional(v.number()), // Only get data after this timestamp
  },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Get today's food/fluid logs
    let foodFluidLogsQuery = ctx.db
      .query("foodFluidLogs")
      .withIndex("byResidentAndDate", (q) =>
        q.eq("residentId", args.residentId).eq("date", today)
      )
      .filter((q) => q.neq(q.field("isArchived"), true));

    // Filter by timestamp if provided
    if (args.afterTimestamp) {
      foodFluidLogsQuery = foodFluidLogsQuery.filter((q) =>
        q.gt(q.field("timestamp"), args.afterTimestamp!)
      );
    }

    const foodFluidLogs = await foodFluidLogsQuery.collect();

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
    let incidentsQuery = ctx.db
      .query("incidents")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .filter((q) => q.eq(q.field("date"), today));

    // Filter incidents by timestamp if provided
    if (args.afterTimestamp) {
      incidentsQuery = incidentsQuery.filter((q) =>
        q.gt(q.field("createdAt"), args.afterTimestamp!)
      );
    }

    const incidents = await incidentsQuery.collect();

    // Get today's hospital transfer logs
    let hospitalTransfersQuery = ctx.db
      .query("hospitalTransferLogs")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .filter((q) => q.eq(q.field("date"), today));

    // Filter hospital transfers by timestamp if provided
    if (args.afterTimestamp) {
      hospitalTransfersQuery = hospitalTransfersQuery.filter((q) =>
        q.gt(q.field("createdAt"), args.afterTimestamp!)
      );
    }

    const hospitalTransfers = await hospitalTransfersQuery.collect();

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