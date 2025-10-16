import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Mark an incident as read by the current user
export const markIncidentAsRead = mutation({
  args: {
    incidentId: v.id("incidents"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if already marked as read
    const existing = await ctx.db
      .query("notificationReadStatus")
      .withIndex("by_user_and_incident", (q) =>
        q.eq("userId", user._id).eq("incidentId", args.incidentId)
      )
      .first();

    if (existing) {
      // Already marked as read
      return existing._id;
    }

    // Mark as read
    const readStatusId = await ctx.db.insert("notificationReadStatus", {
      userId: user._id,
      incidentId: args.incidentId,
      readAt: Date.now(),
    });

    return readStatusId;
  },
});

// Mark multiple incidents as read
export const markMultipleIncidentsAsRead = mutation({
  args: {
    incidentIds: v.array(v.id("incidents")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const results = [];
    for (const incidentId of args.incidentIds) {
      // Check if already marked as read
      const existing = await ctx.db
        .query("notificationReadStatus")
        .withIndex("by_user_and_incident", (q) =>
          q.eq("userId", user._id).eq("incidentId", incidentId)
        )
        .first();

      if (!existing) {
        // Mark as read
        const readStatusId = await ctx.db.insert("notificationReadStatus", {
          userId: user._id,
          incidentId: incidentId,
          readAt: Date.now(),
        });
        results.push(readStatusId);
      }
    }

    return results;
  },
});

// Get read status for current user
export const getReadIncidents = query({
  args: {
    incidentIds: v.optional(v.array(v.id("incidents"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      return [];
    }

    // Get all read statuses for this user
    const readStatuses = await ctx.db
      .query("notificationReadStatus")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Filter by incident IDs if provided
    if (args.incidentIds) {
      return readStatuses.filter((status) =>
        args.incidentIds!.includes(status.incidentId)
      );
    }

    return readStatuses;
  },
});

// Get unread notification count - supports both team and organization-wide
export const getUnreadCount = query({
  args: {
    teamId: v.optional(v.string()),
    organizationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return 0;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      return 0;
    }

    let relevantIncidents;

    // If teamId is provided, get team-specific incidents
    if (args.teamId) {
      const residents = await ctx.db
        .query("residents")
        .withIndex("byTeamId", (q) => q.eq("teamId", args.teamId!))
        .collect();

      const residentIds = residents.map(r => r._id);

      const allIncidents = await ctx.db
        .query("incidents")
        .collect();

      relevantIncidents = allIncidents.filter(incident => {
        if (incident.teamId === args.teamId) return true;
        if (incident.residentId && residentIds.includes(incident.residentId)) return true;
        return false;
      });
    }
    // Otherwise, get organization-wide incidents
    else if (args.organizationId) {
      const residents = await ctx.db
        .query("residents")
        .withIndex("byOrganizationId", (q) => q.eq("organizationId", args.organizationId!))
        .collect();

      const residentIds = residents.map(r => r._id);

      const allIncidents = await ctx.db
        .query("incidents")
        .collect();

      relevantIncidents = allIncidents.filter(incident => {
        if (incident.organizationId === args.organizationId) return true;
        if (incident.residentId && residentIds.includes(incident.residentId)) return true;
        return false;
      });
    } else {
      return 0;
    }

    // Get all read statuses for this user
    const readStatuses = await ctx.db
      .query("notificationReadStatus")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const readIncidentIds = new Set(readStatuses.map(status => status.incidentId));

    // Count unread incidents
    const unreadCount = relevantIncidents.filter(
      incident => !readIncidentIds.has(incident._id)
    ).length;

    return unreadCount;
  },
});
