import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { resolveUser, resolveCareHome, ROLES } from "./lib/rbac";
import { Id } from "./_generated/dataModel";
import { components } from "./_generated/api";

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
    // RBAC: Resolve user and verify access
    const { role, activeUnitId, organizationId, user } = await resolveUser(ctx);
    console.log(`[createAppointment] resolveUser result: role=${role}, org=${organizationId}, unit=${activeUnitId}`);

    const resident = await ctx.db.get(args.residentId);
    if (!resident) {
      throw new Error("Resident not found");
    }

    // Verify organization match for all roles
    if (organizationId && resident.organizationId !== organizationId) {
      throw new Error("Unauthorized: Resident does not belong to your organization");
    }

    // If role is null, try to determine it from manager assignments or team memberships
    let effectiveRole = role;
    if (!effectiveRole) {
      const identity = await ctx.auth.getUserIdentity();
      console.log(`[createAppointment] Checking identity for fallback role: ${identity?.subject}`);

      if (identity?.subject) {
        // Check if user is a manager
        const managerAssignment = await ctx.db
          .query("careHomeManagers")
          .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
          .first();

        if (managerAssignment) {
          effectiveRole = ROLES.MANAGER;
        } else {
          // Check if user is a team member (nurse/care assistant)
          const teamMember = await ctx.db
            .query("teamMembers")
            .withIndex("byUserId", (q) => q.eq("userId", identity.subject))
            .first();

          if (teamMember?.role && Object.values(ROLES).includes(teamMember.role as any)) {
            effectiveRole = teamMember.role as any;
          } else {
            // Fallback: If no explicit assignment, default to Manager (or Nurse if active unit set)
            // This ensures managers without specific care home assignments can still create appointments
            effectiveRole = activeUnitId ? ROLES.NURSE : ROLES.MANAGER;
            console.log(`[createAppointment] No explicit role found. Defaulting to fallback: ${effectiveRole}`);
          }
        }
      } else {
        // Fallback if no identity subject (unlikely but safe to enable fallback)
        effectiveRole = activeUnitId ? ROLES.NURSE : ROLES.MANAGER;
      }
    }

    if (!effectiveRole) {
      throw new Error("Unauthorized: User role not found");
    }

    // Role-based authorization
    if (effectiveRole === ROLES.NURSE) {
      // For Nurse: verify they have access to the resident's team
      const identity = await ctx.auth.getUserIdentity();
      if (!identity?.subject) {
        throw new Error("Unauthorized: User identity not found");
      }

      // Get the unit for the resident's team
      const unit = await ctx.db
        .query("units")
        .withIndex("by_teamId", (q) => q.eq("teamId", resident.teamId))
        .first();

      if (!unit) {
        // No unit linked to this team yet: allow if user is a team member
        const teamMembership = await ctx.db
          .query("teamMembers")
          .withIndex("byUserAndTeam", (q) =>
            q.eq("userId", identity.subject).eq("teamId", resident.teamId)
          )
          .first();

        if (!teamMembership) {
          throw new Error("Unauthorized: You are not a member of this resident's team");
        }
        // Team membership is enough when units are not configured
      } else {
        // If activeUnitId is set, ensure it matches the resident's unit
        if (activeUnitId && unit._id !== activeUnitId) {
          throw new Error("Unauthorized: Resident does not belong to your active unit");
        }

        // If activeUnitId is missing, validate assignment via unitStaff
        if (!activeUnitId) {
          const assignments = await ctx.db
            .query("unitStaff")
            .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
            .collect();

          const isAssignedToUnit = assignments.some(
            (assignment) => assignment.unitId === unit._id
          );

          if (!isAssignedToUnit) {
            // Also check team membership as fallback
            const teamMembership = await ctx.db
              .query("teamMembers")
              .withIndex("byUserAndTeam", (q) =>
                q.eq("userId", identity.subject).eq("teamId", resident.teamId)
              )
              .first();

            if (!teamMembership) {
              throw new Error("Unauthorized: You are not assigned to this resident's unit or team");
            }
          }
        }
      }

      // Ensure teamId is set correctly
      if (!args.teamId) {
        args.teamId = resident.teamId;
      }
    } else if (effectiveRole === ROLES.MANAGER) {
      // For Manager: verify they manage the care home containing the resident
      // Get the unit/team for the resident
      const unit = await ctx.db
        .query("units")
        .withIndex("by_teamId", (q) => q.eq("teamId", resident.teamId))
        .first();

      if (unit) {
        // Verify the manager is assigned to this care home
        const identity = await ctx.auth.getUserIdentity();
        if (!identity?.subject) {
          throw new Error("Unauthorized: User identity not found");
        }

        const managerAssignment = await ctx.db
          .query("careHomeManagers")
          .withIndex("by_careHomeId", (q) => q.eq("careHomeId", unit.careHomeId))
          .filter((q) => q.eq(q.field("userId"), identity.subject))
          .first();

        if (!managerAssignment) {
          console.warn(`[RBAC] Access denied: Manager attempted to create appointment for resident in care home they don't manage`);
          throw new Error("Unauthorized: You are not a manager of the care home containing this resident");
        }

        // Verify organization match
        const careHome = await ctx.db.get(unit.careHomeId);
        if (!careHome || careHome.organizationId !== organizationId) {
          throw new Error("Unauthorized: Care home does not belong to your organization");
        }
      }

      // Ensure teamId is set correctly
      if (!args.teamId) {
        args.teamId = resident.teamId;
      }
    } else if (effectiveRole === ROLES.OWNER || effectiveRole === ROLES.SAAS_ADMIN) {
      // Owner and SaaS Admin can create appointments for any resident in their organization
      // Ensure teamId is set correctly
      if (!args.teamId) {
        args.teamId = resident.teamId;
      }
    } else {
      // Other roles (like care_assistant) cannot create appointments
      throw new Error("Unauthorized: Your role does not have permission to create appointments");
    }

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

    // Send notifications to all managers in the care home
    try {
      // Get the unit/team for the resident to find the care home
      const unit = await ctx.db
        .query("units")
        .withIndex("by_teamId", (q) => q.eq("teamId", resident.teamId))
        .first();

      let careHomeId: Id<"careHomes"> | null = null;

      if (unit) {
        careHomeId = unit.careHomeId;
        console.log(`[Appointment Notifications] Found unit ${unit._id} for team ${resident.teamId}, careHomeId: ${careHomeId}`);
      } else {
        // Fallback: Try to find care home through organization
        console.warn(`[Appointment Notifications] No unit found for resident teamId: ${resident.teamId}, trying alternative lookup`);
        // If no unit, we can't determine the care home, so skip notifications
        console.warn(`[Appointment Notifications] Cannot send notifications - no unit/care home found for resident teamId: ${resident.teamId}`);
      }

      if (careHomeId) {
        // Get all managers assigned to this care home
        const managerAssignments = await ctx.db
          .query("careHomeManagers")
          .withIndex("by_careHomeId", (q) => q.eq("careHomeId", careHomeId!))
          .collect();

        console.log(`[Appointment Notifications] Found ${managerAssignments.length} manager assignments for careHomeId: ${careHomeId}`);

        // Get creator info for notification
        const identity = await ctx.auth.getUserIdentity();
        const creatorName = user?.name || identity?.email || "System";

        let notificationsCreated = 0;
        let notificationsFailed = 0;

        // Create notifications for each manager
        for (const managerAssignment of managerAssignments) {
          // Get manager email from Better Auth
          let managerEmail: string | null = null;
          try {
            const managerUser = await ctx.runQuery(components.betterAuth.lib.findOne, {
              model: "user",
              where: [{ field: "id", value: managerAssignment.userId }]
            });
            managerEmail = managerUser?.email || null;
            if (managerEmail) {
              console.log(`[Appointment Notifications] Found manager email: ${managerEmail} for userId: ${managerAssignment.userId}`);
            }
          } catch (error) {
            console.error(`[Appointment Notifications] Error getting manager email from Better Auth for userId ${managerAssignment.userId}:`, error);
          }

          // If we couldn't get email from Better Auth, skip this manager
          if (!managerEmail) {
            console.warn(`[Appointment Notifications] Could not find email for manager with userId: ${managerAssignment.userId}. Skipping notification.`);
            notificationsFailed++;
            continue;
          }

          // Verify the manager user exists in the users table (for logging purposes)
          const managerUserRecord = await ctx.db
            .query("users")
            .withIndex("byEmail", (q) => q.eq("email", managerEmail!))
            .first();

          if (!managerUserRecord) {
            console.warn(`[Appointment Notifications] Manager user record not found in users table for email: ${managerEmail}. Notification will still be created.`);
          }

          // Create notification for this manager using email as userId
          // The notification system uses email as userId (see notifications.ts getUserNotifications)
          try {
            const notificationId = await ctx.db.insert("notifications", {
              userId: managerEmail,
              senderId: identity?.subject,
              senderName: creatorName,
              type: "appointment_created",
              title: "New Appointment Created",
              message: `${args.title} for ${resident.firstName} ${resident.lastName} on ${new Date(args.startTime).toLocaleDateString()}`,
              link: `/dashboard/residents/${resident._id}/appointments`,
              metadata: {
                appointmentId: appointment,
                residentId: args.residentId,
                residentName: `${resident.firstName} ${resident.lastName}`,
                startTime: args.startTime,
                location: args.location
              },
              organizationId: args.organizationId,
              teamId: args.teamId,
              isRead: false,
              createdAt: now,
            });
            console.log(`[Appointment Notifications] ✓ Successfully created notification ${notificationId} for manager: ${managerEmail}`);
            notificationsCreated++;
          } catch (notificationError) {
            console.error(`[Appointment Notifications] ✗ Error creating notification for manager ${managerEmail}:`, notificationError);
            notificationsFailed++;
          }
        }

        console.log(`[Appointment Notifications] Summary: ${notificationsCreated} created, ${notificationsFailed} failed out of ${managerAssignments.length} managers`);
      }
    } catch (error) {
      // Log error but don't fail appointment creation if notification fails
      console.error("[Appointment Notifications] Fatal error creating appointment notifications:", error);
    }

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
    // RBAC: Resolve user and enforce access
    const { role, activeUnitId, organizationId } = await resolveUser(ctx);

    if (!role) {
      throw new Error("Unauthorized: User role not found");
    }

    // For Nurse/Care Assistant: STRICT filtering - only their active team
    if (role === ROLES.NURSE || role === ROLES.CARE_ASSISTANT) {
      // Get user's activeTeamId from the users table
      const identity = await ctx.auth.getUserIdentity();
      let userActiveTeamId: string | undefined = undefined;
      if (identity?.email) {
        const convexUser = await ctx.db
          .query("users")
          .withIndex("byEmail", (q) => q.eq("email", identity.email!))
          .first();
        userActiveTeamId = convexUser?.activeTeamId;
      }

      // If activeUnitId is set, use it to verify access
      if (activeUnitId) {
        const unit = await ctx.db.get(activeUnitId);
        if (!unit) {
          console.warn(`[getAppointmentsByTeam] Access denied: User's active unit ${activeUnitId} not found`);
          return [];
        }

        // Verify the requested teamId matches the nurse's active unit's teamId
        if (unit.teamId !== args.teamId) {
          console.warn(`[getAppointmentsByTeam] Access denied: User attempted to access appointments for team ${args.teamId} but active team is ${unit.teamId}`);
          return [];
        }

        console.log(`[getAppointmentsByTeam] Nurse access granted for team ${args.teamId} (matches active unit ${activeUnitId})`);
      } else if (userActiveTeamId && userActiveTeamId === args.teamId) {
        // Fallback: If activeUnitId is not set but activeTeamId matches, allow access
        console.log(`[getAppointmentsByTeam] Nurse access granted for team ${args.teamId} (matches activeTeamId, activeUnitId not set)`);
      } else {
        // No activeUnitId and activeTeamId doesn't match or is not set
        console.warn(`[getAppointmentsByTeam] Access denied: Nurse/Care Assistant attempted to access appointments without active unit. activeTeamId: ${userActiveTeamId || 'not set'}, requested teamId: ${args.teamId}`);
        return [];
      }
    }

    // For Manager: Verify team belongs to a care home they manage
    if (role === ROLES.MANAGER) {
      const unit = await ctx.db
        .query("units")
        .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
        .first();

      if (unit) {
        const identity = await ctx.auth.getUserIdentity();
        if (identity?.subject) {
          const managerAssignment = await ctx.db
            .query("careHomeManagers")
            .withIndex("by_careHomeId", (q) => q.eq("careHomeId", unit.careHomeId))
            .filter((q) => q.eq(q.field("userId"), identity.subject))
            .first();

          if (!managerAssignment) {
            console.warn(`[RBAC] Access denied: Manager attempted to access appointments for team ${args.teamId} in care home they don't manage`);
            return [];
          }
        }
      }
    }

    const now = new Date().toISOString();

    // Get current user for read status
    const identity = await ctx.auth.getUserIdentity();
    let currentUser: any = null;
    if (identity) {
      currentUser = await ctx.db
        .query("users")
        .withIndex("byEmail", (q) => q.eq("email", identity.email!))
        .first();
    }

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

    // Get resident details and read status for each appointment
    const appointmentsWithResidents = await Promise.all(
      appointments.map(async (appointment) => {
        const resident = await ctx.db.get(appointment.residentId);

        if (!resident) {
          return {
            ...appointment,
            resident: null,
            isRead: false,
          };
        }

        // Get the resident's image URL
        const residentImage = await ctx.db
          .query("files")
          .filter((q) => q.eq(q.field("type"), "resident"))
          .filter((q) => q.eq(q.field("userId"), resident._id))
          .first();

        let imageUrl: string | null = null;
        if (residentImage?.format === "image") {
          imageUrl = await ctx.storage.getUrl(residentImage.body);
        }

        // Check if current user has read this appointment
        let isRead = false;
        if (currentUser) {
          const readStatus = await ctx.db
            .query("appointmentReadStatus")
            .withIndex("by_user_and_appointment", (q) =>
              q.eq("userId", currentUser._id).eq("appointmentId", appointment._id)
            )
            .first();
          isRead = !!readStatus;
        }

        return {
          ...appointment,
          isRead,
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

// Get appointments for an entire organization
export const getAppointmentsByOrganization = query({
  args: {
    organizationId: v.string(),
    careHomeId: v.optional(v.id("careHomes")),
    status: v.optional(v.union(
      v.literal("scheduled"),
      v.literal("completed"),
      v.literal("cancelled")
    )),
    includeAll: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    // RBAC: Resolve user and enforce access
    const { role, organizationId: userOrgId, activeUnitId, user } = await resolveUser(ctx);

    // If role is null, try to determine it from manager assignments or team memberships
    let effectiveRole = role;
    if (!effectiveRole) {
      const identity = await ctx.auth.getUserIdentity();
      if (identity?.subject) {
        // Check if user is a manager
        const managerAssignment = await ctx.db
          .query("careHomeManagers")
          .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
          .first();
        if (managerAssignment) {
          effectiveRole = ROLES.MANAGER;
        } else {
          // Check if user is a team member (nurse/care assistant)
          const teamMember = await ctx.db
            .query("teamMembers")
            .withIndex("byUserId", (q) => q.eq("userId", identity.subject))
            .first();
          if (teamMember?.role && Object.values(ROLES).includes(teamMember.role as any)) {
            effectiveRole = teamMember.role as any;
          } else {
            effectiveRole = activeUnitId ? ROLES.NURSE : ROLES.MANAGER;
          }
        }
      } else {
        effectiveRole = activeUnitId ? ROLES.NURSE : ROLES.MANAGER;
      }
    }

    // Verify organization access (unless SaaS Admin)
    if (effectiveRole !== ROLES.SAAS_ADMIN && userOrgId && args.organizationId !== userOrgId) {
      throw new Error("Unauthorized: Cannot access different organization");
    }

    // Resolve care home context
    let targetCareHomeId: Id<"careHomes"> | null = null;
    if (args.careHomeId) {
      const careHome = await ctx.db.get(args.careHomeId);
      if (careHome && (role === ROLES.SAAS_ADMIN || careHome.organizationId === args.organizationId)) {
        targetCareHomeId = args.careHomeId;
      }
    } else {
      targetCareHomeId = await resolveCareHome(ctx);
    }

    // Get current user for read status
    const identity = await ctx.auth.getUserIdentity();
    let currentUser: any = null;
    if (identity) {
      currentUser = await ctx.db
        .query("users")
        .withIndex("byEmail", (q) => q.eq("email", identity.email!))
        .first();
    }

    // Get residents - filter by care home if specified
    let residents = await ctx.db
      .query("residents")
      .withIndex("byOrganizationId", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // For Manager: Show appointments from all care homes they manage
    if (effectiveRole === ROLES.MANAGER) {
      const identity = await ctx.auth.getUserIdentity();
      if (identity?.subject) {
        // Get all care homes the manager is assigned to
        const managerAssignments = await ctx.db
          .query("careHomeManagers")
          .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
          .collect();

        if (managerAssignments.length > 0) {
          // Get all units in care homes the manager manages
          const careHomeIds = managerAssignments.map(a => a.careHomeId);
          console.log(`[getAppointmentsByOrganization] Manager ${identity.subject} manages care homes: ${careHomeIds.join(', ')}`);

          const allUnits = await Promise.all(
            careHomeIds.map(careHomeId =>
              ctx.db
                .query("units")
                .withIndex("by_careHomeId", (q) => q.eq("careHomeId", careHomeId))
                .collect()
            )
          );
          const flatUnits = allUnits.flat();
          const teamIds = new Set(flatUnits.map(u => u.teamId));
          console.log(`[getAppointmentsByOrganization] Found ${flatUnits.length} units with team IDs: ${Array.from(teamIds).join(', ')}`);

          const totalResidentsBeforeFilter = residents.length;
          residents = residents.filter((resident: any) => teamIds.has(resident.teamId));
          console.log(`[getAppointmentsByOrganization] Filtered residents from ${totalResidentsBeforeFilter} to ${residents.length}. Missing teams?`);

          if (residents.length === 0 && totalResidentsBeforeFilter > 0) {
            console.warn(`[getAppointmentsByOrganization] WARNING: All residents filtered out! Check if Units are created and linked to Teams.`);
            // Log a few distinct teamIds from the residents that were filtered out to help debugging
            const residentTeamIds = new Set(residents.map((r: any) => r.teamId)); // This is empty now
            // Re-calculate dropped for logging
            const droppedResidents = await ctx.db
              .query("residents")
              .withIndex("byOrganizationId", (q) => q.eq("organizationId", args.organizationId))
              .collect();
            const droppedTeamIds = new Set(droppedResidents.map((r: any) => r.teamId).filter((tid: string) => !teamIds.has(tid)));
            console.warn(`[getAppointmentsByOrganization] Residents exist in these Team IDs which are NOT in the Manager's Units: ${Array.from(droppedTeamIds).join(', ')}`);
          }
        } else {
          // Manager not assigned to any care home - fallback to ALL organization appointments
          // This ensures that new managers or managers of single-care-home orgs can see appointments immediately
          console.warn(`[getAppointmentsByOrganization] Manager ${identity.subject} has NO care home assignments. Fallback: Showing ALL appointments in organization.`);
          // We do not filter 'residents' array, as it already contains all residents in the organization
        }
      } else {
        return [];
      }
    } else if (targetCareHomeId && effectiveRole === ROLES.OWNER) {
      // For Owner: filter by care home if specified
      const units = await ctx.db
        .query("units")
        .withIndex("by_careHomeId", (q) => q.eq("careHomeId", targetCareHomeId!))
        .collect();

      const teamIds = new Set(units.map(u => u.teamId));
      console.log(`[getAppointmentsByOrganization] Owner switched to careHome ${targetCareHomeId}. Found ${units.length} units with team IDs: ${Array.from(teamIds).join(', ')}`);

      const totalResidentsBeforeFilter = residents.length;
      residents = residents.filter((resident: any) => teamIds.has(resident.teamId));
      console.log(`[getAppointmentsByOrganization] Owner filter: Residents from ${totalResidentsBeforeFilter} to ${residents.length}.`);

      if (residents.length === 0 && totalResidentsBeforeFilter > 0) {
        console.warn(`[getAppointmentsByOrganization] WARNING: Owner sees 0 residents after filtering by Care Home! Check Unit-Team links.`);
      }
    }

    // For Nurse/Care Assistant, STRICT filtering - only their active unit
    if (effectiveRole === ROLES.NURSE || effectiveRole === ROLES.CARE_ASSISTANT) {
      if (!activeUnitId) {
        console.warn(`[getAppointmentsByOrganization] Access denied: Nurse/Care Assistant attempted to access appointments without active unit`);
        return [];
      }
      const unit = await ctx.db.get(activeUnitId);
      if (!unit) {
        console.warn(`[getAppointmentsByOrganization] Access denied: User's active unit ${activeUnitId} not found`);
        return [];
      }
      // Filter residents to only those in the nurse's active unit's team
      residents = residents.filter((resident: any) => resident.teamId === unit.teamId);
      console.log(`[getAppointmentsByOrganization] Filtered to ${residents.length} residents in team ${unit.teamId} for nurse with activeUnitId ${activeUnitId}`);
    }

    const residentIds = residents.map((r) => r._id);

    // If no residents in organization, return empty array
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

    // Get resident details and read status for each appointment
    const appointmentsWithResidents = await Promise.all(
      appointments.map(async (appointment) => {
        const resident = await ctx.db.get(appointment.residentId);

        if (!resident) {
          return {
            ...appointment,
            resident: null,
            isRead: false,
          };
        }

        // Get the resident's image URL
        const residentImage = await ctx.db
          .query("files")
          .filter((q) => q.eq(q.field("type"), "resident"))
          .filter((q) => q.eq(q.field("userId"), resident._id))
          .first();

        let imageUrl: string | null = null;
        if (residentImage?.format === "image") {
          imageUrl = await ctx.storage.getUrl(residentImage.body);
        }

        // Check if current user has read this appointment
        let isRead = false;
        if (currentUser) {
          const readStatus = await ctx.db
            .query("appointmentReadStatus")
            .withIndex("by_user_and_appointment", (q) =>
              q.eq("userId", currentUser._id).eq("appointmentId", appointment._id)
            )
            .first();
          isRead = !!readStatus;
        }

        return {
          ...appointment,
          isRead,
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

// Get count of upcoming appointments for a team or organization
export const getUpcomingAppointmentsCount = query({
  args: {
    teamId: v.optional(v.string()),
    organizationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    // If teamId is provided, get appointments for that team
    if (args.teamId) {
      const teamId = args.teamId;
      // Get all residents in this team
      const residents = await ctx.db
        .query("residents")
        .withIndex("byTeamId", (q) => q.eq("teamId", teamId))
        .collect();

      const residentIds = residents.map((r) => r._id);

      if (residentIds.length === 0) {
        return 0;
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

      // Flatten and filter for upcoming scheduled appointments
      const upcomingAppointments = allAppointments
        .flat()
        .filter(
          (appointment) =>
            appointment.status === "scheduled" && appointment.startTime >= now
        );

      return upcomingAppointments.length;
    }

    // If organizationId is provided, get appointments for entire organization
    if (args.organizationId) {
      const organizationId = args.organizationId;
      // Get all residents in this organization
      const residents = await ctx.db
        .query("residents")
        .withIndex("byOrganizationId", (q) => q.eq("organizationId", organizationId))
        .collect();

      const residentIds = residents.map((r) => r._id);

      if (residentIds.length === 0) {
        return 0;
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

      // Flatten and filter for upcoming scheduled appointments
      const upcomingAppointments = allAppointments
        .flat()
        .filter(
          (appointment) =>
            appointment.status === "scheduled" && appointment.startTime >= now
        );

      return upcomingAppointments.length;
    }

    return 0;
  },
});