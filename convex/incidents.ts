import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { components } from "./_generated/api";

export const create = mutation({
  args: {
    // Section 1: Incident Details (all required)
    date: v.string(),
    time: v.string(),
    homeName: v.string(),
    unit: v.string(),

    // Section 2: Injured Person Details
    injuredPersonFirstName: v.string(),
    injuredPersonSurname: v.string(),
    injuredPersonDOB: v.string(),
    residentId: v.optional(v.id("residents")),
    residentInternalId: v.optional(v.string()),
    dateOfAdmission: v.optional(v.string()),
    healthCareNumber: v.optional(v.string()),

    // Metadata for filtering
    teamId: v.optional(v.string()),
    organizationId: v.optional(v.string()),

    // Section 3: Status of Injured Person
    injuredPersonStatus: v.optional(v.array(v.string())), // Array of status values
    contractorEmployer: v.optional(v.string()), // Only filled if "Contractor" is selected

    // Section 4: Type of Incident
    incidentTypes: v.array(v.string()), // Required with at least one type for new records
    typeOtherDetails: v.optional(v.string()),

    // Section 5-6: Fall-Specific Questions
    anticoagulantMedication: v.optional(v.string()),
    fallPathway: v.optional(v.string()),

    // Section 7: Detailed Description
    detailedDescription: v.string(),

    // Section 8: Incident Level
    incidentLevel: v.string(),

    // Section 9: Details of Injury
    injuryDescription: v.optional(v.string()),
    bodyPartInjured: v.optional(v.string()),

    // Section 10: Treatment Required
    treatmentTypes: v.optional(v.array(v.string())),

    // Section 11: Details of Treatment Given
    treatmentDetails: v.optional(v.string()),
    vitalSigns: v.optional(v.string()),
    treatmentRefused: v.optional(v.boolean()),

    // Section 12: Witnesses
    witness1Name: v.optional(v.string()),
    witness1Contact: v.optional(v.string()),
    witness2Name: v.optional(v.string()),
    witness2Contact: v.optional(v.string()),

    // Section 13: Further Actions by Nurse
    nurseActions: v.optional(v.array(v.string())),

    // Section 14: Further Actions Advised
    furtherActionsAdvised: v.optional(v.string()),

    // Section 15: Prevention Measures
    preventionMeasures: v.optional(v.string()),

    // Section 16: Home Manager Informed
    homeManagerInformedBy: v.optional(v.string()),
    homeManagerInformedDateTime: v.optional(v.string()),

    // Section 17: Out of Hours On-Call
    onCallManagerName: v.optional(v.string()),
    onCallContactedDateTime: v.optional(v.string()),

    // Section 18: Next of Kin Informed
    nokInformedWho: v.optional(v.string()),
    nokInformedBy: v.optional(v.string()),
    nokInformedDateTime: v.optional(v.string()),

    // Section 19: Trust Incident Form Recipients
    careManagerName: v.optional(v.string()),
    careManagerEmail: v.optional(v.string()),
    keyWorkerName: v.optional(v.string()),
    keyWorkerEmail: v.optional(v.string()),

    // Section 20: Form Completion Details
    completedByFullName: v.string(),
    completedByJobTitle: v.string(),
    completedBySignature: v.optional(v.string()),
    dateCompleted: v.string(),
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

    const session = await ctx.runQuery(
      components.betterAuth.lib.getCurrentSession
    );

    if (!session || !session.userId || !session.activeOrganizationId) {
      throw new Error("Unauthorized: No active session or organization");
    }

    const member = await ctx.runQuery(components.betterAuth.lib.findOne, {
      model: "member",
      where: [
        { field: "userId", value: session.userId },
        { field: "organizationId", value: session.activeOrganizationId },
      ],
    });

    if (!member || member.role === "care_assistant") {
      throw new Error("Unauthorized: Care assistants cannot report incidents");
    }

    const incident = await ctx.db.insert("incidents", {
      // Section 1
      date: args.date,
      time: args.time,
      homeName: args.homeName,
      unit: args.unit,

      // Section 2
      injuredPersonFirstName: args.injuredPersonFirstName,
      injuredPersonSurname: args.injuredPersonSurname,
      injuredPersonDOB: args.injuredPersonDOB,
      residentId: args.residentId,
      residentInternalId: args.residentInternalId,
      dateOfAdmission: args.dateOfAdmission,
      healthCareNumber: args.healthCareNumber,

      // Section 3
      injuredPersonStatus: args.injuredPersonStatus,
      contractorEmployer: args.contractorEmployer,

      // Section 4
      incidentTypes: args.incidentTypes,
      typeOtherDetails: args.typeOtherDetails,

      // Section 5-6
      anticoagulantMedication: args.anticoagulantMedication,
      fallPathway: args.fallPathway,

      // Section 7
      detailedDescription: args.detailedDescription,

      // Section 8
      incidentLevel: args.incidentLevel,

      // Section 9
      injuryDescription: args.injuryDescription,
      bodyPartInjured: args.bodyPartInjured,

      // Section 10
      treatmentTypes: args.treatmentTypes,

      // Section 11
      treatmentDetails: args.treatmentDetails,
      vitalSigns: args.vitalSigns,
      treatmentRefused: args.treatmentRefused,

      // Section 12
      witness1Name: args.witness1Name,
      witness1Contact: args.witness1Contact,
      witness2Name: args.witness2Name,
      witness2Contact: args.witness2Contact,

      // Section 13
      nurseActions: args.nurseActions,

      // Section 14
      furtherActionsAdvised: args.furtherActionsAdvised,

      // Section 15
      preventionMeasures: args.preventionMeasures,

      // Section 16
      homeManagerInformedBy: args.homeManagerInformedBy,
      homeManagerInformedDateTime: args.homeManagerInformedDateTime,

      // Section 17
      onCallManagerName: args.onCallManagerName,
      onCallContactedDateTime: args.onCallContactedDateTime,

      // Section 18
      nokInformedWho: args.nokInformedWho,
      nokInformedBy: args.nokInformedBy,
      nokInformedDateTime: args.nokInformedDateTime,

      // Section 19
      careManagerName: args.careManagerName,
      careManagerEmail: args.careManagerEmail,
      keyWorkerName: args.keyWorkerName,
      keyWorkerEmail: args.keyWorkerEmail,

      // Section 20
      completedByFullName: args.completedByFullName,
      completedByJobTitle: args.completedByJobTitle,
      completedBySignature: args.completedBySignature,
      dateCompleted: args.dateCompleted,

      // Metadata
      status: "reported",
      createdAt: Date.now(),
      createdBy: user._id,
      teamId: args.teamId,
      organizationId: args.organizationId,
    });

    return incident;
  },
});

