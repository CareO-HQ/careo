import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new menu item
export const createMenuItem = mutation({
  args: {
    name: v.string(),
    category: v.optional(v.string()),
    teamId: v.string(),
    organizationId: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const menuItemId = await ctx.db.insert("menuItems", {
      name: args.name,
      category: args.category,
      teamId: args.teamId,
      organizationId: args.organizationId,
      createdBy: args.createdBy,
      createdAt: now,
    });

    return menuItemId;
  },
});

// Get all menu items for a team
export const getMenuItemsByTeam = query({
  args: { teamId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("menuItems")
      .withIndex("byTeamId", (q) => q.eq("teamId", args.teamId))
      .order("desc")
      .collect();
  },
});

// Get menu items by category for a team
export const getMenuItemsByCategory = query({
  args: {
    teamId: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("menuItems")
      .withIndex("byCategory", (q) =>
        q.eq("teamId", args.teamId).eq("category", args.category)
      )
      .collect();
  },
});

// Update a menu item
export const updateMenuItem = mutation({
  args: {
    menuItemId: v.id("menuItems"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { menuItemId, ...updates } = args;

    await ctx.db.patch(menuItemId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(menuItemId);
  },
});

// Delete a menu item
export const deleteMenuItem = mutation({
  args: {
    menuItemId: v.id("menuItems"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.menuItemId);
    return { success: true };
  },
});
