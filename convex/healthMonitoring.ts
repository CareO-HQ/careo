import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create a vital record
export const createVitalRecord = mutation({
  args: {
    residentId: v.id("residents"),
    vitalType: v.union(
      v.literal("temperature"),
      v.literal("bloodPressure"),
      v.literal("heartRate"),
      v.literal("respiratoryRate"),
      v.literal("oxygenSaturation"),
      v.literal("weight"),
      v.literal("height"),
      v.literal("glucoseLevel"),
      v.literal("painLevel")
    ),
    value: v.string(),
    value2: v.optional(v.string()), // For blood pressure diastolic
    unit: v.optional(v.string()),
    notes: v.optional(v.string()),
    recordedBy: v.string(),
    recordDate: v.string(),
    recordTime: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    return await ctx.db.insert("vitals", {
      ...args,
      createdAt: Date.now(),
      createdBy: identity.subject,
    });
  },
});

// Get latest vitals for a resident
export const getLatestVitals = query({
  args: {
    residentId: v.id("residents"),
  },
  handler: async (ctx, args) => {
    // Get the most recent vital for each type
    const vitalTypes = [
      "temperature",
      "bloodPressure",
      "heartRate",
      "respiratoryRate",
      "oxygenSaturation",
      "weight",
      "glucoseLevel",
    ] as const;

    const latestVitals: Record<string, any> = {};

    for (const vitalType of vitalTypes) {
      const vital = await ctx.db
        .query("vitals")
        .withIndex("byResidentAndType", (q) =>
          q.eq("residentId", args.residentId).eq("vitalType", vitalType as any)
        )
        .order("desc")
        .first();

      if (vital) {
        latestVitals[vitalType] = vital;
      }
    }

    return latestVitals;
  },
});

// Get recent vitals history
export const getRecentVitals = query({
  args: {
    residentId: v.id("residents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    const vitals = await ctx.db
      .query("vitals")
      .withIndex("byResident", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .take(limit);

    return vitals;
  },
});

// Get vitals by date range
export const getVitalsByDateRange = query({
  args: {
    residentId: v.id("residents"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const vitals = await ctx.db
      .query("vitals")
      .withIndex("byResident", (q) => q.eq("residentId", args.residentId))
      .filter((q) =>
        q.and(
          q.gte(q.field("recordDate"), args.startDate),
          q.lte(q.field("recordDate"), args.endDate)
        )
      )
      .order("desc")
      .collect();

    return vitals;
  },
});