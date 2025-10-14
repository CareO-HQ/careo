import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new night check recording
export const create = mutation({
  args: {
    configurationId: v.id("nightCheckConfigurations"),
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    checkType: v.union(
      v.literal("night_check"),
      v.literal("positioning"),
      v.literal("pad_change"),
      v.literal("bed_rails"),
      v.literal("environmental"),
      v.literal("night_note"),
      v.literal("cleaning")
    ),
    recordDate: v.string(),
    recordTime: v.string(),
    recordDateTime: v.number(),
    checkData: v.any(),
    notes: v.optional(v.string()),
    recordedBy: v.string(),
    recordedByName: v.string(),
  },
  handler: async (ctx, args) => {
    const recordingId = await ctx.db.insert("nightCheckRecordings", {
      configurationId: args.configurationId,
      residentId: args.residentId,
      teamId: args.teamId,
      organizationId: args.organizationId,
      checkType: args.checkType,
      recordDate: args.recordDate,
      recordTime: args.recordTime,
      recordDateTime: args.recordDateTime,
      checkData: args.checkData,
      notes: args.notes,
      recordedBy: args.recordedBy,
      recordedByName: args.recordedByName,
      createdAt: Date.now(),
    });

    return recordingId;
  },
});

// Update an existing night check recording
export const update = mutation({
  args: {
    recordingId: v.id("nightCheckRecordings"),
    checkData: v.optional(v.any()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { recordingId, ...updates } = args;

    await ctx.db.patch(recordingId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return recordingId;
  },
});

// Delete a night check recording
export const remove = mutation({
  args: {
    recordingId: v.id("nightCheckRecordings"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.recordingId);
    return args.recordingId;
  },
});

// Get all recordings for a resident
export const getByResident = query({
  args: {
    residentId: v.id("residents"),
  },
  handler: async (ctx, args) => {
    const recordings = await ctx.db
      .query("nightCheckRecordings")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    return recordings;
  },
});

// Get recordings for a resident on a specific date
export const getByResidentAndDate = query({
  args: {
    residentId: v.id("residents"),
    recordDate: v.string(),
  },
  handler: async (ctx, args) => {
    const recordings = await ctx.db
      .query("nightCheckRecordings")
      .withIndex("by_resident_date", (q) =>
        q.eq("residentId", args.residentId).eq("recordDate", args.recordDate)
      )
      .order("desc")
      .collect();

    return recordings;
  },
});

// Get recordings by configuration
export const getByConfiguration = query({
  args: {
    configurationId: v.id("nightCheckConfigurations"),
  },
  handler: async (ctx, args) => {
    const recordings = await ctx.db
      .query("nightCheckRecordings")
      .withIndex("by_configuration", (q) =>
        q.eq("configurationId", args.configurationId)
      )
      .order("desc")
      .collect();

    return recordings;
  },
});

// Get recordings by check type
export const getByCheckType = query({
  args: {
    checkType: v.union(
      v.literal("night_check"),
      v.literal("positioning"),
      v.literal("pad_change"),
      v.literal("bed_rails"),
      v.literal("environmental"),
      v.literal("night_note"),
      v.literal("cleaning")
    ),
    residentId: v.optional(v.id("residents")),
  },
  handler: async (ctx, args) => {
    let recordings = await ctx.db
      .query("nightCheckRecordings")
      .withIndex("by_check_type", (q) => q.eq("checkType", args.checkType))
      .order("desc")
      .collect();

    if (args.residentId) {
      recordings = recordings.filter(
        (r) => r.residentId === args.residentId
      );
    }

    return recordings;
  },
});

// Get recordings for a team on a specific date
export const getByTeamAndDate = query({
  args: {
    teamId: v.string(),
    recordDate: v.string(),
  },
  handler: async (ctx, args) => {
    const recordings = await ctx.db
      .query("nightCheckRecordings")
      .withIndex("by_team_date", (q) =>
        q.eq("teamId", args.teamId).eq("recordDate", args.recordDate)
      )
      .order("desc")
      .collect();

    return recordings;
  },
});

// Get recordings for an organization on a specific date
export const getByOrganizationAndDate = query({
  args: {
    organizationId: v.string(),
    recordDate: v.string(),
  },
  handler: async (ctx, args) => {
    const recordings = await ctx.db
      .query("nightCheckRecordings")
      .withIndex("by_organization_date", (q) =>
        q.eq("organizationId", args.organizationId).eq("recordDate", args.recordDate)
      )
      .order("desc")
      .collect();

    return recordings;
  },
});

// Get recordings by recorded by user
export const getByRecordedBy = query({
  args: {
    recordedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const recordings = await ctx.db
      .query("nightCheckRecordings")
      .withIndex("by_recorded_by", (q) => q.eq("recordedBy", args.recordedBy))
      .order("desc")
      .collect();

    return recordings;
  },
});

// Get a specific recording by ID
export const getById = query({
  args: {
    recordingId: v.id("nightCheckRecordings"),
  },
  handler: async (ctx, args) => {
    const recording = await ctx.db.get(args.recordingId);
    return recording;
  },
});
