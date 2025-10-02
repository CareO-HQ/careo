import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const upsertAuditItem = mutation({
  args: {
    residentId: v.id("residents"),
    itemName: v.string(),
    status: v.union(
      v.literal("n/a"),
      v.literal("pending"),
      v.literal("in-progress"),
      v.literal("completed"),
      v.literal("overdue"),
      v.literal("not-applicable")
    ),
    auditorName: v.optional(v.string()),
    lastAuditedDate: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    teamId: v.string(),
    organizationId: v.string()
  },
  handler: async (ctx, args) => {
    // Check if audit item already exists
    const existing = await ctx.db
      .query("residentAuditItems")
      .withIndex("by_resident_and_item", (q) =>
        q.eq("residentId", args.residentId).eq("itemName", args.itemName)
      )
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        status: args.status,
        auditorName: args.auditorName,
        lastAuditedDate: args.lastAuditedDate,
        dueDate: args.dueDate,
        updatedAt: Date.now()
      });
      return existing._id;
    } else {
      // Create new
      return await ctx.db.insert("residentAuditItems", {
        residentId: args.residentId,
        itemName: args.itemName,
        status: args.status,
        auditorName: args.auditorName,
        lastAuditedDate: args.lastAuditedDate,
        dueDate: args.dueDate,
        teamId: args.teamId,
        organizationId: args.organizationId,
        createdAt: Date.now()
      });
    }
  }
});

export const getAuditItemsByResident = query({
  args: {
    residentId: v.id("residents")
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("residentAuditItems")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .collect();
  }
});

export const getOverdueCountByResident = query({
  args: {
    residentId: v.id("residents")
  },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("residentAuditItems")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .collect();

    const today = new Date().toISOString().split("T")[0];

    // Count items that are overdue (have a due date in the past and not completed/n/a)
    const overdueCount = items.filter(item => {
      if (!item.dueDate || item.status === "completed" || item.status === "n/a") {
        return false;
      }
      return item.dueDate < today;
    }).length;

    return overdueCount;
  }
});

export const getAuditItemsByTeam = query({
  args: {
    teamId: v.string(),
    organizationId: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("residentAuditItems")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .collect();
  }
});
