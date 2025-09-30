import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create a new Hospital Transfer Log
export const create = mutation({
  args: {
    residentId: v.id("residents"),
    date: v.string(),
    hospitalName: v.string(),
    reason: v.string(),
    outcome: v.optional(v.string()),
    followUp: v.optional(v.string()),
    filesChanged: v.optional(v.object({
      carePlan: v.boolean(),
      riskAssessment: v.boolean(),
      other: v.optional(v.string()),
    })),
    medicationChanges: v.optional(v.object({
      medicationsAdded: v.boolean(),
      addedMedications: v.optional(v.string()),
      medicationsRemoved: v.boolean(),
      removedMedications: v.optional(v.string()),
      medicationsModified: v.boolean(),
      modifiedMedications: v.optional(v.string()),
    })),
    organizationId: v.string(),
    teamId: v.string(),
    createdBy: v.string(),
  },
  returns: v.id("hospitalTransferLogs"),
  handler: async (ctx, args) => {
    const now = Date.now();

    const transferLogId = await ctx.db.insert("hospitalTransferLogs", {
      residentId: args.residentId,
      date: args.date,
      hospitalName: args.hospitalName,
      reason: args.reason,
      outcome: args.outcome,
      followUp: args.followUp,
      filesChanged: args.filesChanged,
      medicationChanges: args.medicationChanges,
      organizationId: args.organizationId,
      teamId: args.teamId,
      createdBy: args.createdBy,
      createdAt: now,
    });

    return transferLogId;
  }
});

// Get Hospital Transfer Logs by resident ID
export const getByResidentId = query({
  args: { residentId: v.id("residents") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("hospitalTransferLogs")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();
  },
});

// Get Hospital Transfer Logs by organization
export const getByOrganization = query({
  args: { organizationId: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("hospitalTransferLogs")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .collect();
  },
});

// Get Hospital Transfer Logs by team
export const getByTeam = query({
  args: { teamId: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("hospitalTransferLogs")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .order("desc")
      .collect();
  },
});

// Get a specific Hospital Transfer Log by ID
export const getById = query({
  args: { transferLogId: v.id("hospitalTransferLogs") },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.transferLogId);
  },
});

// Update Hospital Transfer Log
export const update = mutation({
  args: {
    transferLogId: v.id("hospitalTransferLogs"),
    date: v.string(),
    hospitalName: v.string(),
    reason: v.string(),
    outcome: v.optional(v.string()),
    followUp: v.optional(v.string()),
    filesChanged: v.optional(v.object({
      carePlan: v.boolean(),
      riskAssessment: v.boolean(),
      other: v.optional(v.string()),
    })),
    medicationChanges: v.optional(v.object({
      medicationsAdded: v.boolean(),
      addedMedications: v.optional(v.string()),
      medicationsRemoved: v.boolean(),
      removedMedications: v.optional(v.string()),
      medicationsModified: v.boolean(),
      modifiedMedications: v.optional(v.string()),
    })),
  },
  returns: v.id("hospitalTransferLogs"),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.transferLogId, {
      date: args.date,
      hospitalName: args.hospitalName,
      reason: args.reason,
      outcome: args.outcome,
      followUp: args.followUp,
      filesChanged: args.filesChanged,
      medicationChanges: args.medicationChanges,
      updatedAt: Date.now(),
    });

    return args.transferLogId;
  }
});

// Delete Hospital Transfer Log
export const deleteTransferLog = mutation({
  args: { transferLogId: v.id("hospitalTransferLogs") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.transferLogId);
    return true;
  }
});