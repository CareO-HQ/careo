import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create a clinical note
export const createClinicalNote = mutation({
  args: {
    residentId: v.id("residents"),
    staffName: v.string(),
    staffEmail: v.string(),
    noteContent: v.string(),
    category: v.optional(v.string()),
    noteDate: v.string(),
    noteTime: v.optional(v.string()),
    organizationId: v.string(),
    teamId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    return await ctx.db.insert("clinicalNotes", {
      ...args,
      createdAt: Date.now(),
      createdBy: identity.subject,
    });
  },
});

// Get clinical notes for a resident
export const getClinicalNotesByResident = query({
  args: {
    residentId: v.id("residents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    const notes = await ctx.db
      .query("clinicalNotes")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .take(limit);

    return notes;
  },
});

// Get recent clinical notes (last N notes)
export const getRecentClinicalNotes = query({
  args: {
    residentId: v.id("residents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    const notes = await ctx.db
      .query("clinicalNotes")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .take(limit);

    return notes;
  },
});

// Get clinical notes by date range
export const getClinicalNotesByDateRange = query({
  args: {
    residentId: v.id("residents"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const allNotes = await ctx.db
      .query("clinicalNotes")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    // Filter by date range
    return allNotes.filter(
      (note) => note.noteDate >= args.startDate && note.noteDate <= args.endDate
    );
  },
});

// Update a clinical note
export const updateClinicalNote = mutation({
  args: {
    noteId: v.id("clinicalNotes"),
    noteContent: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const { noteId, ...updates } = args;

    await ctx.db.patch(noteId, {
      ...updates,
      updatedAt: Date.now(),
      updatedBy: identity.subject,
    });

    return noteId;
  },
});

// Delete a clinical note
export const deleteClinicalNote = mutation({
  args: {
    noteId: v.id("clinicalNotes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.noteId);
    return args.noteId;
  },
});
