import { v } from "convex/values";
import { query } from "./_generated/server";

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
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("byTeamId", (q) => q.eq("teamId", args.teamId))
      .order("desc")
      .collect();

    const upcomingAppointments = appointments
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
 */
export const getDashboardStatsByOrganization = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    // Get total residents for this organization
    const residents = await ctx.db
      .query("residents")
      .withIndex("byOrganizationId", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.neq(q.field("isActive"), false))
      .collect();

    // Get total team members in organization
    const teamMembers = await ctx.db
      .query("teamMembers")
      .withIndex("byOrganization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Get unique teams (units) count
    const uniqueTeams = new Set(teamMembers.map((member) => member.teamId));

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
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("byOrganizationId", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .collect();

    const upcomingAppointments = appointments
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
      totalUnits: uniqueTeams.size,
      latestIncidents: incidentsWithResident,
      upcomingAppointments: appointmentsWithResident,
      recentHospitalTransfers: transfersWithResident,
    };
  },
});
