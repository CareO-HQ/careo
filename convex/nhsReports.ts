/**
 * NHS Trust Reports
 *
 * Functions for generating NHS Trust incident reports from care home incidents
 * Supports BHSCT (Belfast) and SEHSCT (South Eastern) Health and Social Care Trusts
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Create NHS Report from Incident
 * Maps incident data to NHS Trust report format
 */
export const createFromIncident = mutation({
  args: {
    incidentId: v.id("incidents"),
    trustName: v.union(v.literal("BHSCT"), v.literal("SEHSCT")),
  },
  handler: async (ctx, args) => {
    // Get the incident
    const incident = await ctx.db.get(args.incidentId);
    if (!incident) {
      throw new Error("Incident not found");
    }

    // Validate required fields
    if (!incident.residentId) {
      throw new Error("Incident missing resident ID");
    }
    if (!incident.organizationId) {
      throw new Error("Incident missing organization ID");
    }
    if (!incident.teamId) {
      throw new Error("Incident missing team ID");
    }

    // Get the resident
    const resident = await ctx.db.get(incident.residentId);
    if (!resident) {
      throw new Error("Resident not found");
    }

    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Trust full names
    const trustFullNames = {
      BHSCT: "Belfast Health and Social Care Trust",
      SEHSCT: "South Eastern Health and Social Care Trust",
    };

    // Map incident data to NHS report format
    const reportData = {
      // Patient Demographics (auto-populated)
      patientFirstName: incident.injuredPersonFirstName,
      patientSurname: incident.injuredPersonSurname,
      patientDOB: incident.injuredPersonDOB,
      nhsNumber: incident.healthCareNumber,
      patientAddress: resident.gpAddress,
      patientPostcode: undefined, // Not available in resident schema

      // Incident Details (auto-populated)
      incidentDate: incident.date,
      incidentTime: incident.time,
      locationWard: incident.unit,
      locationSite: incident.homeName,

      // Incident Classification (auto-populated)
      incidentType: incident.incidentTypes?.join(", ") || undefined,
      incidentCategory: incident.typeOtherDetails,
      severityLevel: incident.incidentLevel,
      harmLevel: mapHarmLevel(incident.incidentLevel),

      // Description (auto-populated)
      incidentDescription: incident.detailedDescription,
      injuryDetails: incident.injuryDescription,
      bodyPartAffected: incident.bodyPartInjured,
      treatmentGiven: incident.treatmentDetails,
      immediateActions: [
        incident.furtherActionsAdvised,
        incident.nurseActions?.join(", "),
      ]
        .filter(Boolean)
        .join(" | ") || undefined,

      // Staff/Reporter Information (auto-populated)
      reporterName: incident.completedByFullName,
      reporterJobTitle: incident.completedByJobTitle,
      reporterEmail: undefined, // Not in incident form
      reporterPhone: undefined, // Not in incident form

      // Witnesses (auto-populated)
      witness1Name: incident.witness1Name,
      witness1Contact: incident.witness1Contact,
      witness2Name: incident.witness2Name,
      witness2Contact: incident.witness2Contact,

      // Notifications (auto-populated)
      managerInformed: incident.homeManagerInformedBy,
      managerInformedDateTime: incident.homeManagerInformedDateTime,
      nextOfKinInformed: incident.nokInformedWho,
      nextOfKinInformedDateTime: incident.nokInformedDateTime,

      // NHS-Specific Fields (user will fill)
      cqcNotificationRequired: shouldRequireCQCNotification(incident.incidentLevel),
      cqcNotificationReason: incident.incidentLevel === "death"
        ? "Death of service user"
        : incident.incidentLevel === "permanent_harm"
        ? "Serious injury to service user"
        : undefined,
      policeInformed: undefined,
      policeReferenceNumber: undefined,
      safeguardingConcern: undefined,
      safeguardingReferenceNumber: undefined,
      gpName: undefined,
      gpPractice: undefined,
      additionalNotes: undefined,
    };

    // Create NHS report
    const reportId = await ctx.db.insert("nhsReports", {
      incidentId: args.incidentId,
      residentId: incident.residentId,
      organizationId: incident.organizationId,
      teamId: incident.teamId,
      trustName: args.trustName,
      trustFullName: trustFullNames[args.trustName],
      reportData,
      status: "draft",
      createdBy: identity.subject,
      createdAt: Date.now(),
    });

    return reportId;
  },
});

