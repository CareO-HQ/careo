import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Save/archive a handover report
export const saveHandoverReport = mutation({
  args: {
    date: v.string(),
    shift: v.union(v.literal("day"), v.literal("night")),
    teamId: v.string(),
    teamName: v.string(),
    organizationId: v.string(),
    residentHandovers: v.array(
      v.object({
        residentId: v.id("residents"),
        residentName: v.string(),
        roomNumber: v.optional(v.string()),
        age: v.number(),
        foodIntakeCount: v.number(),
        totalFluid: v.number(),
        incidentCount: v.number(),
        hospitalTransferCount: v.number(),
        comments: v.optional(v.string()),
      })
    ),
    createdBy: v.string(),
    createdByName: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if a handover report already exists for this team, date, and shift
    const existingReport = await ctx.db
      .query("handoverReports")
      .withIndex("by_team_and_date", (q) =>
        q.eq("teamId", args.teamId).eq("date", args.date)
      )
      .filter((q) => q.eq(q.field("shift"), args.shift))
      .first();

    if (existingReport) {
      // Update existing report
      await ctx.db.patch(existingReport._id, {
        residentHandovers: args.residentHandovers,
        updatedAt: now,
      });
      return existingReport._id;
    } else {
      // Create new report
      const reportId = await ctx.db.insert("handoverReports", {
        date: args.date,
        shift: args.shift,
        teamId: args.teamId,
        teamName: args.teamName,
        organizationId: args.organizationId,
        residentHandovers: args.residentHandovers,
        createdBy: args.createdBy,
        createdByName: args.createdByName,
        createdAt: now,
      });
      return reportId;
    }
  },
});

// Get all handover reports for an organization
export const getAllHandoverReports = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("handoverReports")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .collect();

    return reports;
  },
});

// Get handover reports by team
export const getHandoverReportsByTeam = query({
  args: {
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("handoverReports")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .order("desc")
      .collect();

    return reports;
  },
});

// Get a specific handover report by ID
export const getHandoverReportById = query({
  args: {
    reportId: v.id("handoverReports"),
  },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    return report;
  },
});

// Get handover report by date and shift for a team
export const getHandoverReportByDateAndShift = query({
  args: {
    teamId: v.string(),
    date: v.string(),
    shift: v.union(v.literal("day"), v.literal("night")),
  },
  handler: async (ctx, args) => {
    const report = await ctx.db
      .query("handoverReports")
      .withIndex("by_team_and_date", (q) =>
        q.eq("teamId", args.teamId).eq("date", args.date)
      )
      .filter((q) => q.eq(q.field("shift"), args.shift))
      .first();

    return report;
  },
});

// Delete a handover report
export const deleteHandoverReport = mutation({
  args: {
    reportId: v.id("handoverReports"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.reportId);
  },
});

// Get the last handover timestamp for a team (to filter new data)
export const getLastHandoverTimestamp = query({
  args: {
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    const lastHandover = await ctx.db
      .query("handoverReports")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .order("desc")
      .first();

    return lastHandover?.createdAt ?? null;
  },
});