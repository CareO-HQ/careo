/**
 * Migration Script: Initialize Progress Note Stats
 *
 * This script initializes the progressNoteStats table for all existing residents.
 * Run this ONCE after deploying the new schema.
 *
 * Usage:
 * 1. Deploy the schema changes (progressNoteStats table)
 * 2. Call this mutation from the Convex dashboard for each resident
 * 3. Or use the bulk migration below
 */

import { mutation } from "../_generated/server";
import { v } from "convex/values";

// Migrate all residents at once (use carefully - may timeout with 100+ residents)
export const migrateAllResidents = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all unique resident IDs from progressNotes
    const allNotes = await ctx.db.query("progressNotes").collect();
    const residentIds = [...new Set(allNotes.map(note => note.residentId))];

    console.log(`Found ${residentIds.length} residents with progress notes`);

    let initialized = 0;
    let skipped = 0;

    for (const residentId of residentIds) {
      // Check if stats already exist
      const existingStats = await ctx.db
        .query("progressNoteStats")
        .withIndex("by_residentId", (q) => q.eq("residentId", residentId))
        .first();

      if (existingStats) {
        skipped++;
        continue;
      }

      // Get all notes for this resident
      const residentNotes = allNotes.filter(note => note.residentId === residentId);

      const counts = {
        totalCount: residentNotes.length,
        dailyCount: residentNotes.filter(n => n.type === "daily").length,
        medicalCount: residentNotes.filter(n => n.type === "medical").length,
        incidentCount: residentNotes.filter(n => n.type === "incident").length,
        behavioralCount: residentNotes.filter(n => n.type === "behavioral").length,
        otherCount: residentNotes.filter(n => n.type === "other").length,
      };

      await ctx.db.insert("progressNoteStats", {
        residentId,
        ...counts,
        lastUpdated: new Date().toISOString(),
      });

      initialized++;
      console.log(`Initialized stats for resident ${residentId}: ${counts.totalCount} notes`);
    }

    return {
      message: "Migration complete",
      totalResidents: residentIds.length,
      initialized,
      skipped,
    };
  },
});

// Migrate a single resident (safer for production)
export const migrateSingleResident = mutation({
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
      return {
        message: "Stats already exist for this resident",
        stats: existingStats
      };
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

    return {
      message: "Stats initialized successfully",
      counts,
      statsId
    };
  },
});
