import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Create a new SEHSCT report
 */
export const create = mutation({
  args: {
    // Links
    incidentId: v.id("incidents"),
    residentId: v.id("residents"),
    organizationId: v.string(),
    teamId: v.string(),

    // Administrative
    datixRef: v.optional(v.string()),

    // Section 1 & 2 - Where and When
    incidentDate: v.string(),
    incidentTime: v.string(),
    primaryLocation: v.string(),
    exactLocation: v.optional(v.string()),

    // Circumstances
    incidentDescription: v.string(),
    contributoryFactors: v.optional(v.string()),
    propertyEquipmentMedication: v.optional(v.string()),
    causedByBehaviorsOfConcern: v.boolean(),
    documentedInCarePlan: v.boolean(),
    apparentCauseOfInjury: v.optional(v.string()),

    // Actions
    remedialActionTaken: v.optional(v.string()),
    actionsTakenToPreventRecurrence: v.optional(v.string()),
    riskAssessmentUpdateDate: v.optional(v.string()),

    // Equipment or Property
    equipmentInvolved: v.boolean(),
    equipmentDetails: v.optional(v.string()),
    reportedToNIAC: v.boolean(),
    propertyInvolved: v.boolean(),
    propertyDetails: v.optional(v.string()),

    // Persons notified
    personsNotified: v.optional(v.string()),

    // Individual involved (F)
    hcNumber: v.optional(v.string()),
    gender: v.string(),
    dateOfBirth: v.string(),
    serviceUserFullName: v.string(),
    serviceUserAddress: v.optional(v.string()),
    trustKeyWorkerName: v.optional(v.string()),
    trustKeyWorkerDesignation: v.optional(v.string()),

    // Injury details (G)
    personSufferedInjury: v.boolean(),
    partOfBodyAffected: v.optional(v.string()),
    natureOfInjury: v.optional(v.string()),

    // Attention received (H)
    attentionReceived: v.array(v.string()),
    attentionReceivedOther: v.optional(v.string()),

    // Section 3 - Staff/Service Users
    staffMembersInvolved: v.optional(v.string()),
    otherServiceUsersInvolved: v.optional(v.string()),
    witnessDetails: v.optional(v.string()),

    // Section 4 - Provider Information
    providerName: v.string(),
    providerAddress: v.optional(v.string()),
    groupName: v.optional(v.string()),
    serviceName: v.optional(v.string()),
    typeOfService: v.optional(v.string()),

    // Section 5 - Medication
    medicationNames: v.optional(v.string()),
    pharmacyDetails: v.optional(v.string()),

    // Section 6 - Identification
    identifiedBy: v.string(),
    identifierName: v.optional(v.string()),
    identifierJobTitle: v.optional(v.string()),
    identifierTelephone: v.optional(v.string()),
    identifierEmail: v.optional(v.string()),
    trustStaffName: v.optional(v.string()),
    trustStaffJobTitle: v.optional(v.string()),
    trustStaffTelephone: v.optional(v.string()),
    trustStaffEmail: v.optional(v.string()),
    returnEmail: v.optional(v.string()),

    // Section 7 - Trust Key Worker Completion
    outcomeComments: v.optional(v.string()),
    reviewOutcome: v.optional(v.string()),
    furtherActionByProvider: v.optional(v.string()),
    furtherActionByProviderDate: v.optional(v.string()),
    furtherActionByProviderActionBy: v.optional(v.string()),
    furtherActionByTrust: v.optional(v.string()),
    furtherActionByTrustDate: v.optional(v.string()),
    furtherActionByTrustActionBy: v.optional(v.string()),
    lessonsLearned: v.optional(v.string()),
    finalReviewAndOutcome: v.optional(v.string()),

    // Review Questions
    allIssuesSatisfactorilyDealt: v.boolean(),
    clientFamilySatisfied: v.boolean(),
    allRecommendationsImplemented: v.optional(v.string()),
    caseReadyForClosure: v.boolean(),
    caseNotReadyReason: v.optional(v.string()),

    // Signatures
    keyWorkerNameDesignation: v.optional(v.string()),
    dateClosed: v.optional(v.string()),
    lineManagerNameDesignation: v.optional(v.string()),
    dateApproved: v.optional(v.string()),

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
    // Check if a report already exists for this incident
    const existingReport = await ctx.db
      .query("sehsctReports")
      .withIndex("by_incident", (q) => q.eq("incidentId", args.incidentId))
      .first();

    if (existingReport) {
      throw new Error("A SEHSCT report already exists for this incident. Each incident can have a maximum of one SEHSCT report.");
    }

    const now = Date.now();

    const reportId = await ctx.db.insert("sehsctReports", {
      ...args,
      status: args.status || "draft",
      createdAt: now,
    });

    return reportId;
  },
});

/**
 * Get all SEHSCT reports for a specific resident
 */
