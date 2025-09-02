import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Query to get daily personal care record for a resident
export const getDailyPersonalCare = query({
  args: {
    residentId: v.id("residents"),
    date: v.string(), // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    const daily = await ctx.db
      .query("personalCareDaily")
      .withIndex("by_resident_date", (q) =>
        q.eq("residentId", args.residentId).eq("date", args.date)
      )
      .first();

    if (!daily) {
      return null;
    }

    // Get all task events for this daily record
    const taskEvents = await ctx.db
      .query("personalCareTaskEvents")
      .withIndex("by_daily", (q) => q.eq("dailyId", daily._id))
      .collect();

    return {
      daily,
      tasks: taskEvents,
    };
  },
});

// Query to get the latest status for each task type for a given day
export const getPersonalCareTaskStatuses = query({
  args: {
    residentId: v.id("residents"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const daily = await ctx.db
      .query("personalCareDaily")
      .withIndex("by_resident_date", (q) =>
        q.eq("residentId", args.residentId).eq("date", args.date)
      )
      .first();

    if (!daily) {
      return {};
    }

    const taskEvents = await ctx.db
      .query("personalCareTaskEvents")
      .withIndex("by_daily", (q) => q.eq("dailyId", daily._id))
      .collect();

    // Group by task type and get the latest status for each
    const taskStatuses: Record<string, any> = {};
    
    taskEvents.forEach((event) => {
      if (!taskStatuses[event.taskType] || taskStatuses[event.taskType].createdAt < event.createdAt) {
        taskStatuses[event.taskType] = event;
      }
    });

    return taskStatuses;
  },
});

// Query to get all personal care records for a resident
export const getAllPersonalCareRecords = query({
  args: {
    residentId: v.id("residents"),
  },
  handler: async (ctx, args) => {
    // Get all daily records for the resident
    const dailyRecords = await ctx.db
      .query("personalCareDaily")
      .filter((q) => q.eq(q.field("residentId"), args.residentId))
      .collect();

    const allRecords = [];

    for (const daily of dailyRecords) {
      // Get all task events for this daily record
      const taskEvents = await ctx.db
        .query("personalCareTaskEvents")
        .withIndex("by_daily", (q) => q.eq("dailyId", daily._id))
        .collect();

      // Add each task event with daily info
      for (const event of taskEvents) {
        allRecords.push({
          ...event,
          date: daily.date,
          shift: daily.shift,
          dailyStatus: daily.status,
        });
      }
    }

    // Sort by creation time, newest first
    return allRecords.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Mutation to create or update daily personal care record
export const createDailyPersonalCare = mutation({
  args: {
    residentId: v.id("residents"),
    date: v.string(),
    shift: v.optional(v.union(v.literal("AM"), v.literal("PM"), v.literal("Night"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if daily record already exists
    const existing = await ctx.db
      .query("personalCareDaily")
      .withIndex("by_resident_date", (q) =>
        q.eq("residentId", args.residentId).eq("date", args.date)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    // Create new daily record
    const dailyId = await ctx.db.insert("personalCareDaily", {
      residentId: args.residentId,
      date: args.date,
      shift: args.shift,
      status: "open",
      createdBy: user._id,
      createdAt: Date.now(),
    });

    return dailyId;
  },
});

// Mutation to update a personal care task status
export const updatePersonalCareTask = mutation({
  args: {
    residentId: v.id("residents"),
    date: v.string(),
    taskType: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("partially_completed"),
      v.literal("not_required"),
      v.literal("refused"),
      v.literal("unable"),
      v.literal("missed"),
    ),
    timePeriod: v.optional(v.union(
      v.literal("morning"),
      v.literal("afternoon"),
      v.literal("evening"),
      v.literal("night"),
    )),
    notes: v.optional(v.string()),
    assistanceLevel: v.optional(v.union(
      v.literal("independent"),
      v.literal("prompting"),
      v.literal("supervision"),
      v.literal("one_carer"),
      v.literal("two_carers"),
      v.literal("hoist_or_mechanical"),
    )),
    reasonCode: v.optional(v.union(
      v.literal("resident_refused"),
      v.literal("asleep"),
      v.literal("off_site"),
      v.literal("hospital"),
      v.literal("end_of_life_care"),
      v.literal("clinical_hold"),
      v.literal("behavioural_risk"),
      v.literal("equipment_fault"),
      v.literal("unsafe_to_proceed"),
      v.literal("not_in_care_plan"),
      v.literal("other"),
    )),
    reasonNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get or create daily record
    let daily = await ctx.db
      .query("personalCareDaily")
      .withIndex("by_resident_date", (q) =>
        q.eq("residentId", args.residentId).eq("date", args.date)
      )
      .first();

    if (!daily) {
      const dailyId = await ctx.db.insert("personalCareDaily", {
        residentId: args.residentId,
        date: args.date,
        status: "open",
        createdBy: user._id,
        createdAt: Date.now(),
      });
      daily = await ctx.db.get(dailyId);
    }

    if (!daily) {
      throw new Error("Could not create or retrieve daily record");
    }

    // Create task event
    const taskEventId = await ctx.db.insert("personalCareTaskEvents", {
      dailyId: daily._id,
      taskType: args.taskType,
      status: args.status,
      performedBy: user._id,
      notes: args.notes,
      assistanceLevel: args.assistanceLevel,
      reasonCode: args.reasonCode,
      reasonNote: args.reasonNote,
      completedAt: args.status === "completed" ? new Date().toISOString() : undefined,
      startedAt: args.status === "in_progress" ? new Date().toISOString() : undefined,
      payload: args.timePeriod ? { timePeriod: args.timePeriod } : undefined,
      createdAt: Date.now(),
    });

    // Update daily record's updatedAt and updatedBy
    await ctx.db.patch(daily._id, {
      updatedBy: user._id,
      updatedAt: Date.now(),
    });

    return taskEventId;
  },
});

// Mutation to add notes to daily personal care
export const addDailyPersonalCareNotes = mutation({
  args: {
    residentId: v.id("residents"),
    date: v.string(),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get or create daily record
    let daily = await ctx.db
      .query("personalCareDaily")
      .withIndex("by_resident_date", (q) =>
        q.eq("residentId", args.residentId).eq("date", args.date)
      )
      .first();

    if (!daily) {
      const dailyId = await ctx.db.insert("personalCareDaily", {
        residentId: args.residentId,
        date: args.date,
        status: "open",
        createdBy: user._id,
        createdAt: Date.now(),
      });
      daily = await ctx.db.get(dailyId);
    }

    if (!daily) {
      throw new Error("Could not create or retrieve daily record");
    }

    // Create a general notes task event
    const taskEventId = await ctx.db.insert("personalCareTaskEvents", {
      dailyId: daily._id,
      taskType: "general_notes",
      status: "completed",
      performedBy: user._id,
      notes: args.notes,
      completedAt: new Date().toISOString(),
      createdAt: Date.now(),
    });

    // Update daily record
    await ctx.db.patch(daily._id, {
      updatedBy: user._id,
      updatedAt: Date.now(),
    });

    return taskEventId;
  },
});