import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

/**
 * Utility function to check if form data has meaningful changes
 * Compares two form objects and returns true if there are differences
 * Only considers user-visible form fields, ignoring metadata and system fields
 */
function hasFormDataChanged(originalData: any, newData: any): boolean {
  if (!originalData || !newData) {
    return true; // If either is missing, consider it a change
  }

  // Comprehensive list of metadata/system fields to ignore in comparison
  const fieldsToIgnore = [
    // System generated fields
    "_id",
    "_creationTime",
    "createdAt",
    "updatedAt",
    "createdBy",
    "userId",
    "teamId",
    "organizationId",
    "residentId",

    // PDF and file related fields
    "pdfFileId",
    "pdfGenerated",
    "pdfGeneratedAt",
    "pdfUrl",

    // Audit and workflow fields
    "savedAsDraft",
    "isCompleted",
    "submittedAt",
    "reviewedAt",
    "reviewedBy",
    "auditNotes",

    // Dynamic timestamp fields that change on every submission
    "consentAcceptedAt",
    "date", // Current date field that auto-updates
    "completionDate", // Often auto-set to current date

    // User identification fields (not form content)
    "userName",
    "completedBy",
    "signature", // Often just the user's name
    "jobRole", // User's role, not form content

    // Internal system fields
    "version",
    "formVersion",
    "migrationVersion"
  ];

  // Create deep copies to avoid mutating original objects
  const originalFiltered = JSON.parse(JSON.stringify(originalData));
  const newFiltered = JSON.parse(JSON.stringify(newData));

  // Remove all ignored fields
  fieldsToIgnore.forEach((field) => {
    delete originalFiltered[field];
    delete newFiltered[field];
  });

  // Deep comparison of the filtered objects
  return JSON.stringify(originalFiltered) !== JSON.stringify(newFiltered);
}

/**
 * Create a new manager audit record for a completed form
 */
export const createAudit = mutation({
  args: {
    formType: v.union(
      v.literal("movingHandlingAssessment"),
      v.literal("infectionPreventionAssessment"),
      v.literal("carePlanAssessment"),
      v.literal("bladderBowelAssessment"),
      v.literal("preAdmissionCareFile"),
      v.literal("longTermFallsRiskAssessment")
    ),
    formId: v.string(),
    residentId: v.id("residents"),
    auditedBy: v.string(),
    auditNotes: v.optional(v.string()),
    teamId: v.string(),
    organizationId: v.string()
  },
  returns: v.id("managerAudits"),
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("managerAudits", {
      formType: args.formType,
      formId: args.formId,
      residentId: args.residentId,
      auditedBy: args.auditedBy,
      auditNotes: args.auditNotes,
      teamId: args.teamId,
      organizationId: args.organizationId,
      createdAt: now
    });
  }
});

/**
 * Update an existing audit record
 */
export const updateAudit = mutation({
  args: {
    auditId: v.id("managerAudits"),
    auditNotes: v.optional(v.string())
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { auditId, ...updates } = args;

    await ctx.db.patch(auditId, {
      ...updates,
      updatedAt: Date.now()
    });

    return null;
  }
});

/**
 * Get audits for a specific form
 */