export const update = mutation({
  args: {
    incidentId: v.id("incidents"),
    // Section 1: Incident Details (all required)
    date: v.string(),
    time: v.string(),
    homeName: v.string(),
    unit: v.string(),

    // Section 2: Injured Person Details
    injuredPersonFirstName: v.string(),
    injuredPersonSurname: v.string(),
    injuredPersonDOB: v.string(),
    residentId: v.optional(v.id("residents")),
    residentInternalId: v.optional(v.string()),
    dateOfAdmission: v.optional(v.string()),
    healthCareNumber: v.optional(v.string()),

    // Metadata for filtering
    teamId: v.optional(v.string()),
    organizationId: v.optional(v.string()),

    // Section 3: Status of Injured Person
    injuredPersonStatus: v.optional(v.array(v.string())),
    contractorEmployer: v.optional(v.string()),

    // Section 4: Type of Incident
    incidentTypes: v.array(v.string()),
    typeOtherDetails: v.optional(v.string()),

    // Section 5-6: Fall-Specific Questions
    anticoagulantMedication: v.optional(v.string()),
    fallPathway: v.optional(v.string()),

    // Section 7: Detailed Description
    detailedDescription: v.string(),

    // Section 8: Incident Level
    incidentLevel: v.string(),

    // Section 9: Details of Injury
    injuryDescription: v.optional(v.string()),
    bodyPartInjured: v.optional(v.string()),

    // Section 10: Treatment Required
    treatmentTypes: v.optional(v.array(v.string())),

    // Section 11: Details of Treatment Given
    treatmentDetails: v.optional(v.string()),
    vitalSigns: v.optional(v.string()),
    treatmentRefused: v.optional(v.boolean()),

    // Section 12: Witnesses
    witness1Name: v.optional(v.string()),
    witness1Contact: v.optional(v.string()),
    witness2Name: v.optional(v.string()),
    witness2Contact: v.optional(v.string()),

    // Section 13: Further Actions by Nurse
    nurseActions: v.optional(v.array(v.string())),

    // Section 14: Further Actions Advised
    furtherActionsAdvised: v.optional(v.string()),

    // Section 15: Prevention Measures
    preventionMeasures: v.optional(v.string()),

    // Section 16: Home Manager Informed
    homeManagerInformedBy: v.optional(v.string()),
    homeManagerInformedDateTime: v.optional(v.string()),

    // Section 17: Out of Hours On-Call
    onCallManagerName: v.optional(v.string()),
    onCallContactedDateTime: v.optional(v.string()),

    // Section 18: Next of Kin Informed
    nokInformedWho: v.optional(v.string()),
    nokInformedBy: v.optional(v.string()),
    nokInformedDateTime: v.optional(v.string()),

    // Section 19: Trust Incident Form Recipients
    careManagerName: v.optional(v.string()),
    careManagerEmail: v.optional(v.string()),
    keyWorkerName: v.optional(v.string()),
    keyWorkerEmail: v.optional(v.string()),

    // Section 20: Completed By
    completedByFullName: v.string(),
    completedByJobTitle: v.optional(v.string()),
    completedBySignature: v.optional(v.string()),
    dateCompleted: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.runQuery(
      components.betterAuth.lib.getCurrentSession
    );

    if (!session || !session.userId || !session.activeOrganizationId) {
      throw new Error("Unauthorized: No active session or organization");
    }

    const member = await ctx.runQuery(components.betterAuth.lib.findOne, {
      model: "member",
      where: [
        { field: "userId", value: session.userId },
        { field: "organizationId", value: session.activeOrganizationId },
      ],
    });

    if (!member || (member.role !== "owner" && member.role !== "manager" && member.role !== "admin" && member.role !== "nurse")) {
      throw new Error("Unauthorized: Only owners, managers, and nurses can edit incidents");
    }

    const { incidentId, ...updateData } = args;

    await ctx.db.patch(incidentId, updateData);

    return incidentId;
  },
});