/**
 * Get NHS Report by ID
 */
export const getById = query({
  args: { id: v.id("nhsReports") },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.id);
    return report;
  },
});

/**
 * Get NHS Reports for an Incident
 */
export const getByIncident = query({
  args: { incidentId: v.id("incidents") },
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("nhsReports")
      .withIndex("by_incident", (q) => q.eq("incidentId", args.incidentId))
      .collect();

    return reports;
  },
});

/**
 * Update NHS Report
 */
export const update = mutation({
  args: {
    id: v.id("nhsReports"),
    reportData: v.object({
      // All fields optional for partial updates
      patientFirstName: v.optional(v.string()),
      patientSurname: v.optional(v.string()),
      patientDOB: v.optional(v.string()),
      nhsNumber: v.optional(v.string()),
      patientAddress: v.optional(v.string()),
      patientPostcode: v.optional(v.string()),
      incidentDate: v.optional(v.string()),
      incidentTime: v.optional(v.string()),
      locationWard: v.optional(v.string()),
      locationSite: v.optional(v.string()),
      incidentType: v.optional(v.string()),
      incidentCategory: v.optional(v.string()),
      severityLevel: v.optional(v.string()),
      harmLevel: v.optional(v.string()),
      incidentDescription: v.optional(v.string()),
      injuryDetails: v.optional(v.string()),
      bodyPartAffected: v.optional(v.string()),
      treatmentGiven: v.optional(v.string()),
      immediateActions: v.optional(v.string()),
      reporterName: v.optional(v.string()),
      reporterJobTitle: v.optional(v.string()),
      reporterEmail: v.optional(v.string()),
      reporterPhone: v.optional(v.string()),
      witness1Name: v.optional(v.string()),
      witness1Contact: v.optional(v.string()),
      witness2Name: v.optional(v.string()),
      witness2Contact: v.optional(v.string()),
      managerInformed: v.optional(v.string()),
      managerInformedDateTime: v.optional(v.string()),
      nextOfKinInformed: v.optional(v.string()),
      nextOfKinInformedDateTime: v.optional(v.string()),
      cqcNotificationRequired: v.optional(v.boolean()),
      cqcNotificationReason: v.optional(v.string()),
      policeInformed: v.optional(v.boolean()),
      policeReferenceNumber: v.optional(v.string()),
      safeguardingConcern: v.optional(v.boolean()),
      safeguardingReferenceNumber: v.optional(v.string()),
      gpName: v.optional(v.string()),
      gpPractice: v.optional(v.string()),
      additionalNotes: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.id);
    if (!report) {
      throw new Error("Report not found");
    }

    // Merge with existing data
    const updatedReportData = {
      ...report.reportData,
      ...args.reportData,
    };

    await ctx.db.patch(args.id, {
      reportData: updatedReportData,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Mark NHS Report as Completed
 */
export const markAsCompleted = mutation({
  args: { id: v.id("nhsReports") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "completed",
      updatedAt: Date.now(),
    });
    return args.id;
  },
});

/**
 * Mark NHS Report as Submitted
 */
export const markAsSubmitted = mutation({
  args: {
    id: v.id("nhsReports"),
    nhsReferenceNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    await ctx.db.patch(args.id, {
      status: "submitted",
      submittedAt: Date.now(),
      submittedBy: identity.subject,
      nhsReferenceNumber: args.nhsReferenceNumber,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Delete NHS Report
 */
export const deleteReport = mutation({
  args: { id: v.id("nhsReports") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Helper Functions

/**
 * Map incident level to NHS harm level
 */
function mapHarmLevel(incidentLevel: string): string {
  const mapping: Record<string, string> = {
    death: "Death",
    permanent_harm: "Severe Harm",
    minor_injury: "Moderate Harm",
    no_harm: "Low/No Harm",
    near_miss: "Near Miss",
  };
  return mapping[incidentLevel] || "Unknown";
}

/**
 * Determine if CQC notification is required
 */
function shouldRequireCQCNotification(incidentLevel: string): boolean {
  // CQC notification required for death and serious injury
  return incidentLevel === "death" || incidentLevel === "permanent_harm";
}
