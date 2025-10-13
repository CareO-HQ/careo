import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";

// Get paginated progress notes for a resident with filtering
export const getByResidentIdPaginated = query({
  args: {
    residentId: v.id("residents"),
    paginationOpts: paginationOptsValidator,
    filterType: v.optional(v.union(
      v.literal("all"),
      v.literal("daily"),
      v.literal("incident"),
      v.literal("medical"),
      v.literal("behavioral"),
      v.literal("other")
    )),
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { residentId, paginationOpts, filterType, searchQuery } = args;

    // Use composite index for better performance
    let notesQuery = ctx.db
      .query("progressNotes")
      .withIndex("by_resident_and_createdAt", (q) =>
        q.eq("residentId", residentId)
      )
      .order("desc");

    // Apply type filter using the composite index if specified
    if (filterType && filterType !== "all") {
      notesQuery = ctx.db
        .query("progressNotes")
        .withIndex("by_resident_and_type", (q) =>
          q.eq("residentId", residentId).eq("type", filterType)
        )
        .order("desc");
    }

    // Paginate with cursor
    const results = await notesQuery.paginate(paginationOpts);

    // Apply search filter on paginated results if needed
    if (searchQuery && searchQuery.trim() !== "") {
      const searchLower = searchQuery.toLowerCase();
      const filteredPage = results.page.filter(note =>
        note.note.toLowerCase().includes(searchLower) ||
        note.authorName.toLowerCase().includes(searchLower) ||
        note.type.toLowerCase().includes(searchLower)
      );

      return {
        ...results,
        page: filteredPage,
      };
    }

    // Return the pagination result as-is for usePaginatedQuery
    return results;
  },
});

// Get all progress notes for a resident (kept for backward compatibility, use with caution)
export const getByResidentId = query({
  args: { residentId: v.id("residents") },
  handler: async (ctx, args) => {
    // Limited to 100 most recent notes to prevent memory issues
    return await ctx.db
      .query("progressNotes")
      .withIndex("by_resident_and_createdAt", (q) =>
        q.eq("residentId", args.residentId)
      )
      .order("desc")
      .take(100);
  },
});

