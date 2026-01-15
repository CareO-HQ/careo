import { v } from "convex/values";
import { query } from "./_generated/server";
import { components } from "./_generated/api";
import { resolveUser, resolveCareHome, ROLES } from "./lib/rbac";
import { Id } from "./_generated/dataModel";

/**
 * Get dashboard statistics for a specific team
 */
export const getDashboardStatsByTeam = query({
  args: { teamId: v.string() },
  handler: async (ctx, args) => {
    // Get total residents for this team
    const residents = await ctx.db
      .query("residents")
      .withIndex("byTeamId", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.neq(q.field("isActive"), false))
      .collect();

    // Get total team members
    const teamMembers = await ctx.db
      .query("teamMembers")
      .withIndex("byTeamId", (q) => q.eq("teamId", args.teamId))
      .collect();

    // Get latest 5 incidents for this team
    const allIncidents = await ctx.db
      .query("incidents")
      .order("desc")
      .collect();

    const teamIncidents = allIncidents
      .filter((incident) => {
        if (incident.residentId) {
          const resident = residents.find((r) => r._id === incident.residentId);
          return resident !== undefined;
        }
        return false;
      })
      .slice(0, 5);

    // Fetch resident details for incidents
    const incidentsWithResident = await Promise.all(
      teamIncidents.map(async (incident) => {
        if (incident.residentId) {
          const resident = await ctx.db.get(incident.residentId);
          return {
            ...incident,
            resident: resident
              ? {
                  firstName: resident.firstName,
                  lastName: resident.lastName,
                  imageUrl: resident.imageUrl,
                }
              : null,
          };
        }
        return { ...incident, resident: null };
      })
    );

    // Get upcoming appointments for this team
    // First get resident IDs in this team
    const residentIds = residents.map((r) => r._id);

    // Get all appointments for these residents
    const allAppointments = residentIds.length > 0
      ? await Promise.all(
          residentIds.map((residentId) =>
            ctx.db
              .query("appointments")
              .withIndex("byResidentId", (q) => q.eq("residentId", residentId))
              .collect()
          )
        )
      : [];

    // Flatten and filter for upcoming scheduled appointments
    const upcomingAppointments = allAppointments
      .flat()
      .filter((apt) => {
        const startTime = new Date(apt.startTime);
        return startTime >= new Date() && apt.status === "scheduled";
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 5);

    // Fetch resident details for appointments
    const appointmentsWithResident = await Promise.all(
      upcomingAppointments.map(async (appointment) => {
        const resident = await ctx.db.get(appointment.residentId);
        return {
          ...appointment,
          resident: resident
            ? {
                firstName: resident.firstName,
                lastName: resident.lastName,
                imageUrl: resident.imageUrl,
              }
            : null,
        };
      })
    );

    // Get recent hospital transfers for this team
    const hospitalTransfers = await ctx.db
      .query("hospitalTransferLogs")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .order("desc")
      .take(5);

    // Fetch resident details for transfers
    const transfersWithResident = await Promise.all(
      hospitalTransfers.map(async (transfer) => {
        const resident = await ctx.db.get(transfer.residentId);
        return {
          ...transfer,
          resident: resident
            ? {
                firstName: resident.firstName,
                lastName: resident.lastName,
                imageUrl: resident.imageUrl,
              }
            : null,
        };
      })
    );

    return {
      totalResidents: residents.length,
      totalStaff: teamMembers.length,
      totalUnits: 1, // Single team
      latestIncidents: incidentsWithResident,
      upcomingAppointments: appointmentsWithResident,
      recentHospitalTransfers: transfersWithResident,
    };
  },
});

/**
 * Get dashboard statistics for entire organization
 * Optionally filtered by care home
 */
export const getDashboardStatsByOrganization = query({
  args: { 
    organizationId: v.string(),
    careHomeId: v.optional(v.id("careHomes"))
  },
  handler: async (ctx, args) => {
    // RBAC: Resolve user and enforce access
    // Allow role to be null during onboarding - check organizationId instead
    let role: string | null = null;
    let userOrgId: string | null = null;
    
    try {
      const resolved = await resolveUser(ctx);
      role = resolved.role;
      userOrgId = resolved.organizationId;
    } catch (error) {
      // If resolveUser fails, try to get organizationId from session directly
      // This handles cases during onboarding when member record might not exist yet
      const session = await ctx.runQuery(components.betterAuth.lib.getCurrentSession);
      if (session?.activeOrganizationId) {
        userOrgId = session.activeOrganizationId;
      } else {
        throw new Error("Unauthorized: Not authenticated");
      }
    }
    
    // Verify organization access (unless SaaS Admin)
    // Allow access during onboarding when role might be null but organizationId matches
    if (role !== ROLES.SAAS_ADMIN) {
      // If we have a userOrgId, it must match the requested organizationId
      if (userOrgId && args.organizationId !== userOrgId) {
        throw new Error("Unauthorized: Cannot access different organization");
      }
      // If we don't have userOrgId at all, deny access
      // (This prevents unauthorized access when user has no organization)
      if (!userOrgId) {
        throw new Error("Unauthorized: No organization access");
      }
    }
    
    // Resolve care home context
    let targetCareHomeId: Id<"careHomes"> | null = null;
    if (args.careHomeId) {
      const careHome = await ctx.db.get(args.careHomeId);
      if (careHome && (role === ROLES.SAAS_ADMIN || careHome.organizationId === args.organizationId)) {
        targetCareHomeId = args.careHomeId;
      }
    } else if (role) {
      // Only try to resolve care home if we have a role
      // During onboarding, role might be null
      targetCareHomeId = await resolveCareHome(ctx);
    }
    
    // Get residents - filter by care home if specified
    let residents = await ctx.db
      .query("residents")
      .withIndex("byOrganizationId", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.neq(q.field("isActive"), false))
      .collect();
    
    // Apply care home filter for Manager and Owner (only if role is set)
    if (targetCareHomeId && role && (role === ROLES.MANAGER || role === ROLES.OWNER)) {
      // Get all units in this care home
      const units = await ctx.db
        .query("units")
        .withIndex("by_careHomeId", (q) => q.eq("careHomeId", targetCareHomeId!))
        .collect();
      
      const teamIds = new Set(units.map(u => u.teamId));
      residents = residents.filter((resident: any) => teamIds.has(resident.teamId));
    }

    // Get total team members in organization - filter by care home if specified
    let teamMembers = await ctx.db
      .query("teamMembers")
      .withIndex("byOrganization", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    
    // Apply care home filter for Manager and Owner (only if role is set)
    if (targetCareHomeId && role && (role === ROLES.MANAGER || role === ROLES.OWNER)) {
      // Get all units in this care home
      const units = await ctx.db
        .query("units")
        .withIndex("by_careHomeId", (q) => q.eq("careHomeId", targetCareHomeId!))
        .collect();
      
      const teamIds = new Set(units.map(u => u.teamId));
      teamMembers = teamMembers.filter((tm: any) => teamIds.has(tm.teamId));
    }

    // Get total units - filter by care home if specified
    let totalUnits = 0;

    if (targetCareHomeId && role && (role === ROLES.MANAGER || role === ROLES.OWNER)) {
      // Count units in this care home
      const units = await ctx.db
        .query("units")
        .withIndex("by_careHomeId", (q) => q.eq("careHomeId", targetCareHomeId!))
        .collect();
      totalUnits = units.length;
    } else {
      // Count all units in organization
      try {
        const units = await ctx.db
          .query("units")
          .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
          .collect();
        totalUnits = units.length;
      } catch (error) {
        console.error("Error fetching units:", error);
        // Fallback to counting unique teams from teamMembers
        const uniqueTeams = new Set(teamMembers.map((member: any) => member.teamId));
        totalUnits = uniqueTeams.size;
      }
    }

    // Get latest 5 incidents for this organization
    const allIncidents = await ctx.db
      .query("incidents")
      .order("desc")
      .collect();

    const orgIncidents = allIncidents
      .filter((incident) => {
        if (incident.residentId) {
          const resident = residents.find((r) => r._id === incident.residentId);
          return resident !== undefined;
        }
        return false;
      })
      .slice(0, 5);

    // Fetch resident details for incidents
    const incidentsWithResident = await Promise.all(
      orgIncidents.map(async (incident) => {
        if (incident.residentId) {
          const resident = await ctx.db.get(incident.residentId);
          return {
            ...incident,
            resident: resident
              ? {
                  firstName: resident.firstName,
                  lastName: resident.lastName,
                  imageUrl: resident.imageUrl,
                }
              : null,
          };
        }
        return { ...incident, resident: null };
      })
    );

    // Get upcoming appointments for this organization
    // First get resident IDs in this organization
    const residentIds = residents.map((r) => r._id);

    // Get all appointments for these residents
    const allAppointments = residentIds.length > 0
      ? await Promise.all(
          residentIds.map((residentId) =>
            ctx.db
              .query("appointments")
              .withIndex("byResidentId", (q) => q.eq("residentId", residentId))
              .collect()
          )
        )
      : [];

    // Flatten and filter for upcoming scheduled appointments
    const upcomingAppointments = allAppointments
      .flat()
      .filter((apt) => {
        const startTime = new Date(apt.startTime);
        return startTime >= new Date() && apt.status === "scheduled";
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 5);

    // Fetch resident details for appointments
    const appointmentsWithResident = await Promise.all(
      upcomingAppointments.map(async (appointment) => {
        const resident = await ctx.db.get(appointment.residentId);
        return {
          ...appointment,
          resident: resident
            ? {
                firstName: resident.firstName,
                lastName: resident.lastName,
                imageUrl: resident.imageUrl,
              }
            : null,
        };
      })
    );

    // Get recent hospital transfers for this organization
    const hospitalTransfers = await ctx.db
      .query("hospitalTransferLogs")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .take(5);

    // Fetch resident details for transfers
    const transfersWithResident = await Promise.all(
      hospitalTransfers.map(async (transfer) => {
        const resident = await ctx.db.get(transfer.residentId);
        return {
          ...transfer,
          resident: resident
            ? {
                firstName: resident.firstName,
                lastName: resident.lastName,
                imageUrl: resident.imageUrl,
              }
            : null,
        };
      })
    );

    return {
      totalResidents: residents.length,
      totalStaff: teamMembers.length,
      totalUnits: totalUnits,
      latestIncidents: incidentsWithResident,
      upcomingAppointments: appointmentsWithResident,
      recentHospitalTransfers: transfersWithResident,
    };
  },
});
