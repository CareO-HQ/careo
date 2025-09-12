import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Query to get daily personal care record for a resident
export const getDailyPersonalCare = query({
  args: {
    residentId: v.id("residents"),
    date: v.string(), // "YYYY-MM-DD"
    shift: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    // Convert shift to database format
    const dbShift =
      args.shift === "Day"
        ? "AM"
        : args.shift === "Night"
          ? "Night"
          : undefined;

    let daily = await ctx.db
      .query("personalCareDaily")
      .withIndex("by_resident_date", (q) =>
        q.eq("residentId", args.residentId).eq("date", args.date)
      )
      .filter((q) =>
        dbShift
          ? q.eq(q.field("shift"), dbShift)
          : q.neq(q.field("shift"), null)
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
      tasks: taskEvents
    };
  }
});

// Query to get the latest status for each task type for a given day
export const getPersonalCareTaskStatuses = query({
  args: {
    residentId: v.id("residents"),
    date: v.string()
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
      if (
        !taskStatuses[event.taskType] ||
        taskStatuses[event.taskType].createdAt < event.createdAt
      ) {
        taskStatuses[event.taskType] = event;
      }
    });

    return taskStatuses;
  }
});

// Query to get all personal care records for a resident
export const getAllPersonalCareRecords = query({
  args: {
    residentId: v.id("residents")
  },
  handler: async (ctx, args) => {
    // Get all daily records for the resident
    const dailyRecords = await ctx.db
      .query("personalCareDaily")
      .filter((q) => q.eq(q.field("residentId"), args.residentId))
      .collect();

    const allRecords: any[] = [];

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
          dailyStatus: daily.status
        });
      }
    }

    // Sort by creation time, newest first
    return allRecords.sort((a, b) => b.createdAt - a.createdAt);
  }
});

// Mutation to create or update daily personal care record
export const createDailyPersonalCare = mutation({
  args: {
    residentId: v.id("residents"),
    date: v.string(),
    shift: v.optional(
      v.union(v.literal("AM"), v.literal("PM"), v.literal("Night"))
    )
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
      createdAt: Date.now()
    });

    return dailyId;
  }
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
      v.literal("missed")
    ),
    timePeriod: v.optional(
      v.union(
        v.literal("morning"),
        v.literal("afternoon"),
        v.literal("evening"),
        v.literal("night")
      )
    ),
    notes: v.optional(v.string()),
    assistanceLevel: v.optional(
      v.union(
        v.literal("independent"),
        v.literal("prompting"),
        v.literal("supervision"),
        v.literal("one_carer"),
        v.literal("two_carers"),
        v.literal("hoist_or_mechanical")
      )
    ),
    reasonCode: v.optional(
      v.union(
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
        v.literal("other")
      )
    ),
    reasonNote: v.optional(v.string())
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
        createdAt: Date.now()
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
      completedAt:
        args.status === "completed" ? new Date().toISOString() : undefined,
      startedAt:
        args.status === "in_progress" ? new Date().toISOString() : undefined,
      payload: args.timePeriod ? { timePeriod: args.timePeriod } : undefined,
      createdAt: Date.now()
    });

    // Update daily record's updatedAt and updatedBy
    await ctx.db.patch(daily._id, {
      updatedBy: user._id,
      updatedAt: Date.now()
    });

    return taskEventId;
  }
});

// Mutation to add notes to daily personal care
export const addDailyPersonalCareNotes = mutation({
  args: {
    residentId: v.id("residents"),
    date: v.string(),
    notes: v.string()
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
        createdAt: Date.now()
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
      createdAt: Date.now()
    });

    // Update daily record
    await ctx.db.patch(daily._id, {
      updatedBy: user._id,
      updatedAt: Date.now()
    });

    return taskEventId;
  }
});

// Mutation to create personal care activities with enhanced data
export const createPersonalCareActivities = mutation({
  args: {
    residentId: v.id("residents"),
    date: v.string(),
    activities: v.array(v.string()),
    time: v.string(),
    staff: v.optional(v.string()),
    assistedStaff: v.optional(v.string()),
    notes: v.optional(v.string()),
    shift: v.optional(v.string())
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
        shift: args.shift === "Day" ? "AM" : "Night",
        status: "open",
        createdBy: user._id,
        createdAt: Date.now()
      });
      daily = await ctx.db.get(dailyId);
    }

    if (!daily) {
      throw new Error("Could not create or retrieve daily record");
    }

    // Create task events for each activity
    const taskEventIds: any[] = [];
    for (const activity of args.activities) {
      const taskEventId = await ctx.db.insert("personalCareTaskEvents", {
        dailyId: daily._id,
        taskType: activity,
        status: "completed",
        performedBy: user._id,
        notes: args.notes,
        completedAt: new Date().toISOString(),
        payload: {
          time: args.time,
          primaryStaff: args.staff,
          assistedStaff: args.assistedStaff
        },
        createdAt: Date.now()
      });
      taskEventIds.push(taskEventId);
    }

    // Update daily record
    await ctx.db.patch(daily._id, {
      updatedBy: user._id,
      updatedAt: Date.now()
    });

    return taskEventIds;
  }
});