// Get a single progress note by ID
export const getById = query({
  args: { noteId: v.id("progressNotes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.noteId);
  },
});

// Helper function to update stats counters
async function updateStatsCounter(
  ctx: any,
  residentId: any,
  type: string,
  increment: number
) {
  // Find existing stats record
  const existingStats = await ctx.db
    .query("progressNoteStats")
    .withIndex("by_residentId", (q: any) => q.eq("residentId", residentId))
    .first();

  if (existingStats) {
    // Update existing stats
    const updates: any = {
      totalCount: existingStats.totalCount + increment,
      lastUpdated: new Date().toISOString(),
    };

    // Update type-specific counter
    switch (type) {
      case "daily":
        updates.dailyCount = existingStats.dailyCount + increment;
        break;
      case "medical":
        updates.medicalCount = existingStats.medicalCount + increment;
        break;
      case "incident":
        updates.incidentCount = existingStats.incidentCount + increment;
        break;
      case "behavioral":
        updates.behavioralCount = existingStats.behavioralCount + increment;
        break;
      case "other":
        updates.otherCount = existingStats.otherCount + increment;
        break;
    }

    await ctx.db.patch(existingStats._id, updates);
  } else {
    // Initialize stats for new resident
    const stats: any = {
      residentId,
      totalCount: increment,
      dailyCount: 0,
      medicalCount: 0,
      incidentCount: 0,
      behavioralCount: 0,
      otherCount: 0,
      lastUpdated: new Date().toISOString(),
    };

    // Set type-specific counter
    switch (type) {
      case "daily":
        stats.dailyCount = increment;
        break;
      case "medical":
        stats.medicalCount = increment;
        break;
      case "incident":
        stats.incidentCount = increment;
        break;
      case "behavioral":
        stats.behavioralCount = increment;
        break;
      case "other":
        stats.otherCount = increment;
        break;
    }

    await ctx.db.insert("progressNoteStats", stats);
  }
}

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
    date: v.string(),
    time: v.string(),
    note: v.string(),
    authorId: v.string(),
    authorName: v.string(),
    createdAt: v.string(),
    attachments: v.optional(v.array(v.id("_storage")))
  },
  handler: async (ctx, args) => {
    // Insert the note
    const noteId = await ctx.db.insert("progressNotes", {
      ...args,
      createdAt: args.createdAt || new Date().toISOString()
    });

    // Update stats counter atomically
    await updateStatsCounter(ctx, args.residentId, args.type, 1);

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
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    note: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { noteId, ...updateData } = args;

    // Get existing note
    const existingNote = await ctx.db.get(noteId);
    if (!existingNote) {
      throw new Error("Note not found");
    }

    // If type is changing, update counters
    if (updateData.type && updateData.type !== existingNote.type) {
      // Decrement old type counter
      await updateStatsCounter(ctx, existingNote.residentId, existingNote.type, -1);
      // Increment new type counter
      await updateStatsCounter(ctx, existingNote.residentId, updateData.type, 1);
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

    // Decrement counter before deleting
    await updateStatsCounter(ctx, note.residentId, note.type, -1);

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

// Get cached stats for a resident (FAST - O(1) query)
export const getStatsByResidentId = query({
  args: {
    residentId: v.id("residents"),
  },
  handler: async (ctx, args) => {
    const stats = await ctx.db
      .query("progressNoteStats")
      .withIndex("by_residentId", (q) => q.eq("residentId", args.residentId))
      .first();

    if (!stats) {
      // No stats yet - return zeros
      return {
        totalCount: 0,
        dailyCount: 0,
        medicalCount: 0,
        incidentCount: 0,
        behavioralCount: 0,
        otherCount: 0,
      };
    }

    return {
      totalCount: stats.totalCount,
      dailyCount: stats.dailyCount,
      medicalCount: stats.medicalCount,
      incidentCount: stats.incidentCount,
      behavioralCount: stats.behavioralCount,
      otherCount: stats.otherCount,
    };
  },
});

// Get count of notes for a resident (DEPRECATED - Use getStatsByResidentId instead)
// Kept for backward compatibility with documents page
export const getCountByResidentId = query({
  args: {
    residentId: v.id("residents"),
    type: v.optional(v.union(
      v.literal("daily"),
      v.literal("incident"),
      v.literal("medical"),
      v.literal("behavioral"),
      v.literal("other")
    ))
  },
  handler: async (ctx, args) => {
    // Try to get from cache first
    const stats = await ctx.db
      .query("progressNoteStats")
      .withIndex("by_residentId", (q) => q.eq("residentId", args.residentId))
      .first();

    if (stats) {
      // Return cached value
      if (args.type === undefined) {
        return stats.totalCount;
      }

      switch (args.type) {
        case "daily": return stats.dailyCount;
        case "medical": return stats.medicalCount;
        case "incident": return stats.incidentCount;
        case "behavioral": return stats.behavioralCount;
        case "other": return stats.otherCount;
        default: return 0;
      }
    }

    // Fallback to live count if no cache (shouldn't happen after migration)
    const { residentId, type } = args;

    if (type !== undefined) {
      const notes = await ctx.db
        .query("progressNotes")
        .withIndex("by_resident_and_type", (q) =>
          q.eq("residentId", residentId).eq("type", type)
        )
        .collect();
      return notes.length;
    }

    const notes = await ctx.db
      .query("progressNotes")
      .withIndex("by_resident_and_createdAt", (q) =>
        q.eq("residentId", residentId)
      )
      .collect();
    return notes.length;
  },
});

// Migration helper: Initialize stats for existing residents
export const initializeStatsForResident = mutation({
  args: {
    residentId: v.id("residents"),
  },
  handler: async (ctx, args) => {
    // Check if stats already exist
    const existingStats = await ctx.db
      .query("progressNoteStats")
      .withIndex("by_residentId", (q) => q.eq("residentId", args.residentId))
      .first();

    if (existingStats) {
      return { message: "Stats already exist", stats: existingStats };
    }

    // Count all notes by type
    const allNotes = await ctx.db
      .query("progressNotes")
      .withIndex("by_resident_and_createdAt", (q) =>
        q.eq("residentId", args.residentId)
      )
      .collect();

    const counts = {
      totalCount: allNotes.length,
      dailyCount: allNotes.filter(n => n.type === "daily").length,
      medicalCount: allNotes.filter(n => n.type === "medical").length,
      incidentCount: allNotes.filter(n => n.type === "incident").length,
      behavioralCount: allNotes.filter(n => n.type === "behavioral").length,
      otherCount: allNotes.filter(n => n.type === "other").length,
    };

    // Insert stats
    const statsId = await ctx.db.insert("progressNoteStats", {
      residentId: args.residentId,
      ...counts,
      lastUpdated: new Date().toISOString(),
    });

    return { message: "Stats initialized", counts, statsId };
  },
});