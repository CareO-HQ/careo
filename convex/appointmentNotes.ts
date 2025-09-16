import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Create a new appointment note
export const createAppointmentNote = mutation({
  args: {
    residentId: v.id("residents"),
    category: v.union(
      v.literal("preparation"),
      v.literal("preferences"),
      v.literal("special_instructions"),
      v.literal("transportation"),
      v.literal("medical_requirements")
    ),
    
    // Preparation fields
    preparationTime: v.optional(v.union(
      v.literal("30_minutes"),
      v.literal("1_hour"),
      v.literal("2_hours")
    )),
    preparationNotes: v.optional(v.string()),
    
    // Preferences fields
    preferredTime: v.optional(v.union(
      v.literal("morning"),
      v.literal("afternoon"),
      v.literal("evening")
    )),
    transportPreference: v.optional(v.union(
      v.literal("wheelchair"),
      v.literal("walking_aid"),
      v.literal("independent"),
      v.literal("stretcher")
    )),
    
    // Special instructions
    instructions: v.optional(v.string()),
    
    // Transportation requirements
    transportationNeeds: v.optional(v.array(v.union(
      v.literal("wheelchair_accessible"),
      v.literal("oxygen_support"),
      v.literal("medical_equipment"),
      v.literal("assistance_required")
    ))),
    
    // Medical requirements
    medicalNeeds: v.optional(v.array(v.union(
      v.literal("fasting_required"),
      v.literal("medication_adjustment"),
      v.literal("blood_work"),
      v.literal("vitals_check")
    ))),
    
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    organizationId: v.string(),
    teamId: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const appointmentNote = await ctx.db.insert("appointmentNotes", {
      residentId: args.residentId,
      category: args.category,
      preparationTime: args.preparationTime,
      preparationNotes: args.preparationNotes,
      preferredTime: args.preferredTime,
      transportPreference: args.transportPreference,
      instructions: args.instructions,
      transportationNeeds: args.transportationNeeds,
      medicalNeeds: args.medicalNeeds,
      priority: args.priority || "medium",
      isActive: true,
      organizationId: args.organizationId,
      teamId: args.teamId,
      createdBy: args.createdBy,
      createdAt: now,
    });
    
    return appointmentNote;
  },
});

// Get appointment notes for a specific resident
export const getAppointmentNotesByResident = query({
  args: {
    residentId: v.id("residents"),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let notes = await ctx.db
      .query("appointmentNotes")
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

// Get appointment notes by category
export const getAppointmentNotesByCategory = query({
  args: {
    residentId: v.id("residents"),
    category: v.union(
      v.literal("preparation"),
      v.literal("preferences"),
      v.literal("special_instructions"),
      v.literal("transportation"),
      v.literal("medical_requirements")
    ),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let notes = await ctx.db
      .query("appointmentNotes")
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

// Update an appointment note
export const updateAppointmentNote = mutation({
  args: {
    noteId: v.id("appointmentNotes"),
    preparationNotes: v.optional(v.string()),
    instructions: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    isActive: v.optional(v.boolean()),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const { noteId, updatedBy, ...updates } = args;
    
    const existingNote = await ctx.db.get(noteId);
    if (!existingNote) {
      throw new Error("Appointment note not found");
    }
    
    await ctx.db.patch(noteId, {
      ...updates,
      updatedBy,
      updatedAt: Date.now(),
    });
    
    return await ctx.db.get(noteId);
  },
});

// Delete an appointment note (hard delete)
export const deleteAppointmentNote = mutation({
  args: {
    noteId: v.id("appointmentNotes"),
  },
  handler: async (ctx, args) => {
    const existingNote = await ctx.db.get(args.noteId);
    if (!existingNote) {
      throw new Error("Appointment note not found");
    }
    
    await ctx.db.delete(args.noteId);
    return { success: true };
  },
});

// Get appointment notes summary for a resident
export const getAppointmentNotesSummary = query({
  args: {
    residentId: v.id("residents"),
  },
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("appointmentNotes")
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