export const getByResident = query({
  args: { residentId: v.id("residents") },
  handler: async (ctx, args) => {
    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    return incidents;
  },
});

export const getAll = query({
  args: {
    limit: v.optional(v.number()),
    homeName: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    if (args.homeName) {
      const incidents = await ctx.db
        .query("incidents")
        .withIndex("by_home", (q) => q.eq("homeName", args.homeName!))
        .order("desc")
        .take(limit);
      return incidents;
    } else {
      const incidents = await ctx.db
        .query("incidents")
        .order("desc")
        .take(limit);
      return incidents;
    }
  },
});

export const getById = query({
  args: { incidentId: v.id("incidents") },
  handler: async (ctx, args) => {
    const incident = await ctx.db.get(args.incidentId);
    return incident;
  },
});

export const getIncidentStats = query({
  args: {
    residentId: v.optional(v.id("residents")),
    homeName: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    let incidents;

    if (args.residentId) {
      incidents = await ctx.db
        .query("incidents")
        .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
        .collect();
    } else if (args.homeName) {
      incidents = await ctx.db
        .query("incidents")
        .withIndex("by_home", (q) => q.eq("homeName", args.homeName!))
        .collect();
    } else {
      incidents = await ctx.db
        .query("incidents")
        .collect();
    }

    const totalIncidents = incidents.length;
    const fallsCount = incidents.filter(i =>
      // Check array format
      (i.incidentTypes?.includes("FallWitnessed") || i.incidentTypes?.includes("FallUnwitnessed"))
    ).length;
    const medicationErrors = incidents.filter(i =>
      // Check array format
      i.incidentTypes?.includes("Medication")
    ).length;

    const levelBreakdown = {
      death: incidents.filter(i => i.incidentLevel === "death").length,
      permanentHarm: incidents.filter(i => i.incidentLevel === "permanent_harm").length,
      minorInjury: incidents.filter(i => i.incidentLevel === "minor_injury").length,
      noHarm: incidents.filter(i => i.incidentLevel === "no_harm").length,
      nearMiss: incidents.filter(i => i.incidentLevel === "near_miss").length,
    };

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentIncidents = incidents.filter(i =>
      new Date(i.date) >= thirtyDaysAgo
    );

    const lastIncidentDate = incidents.length > 0
      ? Math.max(...incidents.map(i => new Date(i.date).getTime()))
      : null;

    const daysSinceLastIncident = lastIncidentDate
      ? Math.floor((now.getTime() - lastIncidentDate) / (1000 * 60 * 60 * 24))
      : null;

    return {
      totalIncidents,
      fallsCount,
      medicationErrors,
      levelBreakdown,
      recentIncidents: recentIncidents.length,
      daysSinceLastIncident,
    };
  },
});

