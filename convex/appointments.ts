import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Create a new appointment
export const createAppointment = mutation({
  args: {
    residentId: v.id("residents"),
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.string(), // ISO date-time string
    endTime: v.optional(v.string()), // ISO date-time string (optional)
    location: v.string(),
    staffId: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("scheduled"),
      v.literal("completed"),
      v.literal("cancelled")
    )),
    organizationId: v.string(),
    teamId: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const appointment = await ctx.db.insert("appointments", {
      residentId: args.residentId,
      title: args.title,
      description: args.description,
      startTime: args.startTime,
      endTime: args.endTime || args.startTime, // Default to startTime if not provided
      location: args.location,
      staffId: args.staffId,
      status: args.status || "scheduled",
      organizationId: args.organizationId,
      teamId: args.teamId,
      createdBy: args.createdBy,
      createdAt: now,
    });
    
    return appointment;
  },
});

// Get appointments for a specific resident
export const getAppointmentsByResident = query({
  args: {
    residentId: v.id("residents"),
    status: v.optional(v.union(
      v.literal("scheduled"),
      v.literal("completed"),
      v.literal("cancelled")
    )),
  },
  handler: async (ctx, args) => {
    let appointments = await ctx.db
      .query("appointments")
      .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
      .collect();
    
    // Filter by status if specified
    if (args.status) {
      appointments = appointments.filter(appointment => appointment.status === args.status);
    }
    
    // Sort by start time (earliest/most immediate first)
    return appointments.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  },
});

// Get upcoming appointments for a resident
export const getUpcomingAppointments = query({
  args: {
    residentId: v.id("residents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
      .filter((q) => q.eq(q.field("status"), "scheduled"))
      .collect();
    
    // Filter for upcoming appointments and sort by start time
    const upcomingAppointments = appointments
      .filter(appointment => appointment.startTime > now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    // Limit results if specified
    if (args.limit) {
      return upcomingAppointments.slice(0, args.limit);
    }
    
    return upcomingAppointments;
  },
});

// Update appointment
export const updateAppointment = mutation({
  args: {
    appointmentId: v.id("appointments"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    location: v.optional(v.string()),
    staffId: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("scheduled"),
      v.literal("completed"),
      v.literal("cancelled")
    )),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const { appointmentId, updatedBy, ...updates } = args;
    
    const existingAppointment = await ctx.db.get(appointmentId);
    if (!existingAppointment) {
      throw new Error("Appointment not found");
    }
    
    await ctx.db.patch(appointmentId, {
      ...updates,
      updatedBy,
      updatedAt: Date.now(),
    });
    
    return await ctx.db.get(appointmentId);
  },
});

// Update appointment status
export const updateAppointmentStatus = mutation({
  args: {
    appointmentId: v.id("appointments"),
    status: v.union(
      v.literal("scheduled"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const existingAppointment = await ctx.db.get(args.appointmentId);
    if (!existingAppointment) {
      throw new Error("Appointment not found");
    }
    
    await ctx.db.patch(args.appointmentId, {
      status: args.status,
      updatedBy: args.updatedBy,
      updatedAt: Date.now(),
    });
    
    return await ctx.db.get(args.appointmentId);
  },
});

// Delete an appointment
export const deleteAppointment = mutation({
  args: {
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    const existingAppointment = await ctx.db.get(args.appointmentId);
    if (!existingAppointment) {
      throw new Error("Appointment not found");
    }

    await ctx.db.delete(args.appointmentId);
    return { success: true };
  },
});

// Get all appointments for a team with resident details
export const getAppointmentsByTeam = query({
  args: {
    teamId: v.string(),
    status: v.optional(v.union(
      v.literal("scheduled"),
      v.literal("completed"),
      v.literal("cancelled")
    )),
    includeAll: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    // First, get all residents in this team
    const residents = await ctx.db
      .query("residents")
      .withIndex("byTeamId", (q) => q.eq("teamId", args.teamId))
      .collect();

    const residentIds = residents.map((r) => r._id);

    // If no residents in team, return empty array
    if (residentIds.length === 0) {
      return [];
    }

    // Get all appointments for these residents
    const allAppointments = await Promise.all(
      residentIds.map((residentId) =>
        ctx.db
          .query("appointments")
          .withIndex("byResidentId", (q) => q.eq("residentId", residentId))
          .collect()
      )
    );

    // Flatten the array of arrays
    let appointments = allAppointments.flat();

    // If includeAll is false or not specified, only show upcoming scheduled appointments
    if (!args.includeAll) {
      appointments = appointments.filter(
        appointment =>
          appointment.status === "scheduled" &&
          appointment.startTime >= now
      );
    } else {
      // Filter by status if specified
      if (args.status) {
        appointments = appointments.filter(appointment => appointment.status === args.status);
      }
    }

    // Get resident details for each appointment
    const appointmentsWithResidents = await Promise.all(
      appointments.map(async (appointment) => {
        const resident = await ctx.db.get(appointment.residentId);

        if (!resident) {
          return {
            ...appointment,
            resident: null,
          };
        }

        // Get the resident's image URL
        const residentImage = await ctx.db
          .query("files")
          .filter((q) => q.eq(q.field("type"), "resident"))
          .filter((q) => q.eq(q.field("userId"), resident._id))
          .first();

        let imageUrl = null;
        if (residentImage?.format === "image") {
          imageUrl = await ctx.storage.getUrl(residentImage.body);
        }

        return {
          ...appointment,
          resident: {
            _id: resident._id,
            firstName: resident.firstName,
            lastName: resident.lastName,
            roomNumber: resident.roomNumber,
            imageUrl: imageUrl,
          },
        };
      })
    );

    // Sort by start time (earliest first)
    return appointmentsWithResidents.sort((a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  },
});