// Query to get day/night report
export const getDayNightReport = query({
  args: {
    residentId: v.id("residents"),
    date: v.string(), // "YYYY-MM-DD"
    reportType: v.union(v.literal("day"), v.literal("night"))
  },
  handler: async (ctx, args) => {
    // Get all daily records for the specified date
    const dailyRecords = await ctx.db
      .query("personalCareDaily")
      .withIndex("by_resident_date", (q) =>
        q.eq("residentId", args.residentId).eq("date", args.date)
      )
      .collect();

    if (dailyRecords.length === 0) {
      return { activities: [], reportGenerated: false };
    }

    const allActivities: any[] = [];

    // Collect all task events from all daily records for this date
    for (const daily of dailyRecords) {
      const taskEvents = await ctx.db
        .query("personalCareTaskEvents")
        .withIndex("by_daily", (q) => q.eq("dailyId", daily._id))
        .collect();

      // Filter activities based on time for day/night reports
      for (const event of taskEvents) {
        const shouldInclude = filterActivityByTimeAndReport(event, args.reportType);
        
        if (shouldInclude) {
          allActivities.push({
            ...event,
            date: daily.date,
            shift: daily.shift
          });
        }
      }
    }

    // Sort activities by creation time
    allActivities.sort((a, b) => a.createdAt - b.createdAt);

    return {
      activities: allActivities,
      reportGenerated: true,
      reportType: args.reportType,
      date: args.date
    };
  }
});

function filterActivityByTimeAndReport(activity: any, reportType: "day" | "night"): boolean {
  // If no completion time, include based on creation time
  const timeToCheck = activity.completedAt || activity.startedAt;
  
  if (!timeToCheck) {
    // If no specific time, use creation timestamp
    const creationDate = new Date(activity.createdAt);
    const hour = creationDate.getHours();
    
    if (reportType === "day") {
      return hour >= 8 && hour < 20; // 8 AM - 8 PM
    } else {
      return hour >= 20 || hour < 8; // 8 PM - 8 AM
    }
  }

  // Parse the ISO string time
  const activityTime = new Date(timeToCheck);
  const hour = activityTime.getHours();

  if (reportType === "day") {
    return hour >= 8 && hour < 20; // 8 AM - 8 PM
  } else {
    return hour >= 20 || hour < 8; // 8 PM - 8 AM
  }
}

// Mutation to create daily activity record entry
export const createDailyActivityRecord = mutation({
  args: {
    residentId: v.id("residents"),
    date: v.string(),
    time: v.string(),
    staff: v.string(),
    notes: v.optional(v.string()),
    shift: v.optional(v.string())
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
        shift: args.shift === "Day" ? "AM" : "Night",
        status: "open",
        createdBy: user._id,
        createdAt: Date.now()
      });
      daily = await ctx.db.get(dailyId);
    }

    if (!daily) {
      throw new Error("Could not create or retrieve daily record");
    }

    // Create daily activity record task event
    const taskEventId = await ctx.db.insert("personalCareTaskEvents", {
      dailyId: daily._id,
      taskType: "daily_activity_record",
      status: "completed",
      performedBy: user._id,
      notes: args.notes,
      completedAt: new Date().toISOString(),
      payload: {
        time: args.time,
        staff: args.staff,
        activityType: "daily_activity_record"
      },
      createdAt: Date.now()
    });

    // Update daily record
    await ctx.db.patch(daily._id, {
      updatedBy: user._id,
      updatedAt: Date.now()
    });

    return taskEventId;
  }
});

// Internal cron job to generate day reports at 8 PM
export const generateDayReports = internalMutation({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Get all residents
    const residents = await ctx.db.query("residents").collect();
    
    for (const resident of residents) {
      try {
        // Check if there are activities for today that should be in a day report
        const dailyRecords = await ctx.db
          .query("personalCareDaily")
          .withIndex("by_resident_date", (q) =>
            q.eq("residentId", resident._id).eq("date", today)
          )
          .collect();

        if (dailyRecords.length > 0) {
          // For now, just log that we would generate a report
          console.log(`Generated day report for resident ${resident._id} on ${today}`);
        }
      } catch (error) {
        console.error(`Failed to generate day report for resident ${resident._id}:`, error);
      }
    }
  }
});

// Internal cron job to generate night reports at 8 AM
export const generateNightReports = internalMutation({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Get all residents
    const residents = await ctx.db.query("residents").collect();
    
    for (const resident of residents) {
      try {
        // Check for activities from yesterday evening and today morning (8 PM - 8 AM)
        const yesterdayRecords = await ctx.db
          .query("personalCareDaily")
          .withIndex("by_resident_date", (q) =>
            q.eq("residentId", resident._id).eq("date", yesterdayStr)
          )
          .collect();
          
        const todayRecords = await ctx.db
          .query("personalCareDaily")
          .withIndex("by_resident_date", (q) =>
            q.eq("residentId", resident._id).eq("date", today)
          )
          .collect();

        if (yesterdayRecords.length > 0 || todayRecords.length > 0) {
          // For now, just log that we would generate a report
          console.log(`Generated night report for resident ${resident._id} covering ${yesterdayStr} 8PM - ${today} 8AM`);
        }
      } catch (error) {
        console.error(`Failed to generate night report for resident ${resident._id}:`, error);
      }
    }
  }
});