// Get incidents with resident details for notifications (by homeName - legacy support)
export const getIncidentsWithResidents = query({
  args: {
    homeName: v.string(),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    // Get current user for read status
    const identity = await ctx.auth.getUserIdentity();
    let currentUser: any = null;
    if (identity) {
      currentUser = await ctx.db
        .query("users")
        .withIndex("byEmail", (q) => q.eq("email", identity.email!))
        .first();
    }

    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_home", (q) => q.eq("homeName", args.homeName))
      .order("desc")
      .take(limit);

    // Fetch resident details and read status for each incident
    const incidentsWithResidents = await Promise.all(
      incidents.map(async (incident) => {
        let resident: any = null;
        if (incident.residentId) {
          resident = await ctx.db.get(incident.residentId);
        }

        // Check if current user has read this incident
        let isRead = false;
        if (currentUser) {
          const readStatus = await ctx.db
            .query("notificationReadStatus")
            .withIndex("by_user_and_incident", (q) =>
              q.eq("userId", currentUser._id).eq("incidentId", incident._id)
            )
            .first();
          isRead = !!readStatus;
        }

        return {
          ...incident,
          isRead,
          resident: resident ? {
            _id: resident._id,
            firstName: resident.firstName,
            lastName: resident.lastName,
            roomNumber: resident.roomNumber,
            imageUrl: resident.imageUrl
          } : null
        };
      })
    );

    return incidentsWithResidents;
  },
});

// Get incidents by teamId - for notifications (supports both old and new incidents)
export const getIncidentsByTeam = query({
  args: {
    teamId: v.string(),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    // Get current user for read status
    const identity = await ctx.auth.getUserIdentity();
    let currentUser: any = null;
    if (identity) {
      currentUser = await ctx.db
        .query("users")
        .withIndex("byEmail", (q) => q.eq("email", identity.email!))
        .first();
    }

    // Get all residents for this team
    const residents = await ctx.db
      .query("residents")
      .withIndex("byTeamId", (q) => q.eq("teamId", args.teamId))
      .collect();

    const residentIds = residents.map(r => r._id);

    // Get all incidents - we'll filter by residents from this team
    let allIncidents = await ctx.db
      .query("incidents")
      .order("desc")
      .collect();

    // Filter incidents that belong to this team's residents OR have teamId set
    const teamIncidents = allIncidents.filter(incident => {
      // New incidents with teamId
      if (incident.teamId === args.teamId) return true;
      // Old incidents - check if residentId belongs to this team
      if (incident.residentId && residentIds.includes(incident.residentId)) return true;
      return false;
    }).slice(0, limit);

    // Fetch resident details and read status for each incident
    const incidentsWithResidents = await Promise.all(
      teamIncidents.map(async (incident) => {
        let resident: any = null;
        let imageUrl: string | null = null;

        if (incident.residentId) {
          resident = await ctx.db.get(incident.residentId);

          // Get the resident's image URL from files table
          if (resident) {
            const residentImage = await ctx.db
              .query("files")
              .filter((q) => q.eq(q.field("type"), "resident"))
              .filter((q) => q.eq(q.field("userId"), resident._id))
              .first();

            if (residentImage?.format === "image") {
              imageUrl = await ctx.storage.getUrl(residentImage.body);
            }
          }
        }

        // Check if current user has read this incident
        let isRead = false;
        if (currentUser) {
          const readStatus = await ctx.db
            .query("notificationReadStatus")
            .withIndex("by_user_and_incident", (q) =>
              q.eq("userId", currentUser._id).eq("incidentId", incident._id)
            )
            .first();
          isRead = !!readStatus;
        }

        return {
          ...incident,
          isRead,
          resident: resident ? {
            _id: resident._id,
            firstName: resident.firstName,
            lastName: resident.lastName,
            roomNumber: resident.roomNumber,
            imageUrl: imageUrl
          } : null
        };
      })
    );

    return incidentsWithResidents;
  },
});

