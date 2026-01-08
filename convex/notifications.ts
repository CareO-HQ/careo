import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
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

// ==========================================
// CENTRALIZED NOTIFICATION SYSTEM
// ==========================================

// Create a new notification
export const createNotification = mutation({
  args: {
    userId: v.string(),
    senderId: v.optional(v.string()),
    senderName: v.optional(v.string()),
    type: v.string(), // Flexible to support all notification types
    title: v.string(),
    message: v.string(),
    link: v.optional(v.string()),
    metadata: v.optional(v.any()),
    organizationId: v.string(),
    teamId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      senderId: args.senderId,
      senderName: args.senderName,
      type: args.type,
      title: args.title,
      message: args.message,
      link: args.link,
      metadata: args.metadata,
      isRead: false,
      organizationId: args.organizationId,
      teamId: args.teamId,
      createdAt: Date.now(),
    });

    return notificationId;
  },
});

// Get all notifications for a user (OPTIMIZED: Uses index)
// Filters by user's current activeTeamId to ensure team-specific notifications
export const getUserNotifications = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    console.log(`[getUserNotifications] Getting notifications for userId: ${args.userId}`);

    // Get user's current activeTeamId to filter team-specific notifications
    let userActiveTeamId: string | null | undefined = null;
    try {
      const user = await ctx.db
        .query("users")
        .withIndex("byEmail", (q) => q.eq("email", args.userId))
        .first();
      
      if (user) {
        userActiveTeamId = user.activeTeamId;
        console.log(`[getUserNotifications] User activeTeamId: ${userActiveTeamId}`);
      } else {
        console.warn(`[getUserNotifications] User not found for email: ${args.userId}`);
      }
    } catch (error) {
      console.warn(`[getUserNotifications] Error getting user activeTeamId:`, error);
    }

    // Get all notifications for this user
    const allNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit * 2); // Get more to account for filtering

    console.log(`[getUserNotifications] Found ${allNotifications.length} total notifications for user`);

    // Filter notifications based on team membership
    // For team-specific notifications (like care_plan_evaluation), only show if:
    // 1. Notification has no teamId (global notification), OR
    // 2. Notification's teamId matches user's activeTeamId, OR
    // 3. User has no activeTeamId (hasn't switched teams yet) - show notifications from all teams they were in
    const filteredNotifications = allNotifications.filter((notification) => {
      // If notification has no teamId, it's a global notification - always show
      if (!notification.teamId) {
        console.log(`[getUserNotifications] Including notification ${notification._id} - no teamId (global notification)`);
        return true;
      }

      // For team-specific notifications, check team membership
      if (notification.type === "care_plan_evaluation" || notification.teamId) {
        // If user has an activeTeamId, only show notifications from that team
        if (userActiveTeamId != null) {
          const notificationTeamIdStr = String(notification.teamId);
          const userActiveTeamIdStr = String(userActiveTeamId);
          const matches = notificationTeamIdStr === userActiveTeamIdStr;
          
          console.log(`[getUserNotifications] Team check for notification ${notification._id}:`, {
            notificationTeamId: notification.teamId,
            userActiveTeamId: userActiveTeamId,
            matches: matches,
            type: notification.type
          });
          
          return matches;
        } else {
          // User has no activeTeamId (hasn't switched teams) - show all their notifications
          console.log(`[getUserNotifications] Including notification ${notification._id} - user has no activeTeamId`);
          return true;
        }
      }

      // For other notification types, show them (non-team-specific)
      return true;
    });

    console.log(`[getUserNotifications] Returning ${filteredNotifications.length} filtered notifications (filtered from ${allNotifications.length} total)`);

    // Return limited results
    return filteredNotifications.slice(0, limit);
  },
});

// Get notification count for a user (OPTIMIZED: Uses composite index)
// Filters by user's current activeTeamId to ensure team-specific notifications
export const getNotificationCount = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get user's current activeTeamId to filter team-specific notifications
    let userActiveTeamId: string | null | undefined = null;
    try {
      const user = await ctx.db
        .query("users")
        .withIndex("byEmail", (q) => q.eq("email", args.userId))
        .first();
      
      if (user) {
        userActiveTeamId = user.activeTeamId;
      }
    } catch (error) {
      console.warn(`[getNotificationCount] Error getting user activeTeamId:`, error);
    }

    // Get all unread notifications for this user
    const allUnreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read", (q) =>
        q.eq("userId", args.userId).eq("isRead", false)
      )
      .collect();

    // Filter notifications based on team membership (same logic as getUserNotifications)
    const filteredNotifications = allUnreadNotifications.filter((notification) => {
      // If notification has no teamId, it's a global notification - always count
      if (!notification.teamId) {
        return true;
      }

      // For team-specific notifications, check team membership
      if (notification.type === "care_plan_evaluation" || notification.teamId) {
        // If user has an activeTeamId, only count notifications from that team
        if (userActiveTeamId != null) {
          const notificationTeamIdStr = String(notification.teamId);
          const userActiveTeamIdStr = String(userActiveTeamId);
          return notificationTeamIdStr === userActiveTeamIdStr;
        } else {
          // User has no activeTeamId (hasn't switched teams) - count all their notifications
          return true;
        }
      }

      // For other notification types, count them (non-team-specific)
      return true;
    });

    return filteredNotifications.length;
  },
});

// Mark a notification as read
export const markNotificationAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, {
      isRead: true,
      readAt: Date.now(),
    });

    return args.notificationId;
  },
});

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const unreadNotifications = await ctx.db
      .query("notifications")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.or(
            q.eq(q.field("isRead"), false),
            q.eq(q.field("isRead"), undefined)
          )
        )
      )
      .collect();

    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, {
        isRead: true,
        readAt: Date.now(),
      });
    }

    return unreadNotifications.length;
  },
});

// Delete a notification
export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.notificationId);
    return args.notificationId;
  },
});

// Delete all notifications for a user
export const deleteAllNotifications = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all notifications for this user
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Delete all notifications
    let deleted = 0;
    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
      deleted++;
    }

    return { deleted };
  },
});

// ==========================================
// INCIDENT NOTIFICATIONS (Legacy)
// ==========================================

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

// Archive old read notifications (called by cron job)
export const archiveOldNotifications = internalMutation({
  handler: async (ctx) => {
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);

    // Find read notifications older than 90 days
    const oldNotifications = await ctx.db
      .query("notifications")
      .filter((q) =>
        q.and(
          q.eq(q.field("isRead"), true),
          q.lt(q.field("readAt"), ninetyDaysAgo)
        )
      )
      .collect();

    let archived = 0;
    for (const notification of oldNotifications) {
      await ctx.db.delete(notification._id);
      archived++;
    }

    console.log(`Archived ${archived} old read notifications`);
    return { archived };
  },
});
