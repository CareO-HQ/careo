import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Create a new quick care note
export const createQuickCareNote = mutation({
  args: {
    residentId: v.id("residents"),
    category: v.union(
      v.literal("shower_bath"),
      v.literal("toileting"),
      v.literal("mobility_positioning"),
      v.literal("communication"),
      v.literal("safety_alerts")
    ),
    
    // Shower/Bath Preference fields
    showerOrBath: v.optional(v.union(v.literal("shower"), v.literal("bath"))),
    preferredTime: v.optional(v.union(v.literal("morning"), v.literal("afternoon"), v.literal("evening"))),
    
    // Toileting Needs fields
    toiletType: v.optional(v.union(v.literal("toilet"), v.literal("commode"), v.literal("pad"))),
    assistanceLevel: v.optional(v.union(v.literal("independent"), v.literal("1_staff"), v.literal("2_staff"))),
    
    // Mobility & Positioning fields
    walkingAid: v.optional(v.union(v.literal("frame"), v.literal("stick"), v.literal("wheelchair"), v.literal("none"))),
    
    // Communication Needs fields
    communicationNeeds: v.optional(v.array(v.union(
      v.literal("hearing_aid"),
      v.literal("glasses"),
      v.literal("non_verbal"),
      v.literal("memory_support")
    ))),
    
    // Safety Alerts fields
    safetyAlerts: v.optional(v.array(v.union(
      v.literal("high_falls_risk"),
      v.literal("no_unattended_bathroom"),
      v.literal("chair_bed_alarm")
    ))),
    
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    organizationId: v.string(),
    teamId: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const quickCareNote = await ctx.db.insert("quickCareNotes", {
      residentId: args.residentId,
      category: args.category,
      showerOrBath: args.showerOrBath,
      preferredTime: args.preferredTime,
      toiletType: args.toiletType,
      assistanceLevel: args.assistanceLevel,
      walkingAid: args.walkingAid,
      communicationNeeds: args.communicationNeeds,
      safetyAlerts: args.safetyAlerts,
      priority: args.priority || "medium",
      isActive: true,
      organizationId: args.organizationId,
      teamId: args.teamId,
      createdBy: args.createdBy,
      createdAt: now,
    });
    
    return quickCareNote;
  },
});

// Get quick care notes for a specific resident
export const getQuickCareNotesByResident = query({
  args: {
    residentId: v.id("residents"),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let notes = await ctx.db
      .query("quickCareNotes")
      .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
      .collect();
    
    // Filter by active status if specified
    if (args.activeOnly === true) {
      notes = notes.filter(note => note.isActive !== false);
    }
    
    // Sort by creation date (most recent first)
    return notes.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get quick care notes by category
export const getQuickCareNotesByCategory = query({
  args: {
    residentId: v.id("residents"),
    category: v.union(
      v.literal("shower_bath"),
      v.literal("toileting"),
      v.literal("mobility_positioning"),
      v.literal("communication"),
      v.literal("safety_alerts")
    ),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let notes = await ctx.db
      .query("quickCareNotes")
      .withIndex("byResidentAndCategory", (q) => 
        q.eq("residentId", args.residentId).eq("category", args.category)
      )
      .collect();
    
    if (args.activeOnly === true) {
      notes = notes.filter(note => note.isActive !== false);
    }
    
    return notes.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Update a quick care note
export const updateQuickCareNote = mutation({
  args: {
    noteId: v.id("quickCareNotes"),
    note: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    isActive: v.optional(v.boolean()),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const { noteId, updatedBy, ...updates } = args;
    
    const existingNote = await ctx.db.get(noteId);
    if (!existingNote) {
      throw new Error("Care note not found");
    }
    
    await ctx.db.patch(noteId, {
      ...updates,
      updatedBy,
      updatedAt: Date.now(),
    });
    
    return await ctx.db.get(noteId);
  },
});

// Deactivate a quick care note (soft delete)
export const deactivateQuickCareNote = mutation({
  args: {
    noteId: v.id("quickCareNotes"),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const existingNote = await ctx.db.get(args.noteId);
    if (!existingNote) {
      throw new Error("Care note not found");
    }
    
    await ctx.db.patch(args.noteId, {
      isActive: false,
      updatedBy: args.updatedBy,
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

// Delete a quick care note (hard delete)
export const deleteQuickCareNote = mutation({
  args: {
    noteId: v.id("quickCareNotes"),
  },
  handler: async (ctx, args) => {
    const existingNote = await ctx.db.get(args.noteId);
    if (!existingNote) {
      throw new Error("Care note not found");
    }
    
    await ctx.db.delete(args.noteId);
    return { success: true };
  },
});

// Get care notes summary for a resident
export const getCareNotesSummary = query({
  args: {
    residentId: v.id("residents"),
  },
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("quickCareNotes")
      .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
      .filter((q) => q.neq(q.field("isActive"), false))
      .collect();
    
    const summary = {
      totalNotes: notes.length,
      byCategory: notes.reduce((acc, note) => {
        acc[note.category] = (acc[note.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byPriority: notes.reduce((acc, note) => {
        const priority = note.priority || "medium";
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      lastUpdated: notes.length > 0 ? Math.max(...notes.map(note => note.createdAt)) : null,
    };
    
    return summary;
  },
});