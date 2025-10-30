import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Create a new BHSCT report
 */
export const create = mutation({
  args: {
    // Links
    incidentId: v.id("incidents"),
    residentId: v.id("residents"),
    organizationId: v.string(),
    teamId: v.string(),

    // Provider and Service User Information
    providerName: v.string(),
    serviceUserName: v.string(),
    serviceUserDOB: v.string(),
    serviceUserGender: v.string(),
    careManager: v.string(),

    // Incident Location
    incidentAddress: v.string(),
    exactLocation: v.string(),

    // Incident Details
    incidentDate: v.string(),
    incidentTime: v.string(),
    incidentDescription: v.string(),

    // Injury and Treatment
    natureOfInjury: v.string(),
    immediateActionTaken: v.string(),

    // Notifications and Witnesses
    personsNotified: v.string(),
    witnesses: v.optional(v.string()),
    staffInvolved: v.optional(v.string()),
    otherServiceUsersInvolved: v.optional(v.string()),

    // Reporter Information
    reporterName: v.string(),
    reporterSignature: v.optional(v.string()),
    reporterDesignation: v.string(),
    dateReported: v.string(),

    // Follow-up Actions
    preventionActions: v.string(),
    riskAssessmentUpdateDate: v.optional(v.string()),
    otherComments: v.optional(v.string()),

    // Senior Staff / Manager Review
    reviewerName: v.optional(v.string()),
    reviewerSignature: v.optional(v.string()),
    reviewerDesignation: v.optional(v.string()),
    reviewDate: v.optional(v.string()),

    // Status
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("completed")
    )),

    // System fields
    reportedBy: v.string(),
    reportedByName: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const reportId = await ctx.db.insert("bhsctReports", {
      ...args,
      status: args.status || "draft",
      createdAt: now,
    });

    return reportId;
  },
});

/**
 * Update an existing BHSCT report
 */
export const update = mutation({
  args: {
    reportId: v.id("bhsctReports"),

    // All fields optional for partial updates
    providerName: v.optional(v.string()),
    serviceUserName: v.optional(v.string()),
    serviceUserDOB: v.optional(v.string()),
    serviceUserGender: v.optional(v.string()),
    careManager: v.optional(v.string()),
    incidentAddress: v.optional(v.string()),
    exactLocation: v.optional(v.string()),
    incidentDate: v.optional(v.string()),
    incidentTime: v.optional(v.string()),
    incidentDescription: v.optional(v.string()),
    natureOfInjury: v.optional(v.string()),
    immediateActionTaken: v.optional(v.string()),
    personsNotified: v.optional(v.string()),
    witnesses: v.optional(v.string()),
    staffInvolved: v.optional(v.string()),
    otherServiceUsersInvolved: v.optional(v.string()),
    reporterName: v.optional(v.string()),
    reporterSignature: v.optional(v.string()),
    reporterDesignation: v.optional(v.string()),
    dateReported: v.optional(v.string()),
    preventionActions: v.optional(v.string()),
    riskAssessmentUpdateDate: v.optional(v.string()),
    otherComments: v.optional(v.string()),
    reviewerName: v.optional(v.string()),
    reviewerSignature: v.optional(v.string()),
    reviewerDesignation: v.optional(v.string()),
    reviewDate: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("completed")
    )),
  },
  handler: async (ctx, args) => {
    const { reportId, ...updates } = args;
    const now = Date.now();

    const existing = await ctx.db.get(reportId);
    if (!existing) {
      throw new Error("Report not found");
    }

    // Add timestamps based on status changes
    const statusUpdates: any = {};
    if (updates.status === "submitted" && existing.status !== "submitted") {
      statusUpdates.submittedAt = now;
    }
    if (updates.status === "completed" && existing.status !== "completed") {
      statusUpdates.completedAt = now;
    }

    await ctx.db.patch(reportId, {
      ...updates,
      ...statusUpdates,
      updatedAt: now,
    });

    return reportId;
  },
});

/**
 * Delete a BHSCT report
 */
export const deleteReport = mutation({
  args: {
    reportId: v.id("bhsctReports"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.reportId);
    if (!existing) {
      throw new Error("Report not found");
    }

    await ctx.db.delete(args.reportId);
    return { success: true };
  },
});

/**
 * Get a single BHSCT report by ID
 */
export const getById = query({
  args: {
    reportId: v.id("bhsctReports"),
  },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) {
      return null;
    }

    // Fetch related incident
    const incident = await ctx.db.get(report.incidentId);

    // Fetch related resident
    const resident = await ctx.db.get(report.residentId);

    return {
      ...report,
      incident,
      resident,
    };
  },
});

/**
 * Get all BHSCT reports for an incident
 */
export const getByIncident = query({
  args: {
    incidentId: v.id("incidents"),
  },
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("bhsctReports")
      .withIndex("by_incident", (q) => q.eq("incidentId", args.incidentId))
      .collect();

    return reports;
  },
});

/**
 * Get all BHSCT reports for a resident
 */
export const getByResident = query({
  args: {
    residentId: v.id("residents"),
  },
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("bhsctReports")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    // Fetch incident details for each report
    const reportsWithIncidents = await Promise.all(
      reports.map(async (report) => {
        const incident = await ctx.db.get(report.incidentId);
        return {
          ...report,
          incident,
        };
      })
    );

    return reportsWithIncidents;
  },
});

/**
 * Get all BHSCT reports for an organization
 */
export const getByOrganization = query({
  args: {
    organizationId: v.string(),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("completed")
    )),
  },
  handler: async (ctx, args) => {
    let reports = await ctx.db
      .query("bhsctReports")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .collect();

    // Filter by status if provided
    if (args.status) {
      reports = reports.filter((r) => r.status === args.status);
    }

    // Fetch incident and resident details
    const reportsWithDetails = await Promise.all(
      reports.map(async (report) => {
        const incident = await ctx.db.get(report.incidentId);
        const resident = await ctx.db.get(report.residentId);
        return {
          ...report,
          incident,
          resident,
        };
      })
    );

    return reportsWithDetails;
  },
});

/**
 * Get all BHSCT reports for a team
 */
export const getByTeam = query({
  args: {
    teamId: v.string(),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("completed")
    )),
  },
  handler: async (ctx, args) => {
    let reports = await ctx.db
      .query("bhsctReports")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .order("desc")
      .collect();

    // Filter by status if provided
    if (args.status) {
      reports = reports.filter((r) => r.status === args.status);
    }

    // Fetch incident and resident details
    const reportsWithDetails = await Promise.all(
      reports.map(async (report) => {
        const incident = await ctx.db.get(report.incidentId);
        const resident = await ctx.db.get(report.residentId);
        return {
          ...report,
          incident,
          resident,
        };
      })
    );

    return reportsWithDetails;
  },
});

/**
 * Get report statistics for an organization
 */
export const getStats = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("bhsctReports")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const stats = {
      total: reports.length,
      draft: reports.filter((r) => r.status === "draft").length,
      submitted: reports.filter((r) => r.status === "submitted").length,
      completed: reports.filter((r) => r.status === "completed").length,
    };

    return stats;
  },
});

/**
 * Check if an incident already has a BHSCT report
 */
export const hasReport = query({
  args: {
    incidentId: v.id("incidents"),
  },
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("bhsctReports")
      .withIndex("by_incident", (q) => q.eq("incidentId", args.incidentId))
      .collect();

    return {
      hasReport: reports.length > 0,
      reportCount: reports.length,
      reports: reports,
    };
  },
});