// Get incidents by organizationId - for notifications (all teams/units in care home)
export const getIncidentsByOrganization = query({
  args: {
    organizationId: v.string(),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    // Get current user for read status
    const identity = await ctx.auth.getUserIdentity();
    let currentUser: any = null;
    if (identity) {
      currentUser = await ctx.db
        .query("users")
        .withIndex("byEmail", (q) => q.eq("email", identity.email!))
        .first();
    }

    // Get all residents for this organization
    const residents = await ctx.db
      .query("residents")
      .withIndex("byOrganizationId", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const residentIds = residents.map(r => r._id);

    // Get all incidents - we'll filter by residents from this organization
    let allIncidents = await ctx.db
      .query("incidents")
      .order("desc")
      .collect();

    // Filter incidents that belong to this organization's residents OR have organizationId set
    const orgIncidents = allIncidents.filter(incident => {
      // New incidents with organizationId
      if (incident.organizationId === args.organizationId) return true;
      // Old incidents - check if residentId belongs to this organization
      if (incident.residentId && residentIds.includes(incident.residentId)) return true;
      return false;
    }).slice(0, limit);

    // Fetch resident details and read status for each incident
    const incidentsWithResidents = await Promise.all(
      orgIncidents.map(async (incident) => {
        let resident: any = null;
        let imageUrl: string | null = null;

        if (incident.residentId) {
          resident = await ctx.db.get(incident.residentId);

          // Get the resident's image URL from files table
          if (resident) {
            const residentImage = await ctx.db
              .query("files")
              .filter((q) => q.eq(q.field("type"), "resident"))
              .filter((q) => q.eq(q.field("userId"), resident._id))
              .first();

            if (residentImage?.format === "image") {
              imageUrl = await ctx.storage.getUrl(residentImage.body);
            }
          }
        }

        // Check if current user has read this incident
        let isRead = false;
        if (currentUser) {
          const readStatus = await ctx.db
            .query("notificationReadStatus")
            .withIndex("by_user_and_incident", (q) =>
              q.eq("userId", currentUser._id).eq("incidentId", incident._id)
            )
            .first();
          isRead = !!readStatus;
        }

        return {
          ...incident,
          isRead,
          resident: resident ? {
            _id: resident._id,
            firstName: resident.firstName,
            lastName: resident.lastName,
            roomNumber: resident.roomNumber,
            imageUrl: imageUrl,
            teamName: resident.teamName
          } : null
        };
      })
    );

    return incidentsWithResidents;
  },
});

export const remove = mutation({
  args: {
    incidentId: v.id("incidents"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.runQuery(
      components.betterAuth.lib.getCurrentSession
    );

    if (!session || !session.userId || !session.activeOrganizationId) {
      throw new Error("Unauthorized: No active session or organization");
    }

    const member = await ctx.runQuery(components.betterAuth.lib.findOne, {
      model: "member",
      where: [
        { field: "userId", value: session.userId },
        { field: "organizationId", value: session.activeOrganizationId },
      ],
    });

    if (!member || (member.role !== "owner" && member.role !== "manager" && member.role !== "admin" && member.role !== "nurse")) {
      throw new Error("Unauthorized: Only owners, managers, and nurses can delete incidents");
    }

    // Delete all related NHS reports (BHSCT)
    const bhsctReports = await ctx.db
      .query("bhsctReports")
      .withIndex("by_incident", (q) => q.eq("incidentId", args.incidentId))
      .collect();

    for (const report of bhsctReports) {
      await ctx.db.delete(report._id);
    }

    // Delete all related NHS reports (SEHSCT)
    const sehsctReports = await ctx.db
      .query("sehsctReports")
      .withIndex("by_incident", (q) => q.eq("incidentId", args.incidentId))
      .collect();

    for (const report of sehsctReports) {
      await ctx.db.delete(report._id);
    }

    // Delete all related trust incident reports (legacy)
    const trustReports = await ctx.db
      .query("trustIncidentReports")
      .withIndex("by_incidentId", (q) => q.eq("incidentId", args.incidentId))
      .collect();

    for (const report of trustReports) {
      await ctx.db.delete(report._id);
    }

    // Finally, delete the incident itself
    await ctx.db.delete(args.incidentId);

    return { success: true };
  },
});