export const getByResident = query({
  args: {
    residentId: v.id("residents"),
  },
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("sehsctReports")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    return reports;
  },
});

/**
 * Get all SEHSCT reports for a specific incident
 */
export const getByIncident = query({
  args: {
    incidentId: v.id("incidents"),
  },
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("sehsctReports")
      .withIndex("by_incident", (q) => q.eq("incidentId", args.incidentId))
      .order("desc")
      .collect();

    return reports;
  },
});

/**
 * Get a single SEHSCT report by ID
 */
export const getById = query({
  args: {
    reportId: v.id("sehsctReports"),
  },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    return report;
  },
});

/**
 * Update an existing SEHSCT report
 */
export const update = mutation({
  args: {
    reportId: v.id("sehsctReports"),

    // All fields optional for partial updates
    datixRef: v.optional(v.string()),
    incidentDate: v.optional(v.string()),
    incidentTime: v.optional(v.string()),
    primaryLocation: v.optional(v.string()),
    exactLocation: v.optional(v.string()),
    incidentDescription: v.optional(v.string()),
    contributoryFactors: v.optional(v.string()),
    propertyEquipmentMedication: v.optional(v.string()),
    causedByBehaviorsOfConcern: v.optional(v.boolean()),
    documentedInCarePlan: v.optional(v.boolean()),
    apparentCauseOfInjury: v.optional(v.string()),
    remedialActionTaken: v.optional(v.string()),
    actionsTakenToPreventRecurrence: v.optional(v.string()),
    riskAssessmentUpdateDate: v.optional(v.string()),
    equipmentInvolved: v.optional(v.boolean()),
    equipmentDetails: v.optional(v.string()),
    reportedToNIAC: v.optional(v.boolean()),
    propertyInvolved: v.optional(v.boolean()),
    propertyDetails: v.optional(v.string()),
    personsNotified: v.optional(v.string()),
    hcNumber: v.optional(v.string()),
    gender: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    serviceUserFullName: v.optional(v.string()),
    serviceUserAddress: v.optional(v.string()),
    trustKeyWorkerName: v.optional(v.string()),
    trustKeyWorkerDesignation: v.optional(v.string()),
    personSufferedInjury: v.optional(v.boolean()),
    partOfBodyAffected: v.optional(v.string()),
    natureOfInjury: v.optional(v.string()),
    attentionReceived: v.optional(v.array(v.string())),
    attentionReceivedOther: v.optional(v.string()),
    staffMembersInvolved: v.optional(v.string()),
    otherServiceUsersInvolved: v.optional(v.string()),
    witnessDetails: v.optional(v.string()),
    providerName: v.optional(v.string()),
    providerAddress: v.optional(v.string()),
    groupName: v.optional(v.string()),
    serviceName: v.optional(v.string()),
    typeOfService: v.optional(v.string()),
    medicationNames: v.optional(v.string()),
    pharmacyDetails: v.optional(v.string()),
    identifiedBy: v.optional(v.string()),
    identifierName: v.optional(v.string()),
    identifierJobTitle: v.optional(v.string()),
    identifierTelephone: v.optional(v.string()),
    identifierEmail: v.optional(v.string()),
    trustStaffName: v.optional(v.string()),
    trustStaffJobTitle: v.optional(v.string()),
    trustStaffTelephone: v.optional(v.string()),
    trustStaffEmail: v.optional(v.string()),
    returnEmail: v.optional(v.string()),
    outcomeComments: v.optional(v.string()),
    reviewOutcome: v.optional(v.string()),
    furtherActionByProvider: v.optional(v.string()),
    furtherActionByProviderDate: v.optional(v.string()),
    furtherActionByProviderActionBy: v.optional(v.string()),
    furtherActionByTrust: v.optional(v.string()),
    furtherActionByTrustDate: v.optional(v.string()),
    furtherActionByTrustActionBy: v.optional(v.string()),
    lessonsLearned: v.optional(v.string()),
    finalReviewAndOutcome: v.optional(v.string()),
    allIssuesSatisfactorilyDealt: v.optional(v.boolean()),
    clientFamilySatisfied: v.optional(v.boolean()),
    allRecommendationsImplemented: v.optional(v.string()),
    caseReadyForClosure: v.optional(v.boolean()),
    caseNotReadyReason: v.optional(v.string()),
    keyWorkerNameDesignation: v.optional(v.string()),
    dateClosed: v.optional(v.string()),
    lineManagerNameDesignation: v.optional(v.string()),
    dateApproved: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("completed")
    )),
  },
  handler: async (ctx, args) => {
    const { reportId, ...updates } = args;
    const now = Date.now();

    await ctx.db.patch(reportId, {
      ...updates,
      updatedAt: now,
    });

    return reportId;
  },
});

/**
 * Delete a SEHSCT report
 */
export const remove = mutation({
  args: {
    reportId: v.id("sehsctReports"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.reportId);
    return { success: true };
  },
});
