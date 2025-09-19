import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all progress notes for a resident
export const getByResidentId = query({
  args: { residentId: v.id("residents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("progressNotes")
      .withIndex("by_residentId", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();
  },
});

// Get a single progress note by ID
export const getById = query({
  args: { noteId: v.id("progressNotes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.noteId);
  },
});

// Create a new progress note
export const create = mutation({
  args: {
    residentId: v.id("residents"),
    type: v.union(
      v.literal("daily"),
      v.literal("incident"),
      v.literal("medical"),
      v.literal("behavioral"),
      v.literal("other")
    ),
    subject: v.string(),
    note: v.string(),
    mood: v.optional(
      v.union(
        v.literal("happy"),
        v.literal("calm"),
        v.literal("anxious"),
        v.literal("agitated"),
        v.literal("confused"),
        v.literal("sad"),
        v.literal("neutral")
      )
    ),
    participation: v.optional(
      v.union(
        v.literal("engaged"),
        v.literal("partially_engaged"),
        v.literal("refused"),
        v.literal("sleeping"),
        v.literal("not_applicable")
      )
    ),
    authorId: v.string(),
    authorName: v.string(),
    createdAt: v.string(),
    attachments: v.optional(v.array(v.id("_storage")))
  },
  handler: async (ctx, args) => {
    const noteId = await ctx.db.insert("progressNotes", {
      ...args,
      createdAt: args.createdAt || new Date().toISOString()
    });
    return noteId;
  },
});

// Update an existing progress note
export const update = mutation({
  args: {
    noteId: v.id("progressNotes"),
    type: v.optional(
      v.union(
        v.literal("daily"),
        v.literal("incident"),
        v.literal("medical"),
        v.literal("behavioral"),
        v.literal("other")
      )
    ),
    subject: v.optional(v.string()),
    note: v.optional(v.string()),
    mood: v.optional(
      v.union(
        v.literal("happy"),
        v.literal("calm"),
        v.literal("anxious"),
        v.literal("agitated"),
        v.literal("confused"),
        v.literal("sad"),
        v.literal("neutral")
      )
    ),
    participation: v.optional(
      v.union(
        v.literal("engaged"),
        v.literal("partially_engaged"),
        v.literal("refused"),
        v.literal("sleeping"),
        v.literal("not_applicable")
      )
    )
  },
  handler: async (ctx, args) => {
    const { noteId, ...updateData } = args;
    
    // Get existing note
    const existingNote = await ctx.db.get(noteId);
    if (!existingNote) {
      throw new Error("Note not found");
    }
    
    // Update the note
    await ctx.db.patch(noteId, {
      ...updateData,
      updatedAt: new Date().toISOString()
    });
    
    return noteId;
  },
});

// Delete a progress note
export const deleteNote = mutation({
  args: { noteId: v.id("progressNotes") },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) {
      throw new Error("Note not found");
    }
    
    await ctx.db.delete(args.noteId);
    return { success: true };
  },
});

// Get recent progress notes across all residents (for dashboard/reports)
export const getRecent = query({
  args: { 
    limit: v.optional(v.number()),
    teamId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    const notes = await ctx.db
      .query("progressNotes")
      .withIndex("by_createdAt")
      .order("desc")
      .take(limit);
    
    return notes;
  },
});

// Get progress notes by type for a resident
export const getByType = query({
  args: { 
    residentId: v.id("residents"),
    type: v.union(
      v.literal("daily"),
      v.literal("incident"),
      v.literal("medical"),
      v.literal("behavioral"),
      v.literal("other")
    )
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("progressNotes")
      .withIndex("by_residentId", (q) => q.eq("residentId", args.residentId))
      .filter((q) => q.eq(q.field("type"), args.type))
      .order("desc")
      .collect();
  },
});

// Search progress notes by content
export const search = query({
  args: {
    residentId: v.id("residents"),
    searchTerm: v.string()
  },
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("progressNotes")
      .withIndex("by_residentId", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();
    
    // Filter by search term
    const searchLower = args.searchTerm.toLowerCase();
    return notes.filter(note => 
      note.subject.toLowerCase().includes(searchLower) ||
      note.note.toLowerCase().includes(searchLower)
    );
  },
});