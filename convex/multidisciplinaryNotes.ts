import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get all notes for a resident
export const getByResidentId = query({
  args: { residentId: v.id("residents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("multidisciplinaryNotes")
      .withIndex("byResident", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();
  },
});

// Create a new note
export const create = mutation({
  args: {
    residentId: v.id("residents"),
    teamMemberId: v.union(v.id("multidisciplinaryCareTeam"), v.string()),
    teamMemberName: v.string(),
    reasonForVisit: v.string(),
    outcome: v.string(),
    relativeInformed: v.union(v.literal("yes"), v.literal("no")),
    relativeInformedDetails: v.optional(v.string()),
    signature: v.string(),
    noteDate: v.string(),
    noteTime: v.string(),
    organizationId: v.string(),
    teamId: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const noteId = await ctx.db.insert("multidisciplinaryNotes", {
      residentId: args.residentId,
      teamMemberId: args.teamMemberId,
      teamMemberName: args.teamMemberName,
      reasonForVisit: args.reasonForVisit,
      outcome: args.outcome,
      relativeInformed: args.relativeInformed,
      relativeInformedDetails: args.relativeInformedDetails,
      signature: args.signature,
      noteDate: args.noteDate,
      noteTime: args.noteTime,
      organizationId: args.organizationId,
      teamId: args.teamId,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });

    return noteId;
  },
});

// Update a note
export const update = mutation({
  args: {
    id: v.id("multidisciplinaryNotes"),
    teamMemberId: v.optional(v.union(v.id("multidisciplinaryCareTeam"), v.string())),
    teamMemberName: v.optional(v.string()),
    reasonForVisit: v.optional(v.string()),
    outcome: v.optional(v.string()),
    relativeInformed: v.optional(v.union(v.literal("yes"), v.literal("no"))),
    relativeInformedDetails: v.optional(v.string()),
    signature: v.optional(v.string()),
    noteDate: v.optional(v.string()),
    noteTime: v.optional(v.string()),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, updatedBy, ...updates } = args;

    await ctx.db.patch(id, {
      ...updates,
      updatedBy,
      updatedAt: Date.now(),
    });

    return id;
  },
});

// Delete a note
export const remove = mutation({
  args: {
    id: v.id("multidisciplinaryNotes"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Get notes by team member
export const getByTeamMember = query({
  args: {
    residentId: v.id("residents"),
    teamMemberId: v.union(v.id("multidisciplinaryCareTeam"), v.string())
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("multidisciplinaryNotes")
      .withIndex("byResident", (q) => q.eq("residentId", args.residentId))
      .filter((q) => q.eq(q.field("teamMemberId"), args.teamMemberId))
      .order("desc")
      .collect();
  },
});