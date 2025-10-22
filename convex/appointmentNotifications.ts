import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Mark an appointment as read
export const markAppointmentAsRead = mutation({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", identity.email!))
      .first();

    if (!currentUser) {
      throw new Error("User not found");
    }

    // Check if already read
    const existing = await ctx.db
      .query("appointmentReadStatus")
      .withIndex("by_user_and_appointment", (q) =>
        q.eq("userId", currentUser._id).eq("appointmentId", args.appointmentId)
      )
      .first();

    if (existing) {
      return { success: true, alreadyRead: true };
    }

    // Mark as read
    await ctx.db.insert("appointmentReadStatus", {
      userId: currentUser._id,
      appointmentId: args.appointmentId,
      readAt: Date.now(),
    });

    return { success: true, alreadyRead: false };
  },
});

// Mark multiple appointments as read
export const markMultipleAppointmentsAsRead = mutation({
  args: { appointmentIds: v.array(v.id("appointments")) },
  handler: async (ctx, args) => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", identity.email!))
      .first();

    if (!currentUser) {
      throw new Error("User not found");
    }

    // Mark each appointment as read
    for (const appointmentId of args.appointmentIds) {
      const existing = await ctx.db
        .query("appointmentReadStatus")
        .withIndex("by_user_and_appointment", (q) =>
          q.eq("userId", currentUser._id).eq("appointmentId", appointmentId)
        )
        .first();

      if (!existing) {
        await ctx.db.insert("appointmentReadStatus", {
          userId: currentUser._id,
          appointmentId: appointmentId,
          readAt: Date.now(),
        });
      }
    }

    return { success: true };
  },
});

// Get unread appointment count
export const getUnreadAppointmentCount = query({
  args: {
    teamId: v.optional(v.string()),
    organizationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return 0;
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", identity.email!))
      .first();

    if (!currentUser) {
      return 0;
    }

    const now = new Date().toISOString();

    // Get appointments based on team or organization
    let appointments: any[] = [];

    if (args.teamId) {
      const teamId = args.teamId;
      // Get all residents in this team
      const residents = await ctx.db
        .query("residents")
        .withIndex("byTeamId", (q) => q.eq("teamId", teamId))
        .collect();

      const residentIds = residents.map((r) => r._id);

      if (residentIds.length > 0) {
        // Get all appointments for these residents
        const allAppointments = await Promise.all(
          residentIds.map((residentId) =>
            ctx.db
              .query("appointments")
              .withIndex("byResidentId", (q) => q.eq("residentId", residentId))
              .collect()
          )
        );

        appointments = allAppointments
          .flat()
          .filter(
            (appointment) =>
              appointment.status === "scheduled" && appointment.startTime >= now
          );
      }
    } else if (args.organizationId) {
      const organizationId = args.organizationId;
      // Get all residents in this organization
      const residents = await ctx.db
        .query("residents")
        .withIndex("byOrganizationId", (q) => q.eq("organizationId", organizationId))
        .collect();

      const residentIds = residents.map((r) => r._id);

      if (residentIds.length > 0) {
        // Get all appointments for these residents
        const allAppointments = await Promise.all(
          residentIds.map((residentId) =>
            ctx.db
              .query("appointments")
              .withIndex("byResidentId", (q) => q.eq("residentId", residentId))
              .collect()
          )
        );

        appointments = allAppointments
          .flat()
          .filter(
            (appointment) =>
              appointment.status === "scheduled" && appointment.startTime >= now
          );
      }
    }

    // Count unread appointments
    let unreadCount = 0;
    for (const appointment of appointments) {
      const readStatus = await ctx.db
        .query("appointmentReadStatus")
        .withIndex("by_user_and_appointment", (q) =>
          q.eq("userId", currentUser._id).eq("appointmentId", appointment._id)
        )
        .first();

      if (!readStatus) {
        unreadCount++;
      }
    }

    return unreadCount;
  },
});