export const getAuditsByForm = query({
  args: {
    formType: v.union(
      v.literal("movingHandlingAssessment"),
      v.literal("infectionPreventionAssessment"),
      v.literal("carePlanAssessment"),
      v.literal("bladderBowelAssessment"),
      v.literal("preAdmissionCareFile"),
      v.literal("longTermFallsRiskAssessment")
    ),
    formId: v.string()
  },
  returns: v.array(
    v.object({
      _id: v.id("managerAudits"),
      _creationTime: v.number(),
      formType: v.string(),
      formId: v.string(),
      residentId: v.id("residents"),
      auditedBy: v.string(),
      auditNotes: v.optional(v.string()),
      teamId: v.string(),
      organizationId: v.string(),
      createdAt: v.number(),
      updatedAt: v.optional(v.number())
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("managerAudits")
      .withIndex("by_form", (q) =>
        q.eq("formType", args.formType).eq("formId", args.formId)
      )
      .order("desc")
      .collect();
  }
});

/**
 * Get audits for a specific resident
 */
export const getAuditsByResident = query({
  args: {
    residentId: v.id("residents"),
    organizationId: v.string()
  },
  returns: v.array(
    v.object({
      _id: v.id("managerAudits"),
      _creationTime: v.number(),
      formType: v.string(),
      formId: v.string(),
      residentId: v.id("residents"),
      auditedBy: v.string(),
      auditNotes: v.optional(v.string()),
      teamId: v.string(),
      organizationId: v.string(),
      createdAt: v.number(),
      updatedAt: v.optional(v.number())
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("managerAudits")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .order("desc")
      .collect();
  }
});

/**
 * Get audits by team
 */
export const getAuditsByTeam = query({
  args: {
    teamId: v.string(),
    organizationId: v.string()
  },
  returns: v.array(
    v.object({
      _id: v.id("managerAudits"),
      _creationTime: v.number(),
      formType: v.string(),
      formId: v.string(),
      residentId: v.id("residents"),
      auditedBy: v.string(),
      auditNotes: v.optional(v.string()),
      teamId: v.string(),
      organizationId: v.string(),
      createdAt: v.number(),
      updatedAt: v.optional(v.number())
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("managerAudits")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .order("desc")
      .collect();
  }
});

/**
 * Get audits by auditor
 */
export const getAuditsByAuditor = query({
  args: {
    auditedBy: v.string(),
    organizationId: v.string()
  },
  returns: v.array(
    v.object({
      _id: v.id("managerAudits"),
      _creationTime: v.number(),
      formType: v.string(),
      formId: v.string(),
      residentId: v.id("residents"),
      auditedBy: v.string(),
      auditNotes: v.optional(v.string()),
      teamId: v.string(),
      organizationId: v.string(),
      createdAt: v.number(),
      updatedAt: v.optional(v.number())
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("managerAudits")
      .withIndex("by_audited_by", (q) => q.eq("auditedBy", args.auditedBy))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .order("desc")
      .collect();
  }
});

/**
 * Get forms that are completed but haven't been audited yet for a specific resident
 */
export const getUnauditedForms = query({
  args: {
    residentId: v.id("residents"),
    organizationId: v.string(),
    formKeys: v.optional(v.array(v.string())) // Optional filter for specific form keys
  },
  returns: v.array(
    v.object({
      formType: v.string(),
      formId: v.string(),
      lastUpdated: v.number()
    })
  ),
  handler: async (ctx, args) => {
    // Map of form keys to form types and table names
    const formTypeMapping: Record<string, { formType: string; table: string }> =
      {
        "preAdmission-form": {
          formType: "preAdmissionCareFile",
          table: "preAdmissionCareFiles"
        },
        "infection-prevention": {
          formType: "infectionPreventionAssessment",
          table: "infectionPreventionAssessments"
        },
        "blader-bowel-form": {
          formType: "bladderBowelAssessment",
          table: "bladderBowelAssessments"
        },
        "moving-handling-form": {
          formType: "movingHandlingAssessment",
          table: "movingHandlingAssessments"
        },
        "long-term-fall-risk-form": {
          formType: "longTermFallsRiskAssessment",
          table: "longTermFallsRiskAssessments"
        },
        "care-plan-form": {
          formType: "carePlanAssessment",
          table: "carePlanAssessments"
        }
      };

    const unauditedForms = [];

    // Check which form keys to process (all if not specified)
    const keysToCheck = args.formKeys || Object.keys(formTypeMapping);

    for (const formKey of keysToCheck) {
      const mapping = formTypeMapping[formKey];
      if (!mapping) continue;

      // Get completed forms for this resident
      let completedForms: any[] = [];

      try {
        switch (mapping.table) {
          case "preAdmissionCareFiles":
            const allPreAdmissionForms = await ctx.db
              .query("preAdmissionCareFiles")
              .withIndex("by_resident", (q) =>
                q.eq("residentId", args.residentId)
              )
              .filter((q) =>
                q.eq(q.field("organizationId"), args.organizationId)
              )
              .filter((q) => q.eq(q.field("savedAsDraft"), false))
              .order("desc")
              .collect();
            // Get only the latest submission
            completedForms =
              allPreAdmissionForms.length > 0 ? [allPreAdmissionForms[0]] : [];
            break;
          case "infectionPreventionAssessments":
            const allInfectionForms = await ctx.db
              .query("infectionPreventionAssessments")
              .withIndex("by_resident", (q) =>
                q.eq("residentId", args.residentId)
              )
              .filter((q) =>
                q.eq(q.field("organizationId"), args.organizationId)
              )
              .filter((q) => q.neq(q.field("savedAsDraft"), true))
              .order("desc")
              .collect();
            // Get only the latest submission
            completedForms =
              allInfectionForms.length > 0 ? [allInfectionForms[0]] : [];
            break;
          case "bladderBowelAssessments":
            const allBladderBowelForms = await ctx.db
              .query("bladderBowelAssessments")
              .withIndex("by_resident", (q) =>
                q.eq("residentId", args.residentId)
              )
              .filter((q) =>
                q.eq(q.field("organizationId"), args.organizationId)
              )
              .filter((q) => q.neq(q.field("savedAsDraft"), true))
              .order("desc")
              .collect();
            // Get only the latest submission
            completedForms =
              allBladderBowelForms.length > 0 ? [allBladderBowelForms[0]] : [];
            break;
          case "movingHandlingAssessments":
            const allMovingHandlingForms = await ctx.db
              .query("movingHandlingAssessments")
              .withIndex("by_resident", (q) =>
                q.eq("residentId", args.residentId)
              )
              .filter((q) =>
                q.eq(q.field("organizationId"), args.organizationId)
              )
              .filter((q) => q.neq(q.field("savedAsDraft"), true))
              .order("desc")
              .collect();
            // Get only the latest submission
            completedForms =
              allMovingHandlingForms.length > 0
                ? [allMovingHandlingForms[0]]
                : [];
            break;
          case "longTermFallsRiskAssessments":
            const allLongTermFallsForms = await ctx.db
              .query("longTermFallsRiskAssessments")
              .withIndex("by_resident", (q) =>
                q.eq("residentId", args.residentId)
              )
              .filter((q) =>
                q.eq(q.field("organizationId"), args.organizationId)
              )
              .filter((q) => q.neq(q.field("savedAsDraft"), true))
              .order("desc")
              .collect();
            // Get only the latest submission
            completedForms =
              allLongTermFallsForms.length > 0
                ? [allLongTermFallsForms[0]]
                : [];
            break;
          case "carePlanAssessments":
            const allCarePlanForms = await ctx.db
              .query("carePlanAssessments")
              .withIndex("by_residentId", (q) =>
                q.eq("residentId", args.residentId)
              )
              .filter((q) => q.neq(q.field("status"), "draft"))
              .order("desc")
              .collect();
            // Get only the latest submission
            completedForms =
              allCarePlanForms.length > 0 ? [allCarePlanForms[0]] : [];
            break;
        }
      } catch (error) {
        // If table doesn't exist or other error, skip this form type
        continue;
      }

      // For each completed form, check if it has been audited
      for (const form of completedForms) {
        const existingAudit = await ctx.db
          .query("managerAudits")
          .withIndex("by_form", (q) =>
            q.eq("formType", mapping.formType as any).eq("formId", form._id)
          )
          .first();

        if (!existingAudit) {
          unauditedForms.push({
            formType: mapping.formType,
            formId: form._id,
            lastUpdated: form.updatedAt || form.createdAt || form._creationTime
          });
        }
      }
    }

    return unauditedForms.sort((a, b) => b.lastUpdated - a.lastUpdated);
  }
});

/**
 * Check if specific forms have been audited for a resident
 */
export const getFormAuditStatus = query({
  args: {
    residentId: v.id("residents"),
    organizationId: v.string(),
    formIds: v.array(v.string())
  },
  returns: v.record(
    v.string(),
    v.object({
      isAudited: v.boolean(),
      auditedAt: v.optional(v.number()),
      auditedBy: v.optional(v.string()),
      auditNotes: v.optional(v.string())
    })
  ),
  handler: async (ctx, args) => {
    const auditStatus: Record<string, any> = {};

    // Initialize all forms as not audited
    for (const formId of args.formIds) {
      auditStatus[formId] = {
        isAudited: false,
        auditedAt: undefined,
        auditedBy: undefined,
        auditNotes: undefined
      };
    }

    // Get all audits for this resident
    const audits = await ctx.db
      .query("managerAudits")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .collect();

    // Update status for audited forms
    for (const audit of audits) {
      if (args.formIds.includes(audit.formId)) {
        auditStatus[audit.formId] = {
          isAudited: true,
          auditedAt: audit.createdAt,
          auditedBy: audit.auditedBy,
          auditNotes: audit.auditNotes
        };
      }
    }

    return auditStatus;
  }
});

/**
 * Get form data for review based on form type and ID
 */
export const getFormDataForReview = query({
  args: {
    formType: v.union(
      v.literal("movingHandlingAssessment"),
      v.literal("infectionPreventionAssessment"),
      v.literal("carePlanAssessment"),
      v.literal("bladderBowelAssessment"),
      v.literal("preAdmissionCareFile"),
      v.literal("longTermFallsRiskAssessment")
    ),
    formId: v.string()
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    try {
      switch (args.formType) {
        case "movingHandlingAssessment":
          return await ctx.db.get(args.formId as any);
        case "infectionPreventionAssessment":
          return await ctx.db.get(args.formId as any);
        case "bladderBowelAssessment":
          return await ctx.db.get(args.formId as any);
        case "preAdmissionCareFile":
          return await ctx.db.get(args.formId as any);
        case "carePlanAssessment":
          return await ctx.db.get(args.formId as any);
        case "longTermFallsRiskAssessment":
          return await ctx.db.get(args.formId as any);
        default:
          return null;
      }
    } catch (error) {
      console.error("Error fetching form data:", error);
      return null;
    }
  }
});

/**
 * Submit a form revision from review mode and automatically create audit record
 */
export const submitReviewedForm = mutation({
  args: {
    formType: v.union(
      v.literal("movingHandlingAssessment"),
      v.literal("infectionPreventionAssessment"),
      v.literal("carePlanAssessment"),
      v.literal("bladderBowelAssessment"),
      v.literal("preAdmissionCareFile"),
      v.literal("longTermFallsRiskAssessment")
    ),
    formData: v.any(), // The form data to be submitted
    originalFormData: v.any(), // The original form data for comparison
    originalFormId: v.string(), // The ID of the original form being audited
    residentId: v.id("residents"),
    auditedBy: v.string(),
    auditNotes: v.optional(v.string()),
    teamId: v.string(),
    organizationId: v.string()
  },
  returns: v.object({
    formId: v.string(),
    auditId: v.id("managerAudits"),
    hasChanges: v.boolean()
  }),
  handler: async (ctx, args) => {
    // Check if the form data has actually changed
    const hasChanges = hasFormDataChanged(args.originalFormData, args.formData);

    let formIdToAudit: string;

    if (hasChanges) {
      // If there are changes, submit the new form based on the form type
      let newFormId: string;

      switch (args.formType) {
        case "movingHandlingAssessment":
          newFormId = await ctx.runMutation(
            api.careFiles.movingHandling.submitMovingHandlingAssessment,
            args.formData
          );
          break;
        case "infectionPreventionAssessment":
          newFormId = await ctx.runMutation(
            api.careFiles.infectionPrevention
              .submitInfectionPreventionAssessment,
            args.formData
          );
          break;
        case "bladderBowelAssessment":
          newFormId = await ctx.runMutation(
            api.careFiles.bladderBowel.submitBladderBowelAssessment,
            args.formData
          );
          break;
        case "preAdmissionCareFile":
          newFormId = await ctx.runMutation(
            api.careFiles.preadmission.submitPreAdmissionForm,
            args.formData
          );
          break;
        case "longTermFallsRiskAssessment":
          newFormId = await ctx.runMutation(
            api.careFiles.longTermFalls.submitLongTermFallsAssessment,
            args.formData
          );
          break;
        case "carePlanAssessment":
          newFormId = await ctx.runMutation(
            api.careFiles.carePlan.submitCarePlanAssessment,
            args.formData
          );
          break;
        default:
          throw new Error(`Unsupported form type: ${args.formType}`);
      }
      formIdToAudit = newFormId;
    } else {
      // If no changes, audit the original form
      formIdToAudit = args.originalFormId;
    }

    // Create an audit record for the appropriate form
    const auditId = await ctx.db.insert("managerAudits", {
      formType: args.formType,
      formId: formIdToAudit,
      residentId: args.residentId,
      auditedBy: args.auditedBy,
      auditNotes:
        args.auditNotes ||
        (hasChanges
          ? "Form reviewed and updated with changes to user-visible content"
          : "Form reviewed and approved - no changes to form content"),
      teamId: args.teamId,
      organizationId: args.organizationId,
      createdAt: Date.now()
    });

    return {
      formId: formIdToAudit,
      auditId: auditId,
      hasChanges: hasChanges
    };
  }
});

/**
 * Get basic audit statistics for an organization or team
 */
export const getAuditStatistics = query({
  args: {
    organizationId: v.string(),
    teamId: v.optional(v.string()),
    fromDate: v.optional(v.number()),
    toDate: v.optional(v.number())
  },
  returns: v.object({
    totalAudits: v.number(),
    auditsByFormType: v.record(v.string(), v.number())
  }),
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("managerAudits")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      );

    if (args.teamId) {
      query = query.filter((q) => q.eq(q.field("teamId"), args.teamId));
    }

    if (args.fromDate !== undefined) {
      query = query.filter((q) => q.gte(q.field("createdAt"), args.fromDate!));
    }

    if (args.toDate !== undefined) {
      query = query.filter((q) => q.lte(q.field("createdAt"), args.toDate!));
    }

    const audits = await query.collect();

    const stats = {
      totalAudits: audits.length,
      auditsByFormType: {} as Record<string, number>
    };

    for (const audit of audits) {
      // Count by form type
      if (!stats.auditsByFormType[audit.formType]) {
        stats.auditsByFormType[audit.formType] = 0;
      }
      stats.auditsByFormType[audit.formType]++;
    }

    return stats;
  }
});
