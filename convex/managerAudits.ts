import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

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
      v.literal("preAdmissionCareFile")
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
      v.literal("preAdmissionCareFile")
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
      v.literal("preAdmissionCareFile")
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
      v.literal("preAdmissionCareFile")
    ),
    formData: v.any(), // The form data to be submitted
    residentId: v.id("residents"),
    auditedBy: v.string(),
    auditNotes: v.optional(v.string()),
    teamId: v.string(),
    organizationId: v.string()
  },
  returns: v.object({
    formId: v.string(),
    auditId: v.id("managerAudits")
  }),
  handler: async (ctx, args) => {
    // First, submit the new form based on the form type
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
          api.careFiles.infectionPrevention.submitInfectionPreventionAssessment,
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
      case "carePlanAssessment":
        // TODO: Add when carePlanAssessment is implemented
        throw new Error("Care plan assessment submission not implemented yet");
      default:
        throw new Error(`Unsupported form type: ${args.formType}`);
    }

    // Then, automatically create an audit record for the new form
    const auditId = await ctx.db.insert("managerAudits", {
      formType: args.formType,
      formId: newFormId,
      residentId: args.residentId,
      auditedBy: args.auditedBy,
      auditNotes: args.auditNotes || "Form reviewed and updated",
      teamId: args.teamId,
      organizationId: args.organizationId,
      createdAt: Date.now()
    });

    return {
      formId: newFormId,
      auditId: auditId
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
